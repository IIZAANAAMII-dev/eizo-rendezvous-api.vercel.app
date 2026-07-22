import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getShopifyConnectionId } from '@/lib/shopify-session';
import { updateOrganizer, deleteOrganizer } from '@/lib/supabase';

const organizerUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
  active: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    
    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }
    
    const shopifyConnectionId = await getShopifyConnectionId(shop);
    
    const body = await request.json();
    const parsed = organizerUpdateSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error }, { status: 400 });
    }
    
    const organizer = await updateOrganizer(id, parsed.data, shopifyConnectionId);
    
    return NextResponse.json(organizer);
  } catch (error) {
    console.error('[admin organizers PUT]', error);
    return NextResponse.json({ error: 'Failed to update organizer' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    
    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }
    
    const shopifyConnectionId = await getShopifyConnectionId(shop);
    await deleteOrganizer(id, shopifyConnectionId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin organizers DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete organizer' }, { status: 500 });
  }
}
