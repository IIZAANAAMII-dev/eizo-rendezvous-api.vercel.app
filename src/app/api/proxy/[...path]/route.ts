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
  try {
    const { path } = await params;
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    
    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }
    
    // Verify Shopify proxy signature
    if (!verifyShopifyProxySignature(searchParams, shop)) {
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
  try {
    const { path } = await params;
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    
    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }
    
    // Verify Shopify proxy signature
    if (!verifyShopifyProxySignature(searchParams, shop)) {
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
