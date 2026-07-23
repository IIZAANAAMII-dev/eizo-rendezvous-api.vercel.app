import { NextRequest, NextResponse } from 'next/server';
import { getShopifyConnectionId } from '@/lib/shopify-session';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }

    const shopifyConnectionId = await getShopifyConnectionId(shop);
    const supabase = getSupabaseClient();

    // Récupérer les appointments depuis Supabase
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        organizer:organizers(name, email)
      `)
      .eq('organizer_id', shopifyConnectionId)
      .order('appointment_date', { ascending: true });

    if (error) {
      console.error('[bookings GET] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    return NextResponse.json(appointments || []);
  } catch (error) {
    console.error('[bookings GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }

    const shopifyConnectionId = await getShopifyConnectionId(shop);
    const supabase = getSupabaseClient();

    const body = await request.json();

    // Créer un nouveau appointment
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        customer_name: body.clientName,
        customer_email: body.clientEmail,
        organizer_id: body.organizerId,
        appointment_date: body.date,
        start_time: body.time,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[bookings POST] Error:', error);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error('[bookings POST] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
