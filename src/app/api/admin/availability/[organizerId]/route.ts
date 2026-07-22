import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getShopifyConnectionId } from '@/lib/shopify-session';
import { getSupabaseClient, upsertAvailability } from '@/lib/supabase';
import type { Availability } from '@/types/admin';

const availabilitySchema = z.object({
  day_of_week: z.number().min(0).max(6),
  is_available: z.boolean(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizerId: string }> }
) {
  try {
    const { organizerId } = await params;
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    
    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }
    
    const shopifyConnectionId = await getShopifyConnectionId(shop);
    
    // Récupérer toutes les disponibilités pour l'organizer
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('organizer_id', organizerId);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('[admin availability GET]', error);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ organizerId: string }> }
) {
  try {
    const { organizerId } = await params;
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    
    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }
    
    const body = await request.json();
    const parsed = availabilitySchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error }, { status: 400 });
    }
    
    const availability: Availability = {
      ...parsed.data,
      organizer_id: organizerId,
    };
    
    const upserted = await upsertAvailability(availability);
    
    return NextResponse.json(upserted);
  } catch (error) {
    console.error('[admin availability PUT]', error);
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
  }
}
