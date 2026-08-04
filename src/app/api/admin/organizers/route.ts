import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getShopifyConnectionId, toErrorResponse } from '@/lib/shopify-session';
import { getOrganizersByShop, createOrganizer } from '@/lib/supabase';
import type { OrganizerInput } from '@/types/admin';

const organizerSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  email: z.string().email().optional(),
  specialty: z.string().optional(),
  description: z.string().optional(),
  timezone: z.string().optional(),
  active: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    
    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }
    
    const shopifyConnectionId = await getShopifyConnectionId(request, shop);
    const organizers = await getOrganizersByShop(shopifyConnectionId);
    
    return NextResponse.json(organizers);
  } catch (error) {
    return toErrorResponse(error, 'Failed to fetch organizers');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    
    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }
    
    const body = await request.json();
    const parsed = organizerSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error }, { status: 400 });
    }
    
    const shopifyConnectionId = await getShopifyConnectionId(request, shop);
    const organizer = await createOrganizer(parsed.data, shopifyConnectionId);
    
    return NextResponse.json(organizer, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, 'Failed to create organizer');
  }
}
