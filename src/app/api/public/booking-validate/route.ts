import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { sendBookingConfirmedEmail, sendBookingDeclinedEmail } from '@/lib/email';
import { siteConfig } from '@/lib/config';
import { buildGoogleCalendarUrl, buildIcsCalendar } from '@/lib/calendar';
import { handleCors, withCors } from '@/lib/cors';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function htmlPage(title: string, content: string, success = true) {
  const color = success ? '#10B981' : '#EF4444';
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f6f8fb; color: #0b1220; }
    .card { background: #fff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); text-align: center; max-width: 520px; width: 100%; }
    .icon { width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; font-size: 30px; background: ${color}15; color: ${color}; }
    h1 { font-size: 24px; margin: 0 0 16px; }
    p { color: #5e6a7e; line-height: 1.5; margin: 0 0 20px; }
    .details { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: left; }
    .details p { margin: 0 0 8px; color: #111827; }
    .details span { color: #6b7280; }
    .actions { margin-top: 24px; display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; }
    .btn-primary { background: #0066CC; color: #fff; }
    .btn-outline { background: #fff; color: #0066CC; border: 2px solid #0066CC; }
    .contact { margin-top: 24px; padding-top: 24px; border-top: 1px solid #e3e8ef; }
    .contact p { margin: 2px 0; font-size: 13px; color: #6b7280; }
    .contact a { color: #0066CC; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '✓' : '✕'}</div>
    <h1>${title}</h1>
    ${content}
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const action = searchParams.get('action');

    if (!token || !['accept', 'decline'].includes(action || '')) {
      return withCors(NextResponse.json({ error: 'Requête invalide' }, { status: 400 }), request);
    }

    const supabase = getSupabaseClient();

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('confirmation_token', token)
      .single();

    if (error || !booking) {
      console.error('[validate booking] find error:', error);
      return withCors(NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 }), request);
    }

    const { data: organizer } = await supabase
      .from('organizers')
      .select('name, email, notification_email')
      .eq('id', booking.organizer_id)
      .single();

    const dateLabel = formatDate(booking.date);
    const timeLabel = formatTime(booking.start_time);
    const endTimeLabel = formatTime(booking.end_time);

    const commonDetails = `
      <div class="details">
        <p><span>Client :</span> ${booking.customer_name}</p>
        <p><span>Date :</span> ${dateLabel}</p>
        <p><span>Heure :</span> ${timeLabel} - ${endTimeLabel}</p>
        <p><span>Expert :</span> ${organizer?.name || 'Expert EIZO'}</p>
      </div>
    `;

    if (action === 'accept') {
      if (booking.status === 'confirmed') {
        return new NextResponse(
          htmlPage('Déjà confirmé', `${commonDetails}<p>Ce rendez-vous est déjà accepté.</p>`, true),
          { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }

      if (['cancelled', 'refused'].includes(booking.status)) {
        return new NextResponse(
          htmlPage('Action impossible', `${commonDetails}<p>Ce rendez-vous a déjà été refusé ou annulé.</p>`, false),
          { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }

      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (updateError) {
        console.error('[validate booking] accept error:', updateError);
        return withCors(NextResponse.json({ error: 'Failed to confirm booking' }, { status: 500 }), request);
      }

      const googleUrl = buildGoogleCalendarUrl({
        title: `Démonstration EIZO ColorEdge — ${booking.customer_name}`,
        startDate: booking.date,
        startTime: booking.start_time.slice(0, 5),
        endDate: booking.date,
        endTime: booking.end_time.slice(0, 5),
        location: siteConfig.showroom.fullAddress,
        description: [
          `Client : ${booking.customer_name}`,
          `Téléphone : ${booking.customer_phone || ''}`,
          `Email : ${booking.customer_email}`,
          booking.requested_product?.title && `Démonstration : ${booking.requested_product.title}`,
          `Lieu : ${siteConfig.showroom.fullAddress}`,
        ].filter(Boolean).join('\n'),
      });

      const icsUrl = booking.management_token
        ? `${siteConfig.appUrl}/api/public/calendar/ics?token=${booking.management_token}&role=expert`
        : '';

      const manageUrl = booking.management_token
        ? `${siteConfig.appUrl}/manage/${booking.management_token}`
        : '';

      try {
        await sendBookingConfirmedEmail({
          customerName: booking.customer_name,
          customerEmail: booking.customer_email,
          customerPhone: booking.customer_phone || undefined,
          date: booking.date,
          time: booking.start_time.slice(0, 5),
          endTime: booking.end_time.slice(0, 5),
          organizerName: organizer?.name || 'Expert EIZO',
          organizerEmail: organizer?.email || '',
          productTitle: booking.product_title || undefined,
          requestedProduct: booking.requested_product,
          customerUsage: booking.customer_usage,
          customerNeed: booking.customer_need,
          notes: booking.customer_notes || undefined,
          managementToken: booking.management_token,
        });
      } catch (emailError) {
        console.error('[validate booking] customer email error:', emailError);
      }

      const actions = `
        <div class="actions">
          <a href="${googleUrl}" target="_blank" class="btn btn-primary">Ajouter à Google Agenda</a>
          ${icsUrl ? `<a href="${icsUrl}" class="btn btn-outline">Télécharger .ics</a>` : ''}
        </div>
        ${manageUrl ? `<p style="margin-top: 16px; font-size: 13px; color: #6b7280;"><a href="${manageUrl}">Gérer le rendez-vous</a></p>` : ''}
      `;

      const contact = `
        <div class="contact">
          <p style="font-weight: 700; color: #111827;">CONTACT</p>
          <p>${siteConfig.showroom.lines.join('<br>')}</p>
          <p><a href="${siteConfig.showroom.googleMapsUrl}" target="_blank">Voir le showroom sur Google Maps →</a></p>
        </div>
      `;

      return new NextResponse(
        htmlPage('Rendez-vous accepté', `${commonDetails}<p>Le rendez-vous avec ${booking.customer_name} est confirmé.</p>${actions}${contact}`, true),
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    if (action === 'decline') {
      if (booking.status === 'refused') {
        return new NextResponse(
          htmlPage('Déjà refusé', `${commonDetails}<p>Cette demande a déjà été refusée.</p>`, false),
          { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }

      if (booking.status === 'cancelled') {
        return new NextResponse(
          htmlPage('Déjà annulé', `${commonDetails}<p>Ce rendez-vous a déjà été annulé.</p>`, false),
          { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }

      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'refused', refused_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (updateError) {
        console.error('[validate booking] decline error:', updateError);
        return withCors(NextResponse.json({ error: 'Failed to decline booking' }, { status: 500 }), request);
      }

      try {
        await sendBookingDeclinedEmail({
          customerName: booking.customer_name,
          customerEmail: booking.customer_email,
          date: booking.date,
          time: booking.start_time.slice(0, 5),
          endTime: booking.end_time ? booking.end_time.slice(0, 5) : undefined,
          organizerName: organizer?.name || 'Expert EIZO',
          organizerEmail: organizer?.email || '',
          productTitle: booking.product_title || undefined,
          requestedProduct: booking.requested_product,
          customerUsage: booking.customer_usage,
          customerNeed: booking.customer_need,
          managementToken: booking.management_token,
        });
      } catch (emailError) {
        console.error('[validate booking] decline customer email error:', emailError);
      }

      const contact = `
        <div class="contact">
          <p style="font-weight: 700; color: #111827;">CONTACT</p>
          <p>${siteConfig.showroom.lines.join('<br>')}</p>
          <p><a href="${siteConfig.showroom.googleMapsUrl}" target="_blank">Voir le showroom sur Google Maps →</a></p>
        </div>
      `;

      return new NextResponse(
        htmlPage('Rendez-vous refusé', `${commonDetails}<p>La demande de ${booking.customer_name} pour le ${dateLabel} de ${timeLabel} à ${endTimeLabel} a été refusée.</p><p>Le client a été informé et peut choisir un autre créneau.</p>${contact}`, false),
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    return withCors(NextResponse.json({ error: 'Invalid action' }, { status: 400 }), request);
  } catch (error) {
    console.error('[validate booking]', error);
    return withCors(NextResponse.json({ error: 'Failed to process request' }, { status: 500 }), request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;
  return new NextResponse(null, { status: 204 });
}
