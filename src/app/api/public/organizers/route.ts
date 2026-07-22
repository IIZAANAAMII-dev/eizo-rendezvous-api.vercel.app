import { NextRequest, NextResponse } from 'next/server';
import { getOrganizersByShop } from '@/lib/supabase';
import { getShopifyConnectionId } from '@/lib/shopify-session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    
    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }
    
    const shopifyConnectionId = await getShopifyConnectionId(shop);
    const organizers = await getOrganizersByShop(shopifyConnectionId);
    
    // Retourner uniquement les organisateurs actifs avec slug public
    const publicOrganizers = organizers
      .filter(o => o.active)
      .map(o => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
      }));
    
    return NextResponse.json(publicOrganizers);
  } catch (error) {
    console.error('[public organizers]', error);
    return NextResponse.json({ error: 'Failed to fetch organizers' }, { status: 500 });
  }
}
