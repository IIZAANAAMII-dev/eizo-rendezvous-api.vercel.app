import { randomBytes } from 'node:crypto';

interface StateEntry {
  shop: string;
  expires: number;
}

const stateStore = new Map<string, StateEntry>();
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

// Note: OAuth token storage is no longer used.
// The application now uses SHOPIFY_ACCESS_TOKEN environment variable as the primary authentication method.
// OAuth routes (/api/auth/install, /api/auth/callback) are kept optional for initial token retrieval if needed.
