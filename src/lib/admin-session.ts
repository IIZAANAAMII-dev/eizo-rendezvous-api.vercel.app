import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Signed shop session cookie.
//
// The Back Office was trusting the bare `?shop=` query string parameter on
// every /api/admin/* request with zero proof that the caller actually went
// through Shopify's embedded-app authentication. Anyone who knew (or
// guessed) a shop domain could read/create/update/delete that shop's data.
//
// This module signs a short-lived cookie right after we verify the Shopify
// embedded session JWT (see /api/auth/session), and every admin API route
// now requires that cookie to match the `shop` it claims to act on.
// ---------------------------------------------------------------------------

export const ADMIN_SESSION_COOKIE = 'eizo_shop_session';
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour, refreshed on every embedded reload

function getSecret(): string {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) {
    throw new Error('Missing SHOPIFY_CLIENT_SECRET environment variable');
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

/**
 * Builds the signed cookie value `${shop}.${expiresAt}.${signature}` for the
 * given shop. Call this after verifying the Shopify embedded session JWT.
 */
export function createShopSessionToken(shop: string): { value: string; maxAgeSeconds: number } {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${shop}.${expiresAt}`;
  const signature = sign(payload);
  return {
    value: `${payload}.${signature}`,
    maxAgeSeconds: Math.floor(SESSION_TTL_MS / 1000),
  };
}

/**
 * Verifies that the incoming request carries a valid, non-expired session
 * cookie for the given shop. Returns true only if the cookie is present,
 * correctly signed, not expired, AND matches the requested shop.
 */
export function verifyShopSession(request: NextRequest, expectedShop: string): boolean {
  const cookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!cookie) return false;

  const parts = cookie.split('.');
  if (parts.length !== 3) return false;
  const [shop, expiresAtRaw, signature] = parts;

  if (shop !== expectedShop) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expectedSignature = sign(`${shop}.${expiresAtRaw}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
