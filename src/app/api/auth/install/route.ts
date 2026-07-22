import { NextRequest, NextResponse } from 'next/server';
import { generateOAuthState } from '@/lib/oauth';

const REQUIRED_SCOPES = ['read_metaobjects', 'write_metaobjects'];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }
  if (!clientId) {
    return NextResponse.json({ error: 'Missing SHOPIFY_CLIENT_ID' }, { status: 500 });
  }
  if (!apiBaseUrl) {
    return NextResponse.json({ error: 'Missing API_BASE_URL' }, { status: 500 });
  }

  const redirectUri = `${apiBaseUrl}/api/auth/callback`;
  const state = generateOAuthState(shop);

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('scope', REQUIRED_SCOPES.join(','));
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
