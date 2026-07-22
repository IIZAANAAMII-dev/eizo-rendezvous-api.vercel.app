import { NextRequest, NextResponse } from 'next/server';
import { validateOAuthState, setShopifyAccessToken } from '@/lib/oauth';

interface TokenResponse {
  access_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const shop = searchParams.get('shop');
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!shop || !code || !state) {
    return NextResponse.json(
      { error: 'Missing shop, code or state parameter' },
      { status: 400 }
    );
  }

  if (!validateOAuthState(state, shop)) {
    return NextResponse.json(
      { error: 'Invalid or expired OAuth state' },
      { status: 403 }
    );
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Missing SHOPIFY_CLIENT_ID or SHOPIFY_CLIENT_SECRET' },
      { status: 500 }
    );
  }

  try {
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const data = (await response.json()) as TokenResponse;

    if (!response.ok || data.error) {
      console.error('[auth/callback] Shopify token exchange failed', data);
      return NextResponse.json(
        {
          error: 'Token exchange failed',
          details: data.error_description || data.error || 'Unknown error',
        },
        { status: 500 }
      );
    }

    if (!data.access_token) {
      return NextResponse.json(
        { error: 'No access_token returned by Shopify' },
        { status: 500 }
      );
    }

    setShopifyAccessToken(shop, data.access_token);

    const apiBaseUrl = process.env.API_BASE_URL || '';
    const successUrl = apiBaseUrl ? `${apiBaseUrl}/success?shop=${encodeURIComponent(shop)}` : '/success';

    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error('[auth/callback]', error);
    return NextResponse.json(
      { error: 'Internal error during OAuth callback' },
      { status: 500 }
    );
  }
}
