import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizerId, date, time, clientName, clientEmail, clientPhone, notes } = body;
    const supabase = getSupabaseClient();

    if (!organizerId || !date || !time || !clientName || !clientEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Récupérer l'organisateur pour obtenir le shopify_connection_id
    const { data: organizer, error: organizerError } = await supabase
      .from('organizers')
      .select('shopify_connection_id')
      .eq('id', organizerId)
      .single();

    if (organizerError || !organizer) {
      return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });
    }

    // Créer le rendez-vous
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        organizer_id: organizerId,
        shopify_connection_id: organizer.shopify_connection_id,
        date: `${date}T${time}:00`,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone || null,
        notes: notes || null,
        status: 'confirmed',
      })
      .select()
      .single();

    if (bookingError) {
      console.error('[public booking]', bookingError);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('[public booking]', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
