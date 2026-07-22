import { randomBytes } from 'node:crypto';

interface StateEntry {
  shop: string;
  expires: number;
}

const stateStore = new Map<string, StateEntry>();
const tokenStore = new Map<string, string>();

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

export function setShopifyAccessToken(shop: string, token: string): void {
  tokenStore.set(shop, token);
}

export function getShopifyAccessToken(shop?: string): string {
  const domain = shop || process.env.SHOPIFY_STORE_DOMAIN;
  if (!domain) {
    throw new Error('Missing SHOPIFY_STORE_DOMAIN');
  }
  const token = tokenStore.get(domain);
  if (!token) {
    throw new Error(
      `No access token for ${domain}. Run OAuth install via /api/auth/install first.`
    );
  }
  return token;
}

export function getInstalledShops(): string[] {
  return Array.from(tokenStore.keys());
}
