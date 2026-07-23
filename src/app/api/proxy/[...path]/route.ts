import { NextRequest, NextResponse } from 'next/server';

// Shopify App Proxy signature verification
function verifyShopifyProxySignature(query: URLSearchParams, shop: string): boolean {
  const signature = query.get('signature');
  if (!signature) return false;
  
  // In production, you should verify the HMAC signature
  // For now, we'll use a simpler check with the shop parameter
  // TODO: Implement proper HMAC verification
  return !!shop;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  console.log('[proxy GET] Route hit');
  try {
    const { path } = await params;
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');

    // Log all headers (excluding secrets)
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (!key.toLowerCase().includes('secret') && !key.toLowerCase().includes('authorization')) {
        headers[key] = value;
      }
    });
    console.log('[proxy GET] Headers:', JSON.stringify(headers, null, 2));

    // Log query params
    const paramsObj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      paramsObj[key] = value;
    });
    console.log('[proxy GET] Query params:', JSON.stringify(paramsObj, null, 2));

    console.log('[proxy GET] path:', path);
    console.log('[proxy GET] shop:', shop);
    console.log('[proxy GET] Has id_token in URL:', request.url.includes('id_token'));
    console.log('[proxy GET] Has session in URL:', request.url.includes('session'));

    if (!shop) {
      console.error('[proxy GET] Missing shop parameter');
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }

    // Verify Shopify proxy signature
    if (!verifyShopifyProxySignature(searchParams, shop)) {
      console.error('[proxy GET] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Proxy to the actual booking API
    const targetPath = path.join('/');
    const targetUrl = new URL(`/api/booking/${targetPath}`, request.url);

    // Copy query parameters except shop and signature
    searchParams.delete('shop');
    searchParams.delete('signature');
    searchParams.delete('timestamp');
    searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });

    console.log('[proxy GET] Proxying to:', targetUrl.toString());
    const response = await fetch(targetUrl.toString());
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[proxy GET]', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  console.log('[proxy POST] Route hit');
  try {
    const { path } = await params;
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');

    // Log all headers (excluding secrets)
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (!key.toLowerCase().includes('secret') && !key.toLowerCase().includes('authorization')) {
        headers[key] = value;
      }
    });
    console.log('[proxy POST] Headers:', JSON.stringify(headers, null, 2));

    // Log query params
    const paramsObj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      paramsObj[key] = value;
    });
    console.log('[proxy POST] Query params:', JSON.stringify(paramsObj, null, 2));

    console.log('[proxy POST] path:', path);
    console.log('[proxy POST] shop:', shop);
    console.log('[proxy POST] Has id_token in URL:', request.url.includes('id_token'));
    console.log('[proxy POST] Has session in URL:', request.url.includes('session'));

    if (!shop) {
      console.error('[proxy POST] Missing shop parameter');
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }

    // Verify Shopify proxy signature
    if (!verifyShopifyProxySignature(searchParams, shop)) {
      console.error('[proxy POST] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Proxy to the actual booking API
    const targetPath = path.join('/');
    const targetUrl = new URL(`/api/booking/${targetPath}`, request.url);

    // Copy query parameters except shop and signature
    searchParams.delete('shop');
    searchParams.delete('signature');
    searchParams.delete('timestamp');
    searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });

    const body = await request.json();
    console.log('[proxy POST] Body:', JSON.stringify(body, null, 2));

    console.log('[proxy POST] Proxying to:', targetUrl.toString());
    const response = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[proxy POST]', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}
