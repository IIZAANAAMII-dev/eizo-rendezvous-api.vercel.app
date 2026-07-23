import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';

interface StateEntry {
  shop: string;
  expires: number;
}

const stateStore = new Map<string, StateEntry>();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  return createClient(supabaseUrl, supabaseKey);
}

function isDev() {
  return process.env.NODE_ENV === 'development';
}

function devLog(...args: any[]) {
  if (isDev()) {
    console.log(...args);
  }
}

// ============================================================================
// LEGACY OAUTH FLOW (kept for compatibility)
// ============================================================================

export function generateOAuthState(shop: string): string {
  const state = randomBytes(32).toString('hex');
  stateStore.set(state, { shop, expires: Date.now() + STATE_TTL_MS });
  return state;
}

export function validateOAuthState(state: string, shop: string): boolean {
  const entry = stateStore.get(state);
  if (!entry) return false;
  if (entry.shop !== shop) return false;
  if (entry.expires < Date.now()) return false;
  stateStore.delete(state);
  return true;
}

export async function setShopifyAccessToken(shop: string, token: string): Promise<void> {
  devLog('[oauth] setShopifyAccessToken called for shop:', shop);
  devLog('[oauth] token length:', token.length);
  try {
    const supabase = getSupabaseClient();
    devLog('[oauth] Supabase client created');
    devLog('[oauth] Attempting upsert to shopify_connections table');
    const { error } = await supabase
      .from('shopify_connections')
      .upsert(
        { shop_domain: shop, access_token: token },
        { onConflict: 'shop_domain' }
      );
    if (error) {
      console.error('[oauth] Failed to store token in Supabase:', error);
      console.error('[oauth] Error details:', JSON.stringify(error, null, 2));
      throw new Error('Failed to store access token in Supabase');
    }
    devLog(`[oauth] Token stored in Supabase for ${shop}`);
  } catch (error) {
    console.error('[oauth] Failed to store token in Supabase:', error);
    throw error;
  }
}

export async function getShopifyAccessToken(shop?: string): Promise<string> {
  const domain = shop || process.env.SHOPIFY_STORE_DOMAIN;
  if (!domain) {
    throw new Error('Missing SHOPIFY_STORE_DOMAIN');
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('shopify_connections')
      .select('access_token')
      .eq('shop_domain', domain)
      .single();

    if (error || !data) {
      throw new Error(
        `No access token found in Supabase for ${domain}. Run OAuth install via /api/auth/install first.`
      );
    }
    return data.access_token;
  } catch (error) {
    if (error instanceof Error && error.message.includes('No access token found')) {
      throw error;
    }
    console.error('[oauth] Failed to retrieve token from Supabase:', error);
    throw new Error('Failed to retrieve access token from Supabase');
  }
}

// ============================================================================
// NEW EMBEDDED APP FLOW (Shopify CLI v4)
// ============================================================================

interface ShopifyJWT {
  iss: string;
  dest: string;
  aud: string;
  sub: string;
  exp: number;
  nbf: number;
  iat: number;
  jti: string;
  sid: string;
}

export function verifyShopifyJWT(token: string, clientSecret: string, expectedShop?: string): ShopifyJWT | null {
  try {
    devLog('[oauth] JWT verification starting');
    devLog('[oauth] Client secret exists:', !!clientSecret);
    devLog('[oauth] Client secret length:', clientSecret.length);

    // Decode header to check algorithm
    const headerPart = token.split('.')[0];
    const decodedHeader = Buffer.from(headerPart, 'base64').toString('utf-8');
    const header = JSON.parse(decodedHeader);
    devLog('[oauth] JWT header.alg:', header.alg);

    // Decode payload to check aud and dest
    const payloadPart = token.split('.')[1];
    const decodedPayload = Buffer.from(payloadPart, 'base64').toString('utf-8');
    const payload = JSON.parse(decodedPayload);
    devLog('[oauth] JWT payload.aud:', payload.aud);
    devLog('[oauth] JWT payload.dest:', payload.dest);
    devLog('[oauth] JWT payload.iat:', payload.iat);
    devLog('[oauth] JWT payload.exp:', payload.exp);
    devLog('[oauth] Current server timestamp:', Math.floor(Date.now() / 1000));
    devLog('[oauth] Time difference (exp - now):', payload.exp - Math.floor(Date.now() / 1000), 'seconds');

    // Verify audience matches client ID
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    if (!clientId) {
      console.error('[oauth] Missing SHOPIFY_CLIENT_ID for audience verification');
      return null;
    }
    if (payload.aud !== clientId) {
      devLog('[oauth] Audience mismatch - expected:', clientId, 'got:', payload.aud);
      return null;
    }
    devLog('[oauth] Audience verified');

    // Verify destination matches expected shop
    if (expectedShop && payload.dest !== `https://${expectedShop}`) {
      devLog('[oauth] Destination mismatch - expected:', `https://${expectedShop}`, 'got:', payload.dest);
      return null;
    }
    devLog('[oauth] Destination verified');

    // Verify JWT using jsonwebtoken library with HS256 and clock tolerance
    // Shopify embedded app JWTs have short expiry (60s), so we need higher tolerance
    // to account for network latency, processing time, and clock skew
    const decoded = jwt.verify(token, clientSecret, {
      algorithms: ['HS256'],
      clockTolerance: 180, // 180 seconds tolerance for clock skew and processing time
    }) as ShopifyJWT;

    devLog('[oauth] JWT verified successfully for shop:', decoded.dest);
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.error('[oauth] JWT expired error:', error.message);
      devLog('[oauth] JWT expired at:', error.expiredAt);
      devLog('[oauth] Current time:', new Date().toISOString());
    } else {
      console.error('[oauth] JWT verification error:', error);
    }
    devLog('[oauth] JWT verification failed');
    return null;
  }
}

export async function setShopifyEmbeddedSession(
  shop: string,
  idToken: string,
  sessionToken?: string,
  dest?: string,
  aud?: string
): Promise<void> {
  devLog('[oauth] setShopifyEmbeddedSession called for shop:', shop);
  try {
    const supabase = getSupabaseClient();
    devLog('[oauth] Upserting embedded session to shopify_connections');

    const { error } = await supabase
      .from('shopify_connections')
      .upsert(
        {
          shop_domain: shop,
          id_token: idToken,
          session_token: sessionToken || null,
          embedded: true,
          dest: dest || null,
          aud: aud || null,
          // Note: access_token is NOT set here for embedded apps
          // id_token is used for identity verification only
          // For Admin API calls, use the session_token or implement proper OAuth flow
        },
        { onConflict: 'shop_domain' }
      );

    if (error) {
      console.error('[oauth] Failed to store embedded session in Supabase:', error);
      throw new Error('Failed to store embedded session in Supabase');
    }

    devLog(`[oauth] Embedded session stored in Supabase for ${shop}`);
  } catch (error) {
    console.error('[oauth] Failed to store embedded session in Supabase:', error);
    throw error;
  }
}

export async function getShopifyConnection(shop: string): Promise<{
  shop_domain: string;
  access_token: string;
  id_token?: string;
  session_token?: string;
  embedded: boolean;
} | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('shopify_connections')
      .select('*')
      .eq('shop_domain', shop)
      .single();

    if (error || !data) {
      devLog(`[oauth] No connection found for ${shop}`);
      return null;
    }

    return data as any;
  } catch (error) {
    console.error('[oauth] Failed to retrieve connection from Supabase:', error);
    return null;
  }
}
