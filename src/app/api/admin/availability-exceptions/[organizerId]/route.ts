import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getShopifyConnectionId } from '@/lib/shopify-session';
import { getSupabaseClient } from '@/lib/supabase';
import type { AvailabilityException } from '@/types/admin';

const availabilityExceptionSchema = z.object({
  date: z.string(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  type: z.enum(['unavailable', 'override']),
  reason: z.string().optional(),
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

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('availability_exceptions')
      .select('*')
      .eq('organizer_id', organizerId)
      .order('date', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('[admin availability-exceptions GET]', error);
    return NextResponse.json({ error: 'Failed to fetch availability exceptions' }, { status: 500 });
  }
}

export async function POST(
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
    const parsed = availabilityExceptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error }, { status: 400 });
    }

    const exception: AvailabilityException = {
      ...parsed.data,
      organizer_id: organizerId,
    };

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('availability_exceptions')
      .insert(exception)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[admin availability-exceptions POST]', error);
    return NextResponse.json({ error: 'Failed to create availability exception' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ organizerId: string }> }
) {
  try {
    const { organizerId } = await params;
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    const exceptionId = searchParams.get('exceptionId');

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }

    if (!exceptionId) {
      return NextResponse.json({ error: 'Missing exceptionId parameter' }, { status: 400 });
    }

    const shopifyConnectionId = await getShopifyConnectionId(shop);

    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('availability_exceptions')
      .delete()
      .eq('id', exceptionId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin availability-exceptions DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete availability exception' }, { status: 500 });
  }
}
