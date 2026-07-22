import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

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
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('shopify_connections')
      .upsert(
        { shop_domain: shop, access_token: token },
        { onConflict: 'shop_domain' }
      );
    if (error) {
      console.error('[oauth] Failed to store token in Supabase:', error);
      throw new Error('Failed to store access token in Supabase');
    }
    console.log(`[oauth] Token stored in Supabase for ${shop}`);
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
