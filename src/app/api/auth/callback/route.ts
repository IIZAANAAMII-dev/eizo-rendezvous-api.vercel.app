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

    // Store token in Supabase
    await setShopifyAccessToken(shop, data.access_token);

    // Return success page with redirect to Shopify admin
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Installation Réussie</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; text-align: center; }
          h1 { color: #2ecc71; }
        </style>
        <script>
          setTimeout(() => {
            window.location.href = 'https://${shop}/admin/apps';
          }, 2000);
        </script>
      </head>
      <body>
        <h1>✅ Installation Réussie</h1>
        <p>L'application a été installée avec succès.</p>
        <p>Le token d'accès a été sauvegardé dans Supabase.</p>
        <p>Redirection vers Shopify Admin...</p>
      </body>
      </html>
    `;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
  } catch (error) {
    console.error('[auth/callback]', error);
    return NextResponse.json(
      { error: 'Internal error during OAuth callback' },
      { status: 500 }
    );
  }
}
