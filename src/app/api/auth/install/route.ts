import { NextRequest, NextResponse } from 'next/server';
import { generateOAuthState } from '@/lib/oauth';

const REQUIRED_SCOPES = ['read_metaobjects', 'write_metaobjects'];

export async function GET(request: NextRequest) {
  console.log('[auth/install] Route hit');
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');
  const clientId = process.env.SHOPIFY_CLIENT_ID;

  // Log all headers (excluding secrets)
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (!key.toLowerCase().includes('secret') && !key.toLowerCase().includes('authorization')) {
      headers[key] = value;
    }
  });
  console.log('[auth/install] Headers:', JSON.stringify(headers, null, 2));

  // Log query params
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  console.log('[auth/install] Query params:', JSON.stringify(params, null, 2));

  console.log('[auth/install] shop:', shop);
  console.log('[auth/install] clientId:', clientId);
  console.log('[auth/install] Has id_token in URL:', request.url.includes('id_token'));
  console.log('[auth/install] Has session in URL:', request.url.includes('session'));
  console.log('[auth/install] Has code in URL:', request.url.includes('code'));

  if (!shop) {
    console.error('[auth/install] Missing shop parameter');
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }
  if (!clientId) {
    console.error('[auth/install] Missing SHOPIFY_CLIENT_ID');
    return NextResponse.json({ error: 'Missing SHOPIFY_CLIENT_ID' }, { status: 500 });
  }

  // Use request URL to construct callback URL dynamically
  const requestUrl = new URL(request.url);
  const redirectUri = `${requestUrl.origin}/api/auth/callback`;
  const state = generateOAuthState(shop);

  console.log('[auth/install] redirectUri:', redirectUri);
  console.log('[auth/install] state:', state);

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('scope', REQUIRED_SCOPES.join(','));
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  console.log('[auth/install] Redirecting to:', authUrl.toString());
  return NextResponse.redirect(authUrl.toString());
}
