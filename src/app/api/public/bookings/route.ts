import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseClient } from '@/lib/supabase';
import { timeToMinutes, minutesToTime } from '@/lib/availability';
import { sendConfirmationEmail, sendOrganizerNotification } from '@/lib/email';
import { handleCors, withCors } from '@/lib/cors';

export async function POST(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const body = await request.json();
    const {
      organizerId,
      date,
      time,
      customerName,
      customerEmail,
      customerPhone,
      notes,
      productTitle,
      productHandle,
      productId,
      shopDomain,
    } = body;

    if (!organizerId || !date || !time || !customerName || !customerEmail) {
      return withCors(NextResponse.json({ error: 'Missing required fields' }, { status: 400 }), request);
    }

    const supabase = getSupabaseClient();

    const { data: organizer, error: organizerError } = await supabase
      .from('organizers')
      .select('*')
      .eq('slug', organizerId)
      .eq('active', true)
      .single();

    if (organizerError || !organizer) {
      if (organizerError?.code === 'PGRST116') {
        return withCors(NextResponse.json({ error: 'Organizer not found' }, { status: 404 }), request);
      }
      console.error('[public booking] organizer fetch error:', organizerError);
      return withCors(NextResponse.json({ error: 'Failed to fetch organizer' }, { status: 500 }), request);
    }

    // Vérifier si le créneau est déjà réservé
    const { data: existingBooking, error: checkError } = await supabase
      .from('bookings')
      .select('id')
      .eq('organizer_id', organizer.id)
      .eq('date', date)
      .eq('start_time', `${time}:00`)
      .neq('status', 'cancelled')
      .single();

    if (existingBooking) {
      return withCors(NextResponse.json({ error: 'Slot already booked' }, { status: 409 }), request);
    }

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[public booking] check error:', checkError);
      return withCors(NextResponse.json({ error: 'Failed to check availability' }, { status: 500 }), request);
    }

    const endMinutes = timeToMinutes(time) + organizer.slot_duration_minutes;
    const endTime = minutesToTime(endMinutes);

    // Générer le token de confirmation
    const confirmationToken = randomUUID();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eizo-rendezvous-api-vercel-app.vercel.app';
    const acceptUrl = `${appUrl}/api/public/bookings/validate?token=${confirmationToken}&action=accept`;
    const declineUrl = `${appUrl}/api/public/bookings/validate?token=${confirmationToken}&action=decline`;

    // Créer la réservation en attente de validation
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        organizer_id: organizer.id,
        date,
        start_time: `${time}:00`,
        end_time: `${endTime}:00`,
        slot_duration_minutes: organizer.slot_duration_minutes,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        customer_notes: notes || null,
        product_title: productTitle || null,
        product_handle: productHandle || null,
        product_id: productId || null,
        shop_domain: shopDomain || null,
        status: 'pending',
        confirmation_token: confirmationToken,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('[public booking] insert error:', bookingError);
      return withCors(NextResponse.json({ error: 'Failed to create booking' }, { status: 500 }), request);
    }

    // Envoyer les emails
    try {
      const emailData = {
        customerName,
        customerEmail,
        date,
        time,
        organizerName: organizer.name,
        organizerEmail: organizer.notification_email || organizer.email,
        productTitle,
        notes,
        confirmationUrl: acceptUrl,
        declineUrl,
      };

      await Promise.all([
        sendConfirmationEmail(emailData),
        sendOrganizerNotification(emailData),
      ]);
    } catch (emailError) {
      console.error('[public booking] email error:', emailError);
      // Don't fail the booking if email fails
    }

    return withCors(NextResponse.json(booking), request);
  } catch (error) {
    console.error('[public booking]', error);
    return withCors(NextResponse.json({ error: 'Failed to create booking' }, { status: 500 }), request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;
  return new NextResponse(null, { status: 204 });
}
