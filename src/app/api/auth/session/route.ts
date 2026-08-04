import { NextRequest, NextResponse } from 'next/server';
import { verifyShopifyJWT, setShopifyEmbeddedSession } from '@/lib/oauth';
import { ADMIN_SESSION_COOKIE, createShopSessionToken } from '@/lib/admin-session';

// Verifies the Shopify embedded app bootstrap (id_token) and, on success,
// sets a signed HttpOnly cookie proving this browser is authenticated for
// this specific shop. All /api/admin/* routes require this cookie instead
// of blindly trusting the `shop` query parameter.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');
  const idToken = searchParams.get('id_token');
  const session = searchParams.get('session');

  if (!shop || !idToken) {
    return NextResponse.json({ error: 'Missing shop or id_token parameter' }, { status: 400 });
  }

  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientSecret) {
    console.error('[auth/session] Missing SHOPIFY_CLIENT_SECRET');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const jwt = verifyShopifyJWT(idToken, clientSecret, shop);
  if (!jwt) {
    return NextResponse.json({ error: 'Invalid session token' }, { status: 401 });
  }

  try {
    await setShopifyEmbeddedSession(shop, idToken, session || undefined, jwt.dest, jwt.aud);
  } catch (error) {
    console.error('[auth/session] Failed to store embedded session:', error);
    return NextResponse.json({ error: 'Failed to store session' }, { status: 500 });
  }

  const redirectUrl = new URL(`/shopify?shop=${encodeURIComponent(shop)}`, request.url);
  const response = NextResponse.redirect(redirectUrl);

  const { value, maxAgeSeconds } = createShopSessionToken(shop);
  response.cookies.set(ADMIN_SESSION_COOKIE, value, {
    httpOnly: true,
    secure: true,
    sameSite: 'none', // required: the app runs embedded in a Shopify Admin iframe
    path: '/',
    maxAge: maxAgeSeconds,
  });

  return response;
}
