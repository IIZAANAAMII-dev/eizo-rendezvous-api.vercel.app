import { NextRequest, NextResponse } from 'next/server';
import { getShopifyConnectionId, toErrorResponse } from '@/lib/shopify-session';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }

    const shopifyConnectionId = await getShopifyConnectionId(request, shop);
    const supabase = getSupabaseClient();

    const limit = Math.min(Number(searchParams.get('limit')) || 100, 200);

    // NOTE: appointments.organizer_id references organizers.id, not the
    // shop connection id. Filtering directly with shopifyConnectionId
    // (as the previous version did) silently returned zero/incorrect
    // rows. We scope via an inner join on organizers.shopify_connection_id
    // instead, and cap the payload with a limit to avoid shipping the
    // entire history on every dashboard load.
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id, customer_name, customer_email, customer_phone, date,
        start_time, end_time, product_title, status, created_at,
        organizer:organizers!inner(id, name, email, shopify_connection_id)
      `)
      .eq('organizer.shopify_connection_id', shopifyConnectionId)
      .order('date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[bookings GET] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    return NextResponse.json(bookings || []);
  } catch (error) {
    return toErrorResponse(error, 'Failed to fetch bookings');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }

    const shopifyConnectionId = await getShopifyConnectionId(request, shop);
    const supabase = getSupabaseClient();

    const body = await request.json();

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        customer_name: body.clientName,
        customer_email: body.clientEmail,
        organizer_id: body.organizerId,
        date: body.date,
        start_time: body.time,
        end_time: body.endTime,
        product_title: body.productTitle,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[bookings POST] Error:', error);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    return toErrorResponse(error, 'Failed to create booking');
  }
}
