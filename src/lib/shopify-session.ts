import { NextRequest, NextResponse } from 'next/server';
import { getShopifyAccessToken } from './oauth';
import { verifyShopSession } from './admin-session';

export async function getShopFromSession(shop: string): Promise<string> {
  const token = await getShopifyAccessToken(shop);
  if (!token) {
    throw new Error('Shop not authenticated');
  }
  return shop;
}

export class UnauthorizedShopError extends Error {
  constructor() {
    super('Missing or invalid Shopify admin session for this shop');
    this.name = 'UnauthorizedShopError';
  }
}

/**
 * Shared catch-block handler for admin routes: maps UnauthorizedShopError to
 * a 401, everything else to a logged 500 with `fallbackMessage`.
 */
export function toErrorResponse(error: unknown, fallbackMessage: string): NextResponse {
  if (error instanceof UnauthorizedShopError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  console.error(fallbackMessage, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

// In-memory cache for shop_domain -> shopify_connection_id lookups.
// This mapping almost never changes, but it was being re-fetched from
// Supabase on EVERY single admin API call, doubling the round-trip
// latency of the whole Back Office. Cache it for a short TTL per
// warm serverless instance to remove that redundant query.
const CONNECTION_ID_TTL_MS = 5 * 60 * 1000; // 5 minutes
const connectionIdCache = new Map<string, { id: string; expires: number }>();

/**
 * Resolves the shopify_connection_id for `shop`, but only after verifying
 * that the request carries a valid signed session cookie for that exact
 * shop (see lib/admin-session.ts). Previously this trusted the bare
 * `?shop=` query parameter, letting anyone act on any shop's data.
 *
 * Throws UnauthorizedShopError if the session is missing/invalid — callers
 * should catch this and return a 401.
 */
export async function getShopifyConnectionId(request: NextRequest, shop: string): Promise<string> {
  if (!verifyShopSession(request, shop)) {
    throw new UnauthorizedShopError();
  }

  const cached = connectionIdCache.get(shop);
  if (cached && cached.expires > Date.now()) {
    return cached.id;
  }

  const { getSupabaseClient } = await import('./supabase');
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('shopify_connections')
    .select('id')
    .eq('shop_domain', shop)
    .single();

  if (error || !data) {
    connectionIdCache.delete(shop);
    throw new Error('Shop not found in connections');
  }

  connectionIdCache.set(shop, { id: data.id, expires: Date.now() + CONNECTION_ID_TTL_MS });
  return data.id;
}
