import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { timeToMinutes, minutesToTime } from '@/lib/availability';
import { sendConfirmationEmail, sendOrganizerNotification, sendBookingCancelledEmail, sendOrganizerCancellationNotification } from '@/lib/email';
import { getExpertEmail, siteConfig } from '@/lib/config';
import { handleCors, withCors } from '@/lib/cors';

function sanitizeString(value: unknown, maxLength = 2000): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length > maxLength) return trimmed.slice(0, maxLength);
  return trimmed || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const { token } = await params;
    const supabase = getSupabaseClient();

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('management_token', token)
      .single();

    if (error || !booking) {
      return withCors(NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 }), request);
    }

    const { data: organizer } = await supabase
      .from('organizers')
      .select('name, slug, email, notification_email, slot_duration_minutes')
      .eq('id', booking.organizer_id)
      .single();

    return withCors(NextResponse.json({
      booking,
      organizer,
      actions: {
        cancel: true,
        reschedule: ['pending', 'confirmed'].includes(booking.status),
      },
    }), request);
  } catch (error) {
    console.error('[manage booking] get error:', error);
    return withCors(NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 }), request);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const { token } = await params;
    const body = await request.json();
    const { status, date, time } = body;

    const supabase = getSupabaseClient();

    const { data: booking, error: findError } = await supabase
      .from('bookings')
      .select('*')
      .eq('management_token', token)
      .single();

    if (findError || !booking) {
      return withCors(NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 }), request);
    }

    const { data: organizer } = await supabase
      .from('organizers')
      .select('id, name, slug, email, notification_email, slot_duration_minutes')
      .eq('id', booking.organizer_id)
      .single();

    if (!organizer) {
      return withCors(NextResponse.json({ error: 'Expert introuvable' }, { status: 404 }), request);
    }

    if (status === 'cancelled') {
      if (booking.status === 'cancelled' || booking.status === 'refused') {
        return withCors(NextResponse.json({ error: 'Le rendez-vous est déjà annulé' }, { status: 409 }), request);
      }

      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (updateError) {
        console.error('[manage booking] cancel error:', updateError);
        return withCors(NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 }), request);
      }

      const emailData = {
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        customerPhone: booking.customer_phone || undefined,
        date: booking.date,
        time: booking.start_time.slice(0, 5),
        endTime: booking.end_time ? booking.end_time.slice(0, 5) : undefined,
        organizerName: organizer.name,
        organizerEmail: getExpertEmail(organizer.email, organizer.notification_email),
        productTitle: booking.product_title || undefined,
        productHandle: booking.product_handle || undefined,
        shopDomain: booking.shop_domain || undefined,
        requestedProduct: booking.requested_product,
        customerUsage: booking.customer_usage,
        customerNeed: booking.customer_need,
        managementToken: booking.management_token,
      };

      try {
        await Promise.all([
          sendBookingCancelledEmail(emailData),
          sendOrganizerCancellationNotification(emailData),
        ]);
      } catch (emailError) {
        console.error('[manage booking] cancel email error:', emailError);
      }

      return withCors(NextResponse.json({ success: true, status: 'cancelled' }), request);
    }

    if (date && time) {
      if (['cancelled', 'refused'].includes(booking.status)) {
        return withCors(NextResponse.json({ error: 'Impossible de modifier un rendez-vous annulé ou refusé' }, { status: 409 }), request);
      }

      const normalizedTime = time.slice(0, 5);
      const endMinutes = timeToMinutes(normalizedTime) + (organizer.slot_duration_minutes || 60);
      const endTime = minutesToTime(endMinutes);

      const { data: existing, error: checkError } = await supabase
        .from('bookings')
        .select('id')
        .eq('organizer_id', organizer.id)
        .eq('date', date)
        .eq('start_time', `${normalizedTime}:00`)
        .in('status', ['pending', 'confirmed'])
        .neq('id', booking.id)
        .single();

      if (existing) {
        return withCors(NextResponse.json({ error: 'Ce créneau n\'est plus disponible' }, { status: 409 }), request);
      }

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[manage booking] reschedule check error:', checkError);
        return withCors(NextResponse.json({ error: 'Failed to check availability' }, { status: 500 }), request);
      }

      const { data: updated, error: updateError } = await supabase
        .from('bookings')
        .update({
          date,
          start_time: `${normalizedTime}:00`,
          end_time: `${endTime}:00`,
          status: 'pending',
          confirmed_at: null,
          refused_at: null,
          cancelled_at: null,
        })
        .eq('id', booking.id)
        .select()
        .single();

      if (updateError) {
        console.error('[manage booking] reschedule error:', updateError);
        return withCors(NextResponse.json({ error: 'Failed to update booking' }, { status: 500 }), request);
      }

      try {
        const emailData = {
          customerName: updated.customer_name,
          customerEmail: updated.customer_email,
          customerPhone: updated.customer_phone || undefined,
          date,
          time: `${normalizedTime}:00`,
          endTime: `${endTime}:00`,
          organizerName: organizer.name,
          organizerEmail: getExpertEmail(organizer.email, organizer.notification_email),
          productTitle: updated.product_title || undefined,
          requestedProduct: updated.requested_product,
          customerUsage: updated.customer_usage,
          customerNeed: updated.customer_need,
          notes: updated.customer_notes || undefined,
          managementToken: updated.management_token,
        };

        const acceptUrl = `${siteConfig.appUrl}/api/public/booking-validate?token=${updated.confirmation_token}&action=accept`;
        const declineUrl = `${siteConfig.appUrl}/api/public/booking-validate?token=${updated.confirmation_token}&action=decline`;
        const cancelUrl = `${siteConfig.appUrl}/api/public/booking-validate?token=${updated.confirmation_token}&action=cancel`;

        await Promise.all([
          sendConfirmationEmail({ ...emailData, confirmationUrl: acceptUrl, declineUrl, cancelUrl }),
          sendOrganizerNotification({ ...emailData, confirmationUrl: acceptUrl, declineUrl, cancelUrl }),
        ]);
      } catch (emailError) {
        console.error('[manage booking] email error:', emailError);
      }

      return withCors(NextResponse.json({ success: true, booking: updated, status: 'pending' }), request);
    }

    return withCors(NextResponse.json({ error: 'Opération non reconnue' }, { status: 400 }), request);
  } catch (error) {
    console.error('[manage booking] patch error:', error);
    return withCors(NextResponse.json({ error: 'Failed to update booking' }, { status: 500 }), request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;
  return new NextResponse(null, { status: 204 });
}
