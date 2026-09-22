import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { sendBookingConfirmedEmail, sendBookingDeclinedEmail, sendBookingCancelledEmail } from '@/lib/email';
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

function htmlPage(title: string, content: string, success = true, redirectUrl = '') {
  const color = success ? '#10B981' : '#EF4444';
  const redirectMeta = redirectUrl
    ? `<meta http-equiv="refresh" content="3;url=${redirectUrl}">`
    : '';
  const redirectJs = redirectUrl
    ? `<script>setTimeout(function(){ window.location.href = '${redirectUrl}'; }, 3000);</script>`
    : '';
  const redirectHtml = redirectUrl
    ? `<p style="font-size: 13px; color: #6b7280; margin-top: 20px;">Vous allez être redirigé dans 3 secondes. <a href="${redirectUrl}" style="color: #0066CC; text-decoration: none;">Cliquez ici si ça n’ouvre pas.</a></p>`
    : '';
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${redirectMeta}
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
    ${redirectHtml}
  </div>
  ${redirectJs}
</body>
</html>`;
}

function eventHtmlPage(title: string, message: string, details: string, success: boolean, language: 'fr' | 'en', kicker: string, venueHtml: string) {
  const color = success ? '#10B981' : '#0066CC';
  return `<!DOCTYPE html><html lang="${language}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
    *{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;background:radial-gradient(circle at top right,#dbeafe 0,#f8fafc 42%,#eef2f7 100%);color:#0f172a}.card{width:100%;max-width:620px;background:rgba(255,255,255,.96);border-radius:28px;overflow:hidden;box-shadow:0 28px 80px rgba(15,23,42,.16);animation:enter .6s cubic-bezier(.22,1,.36,1)}.head{padding:28px 34px;border-bottom:1px solid #e8edf3}.head img{display:block;width:120px;height:auto}.body{padding:38px 34px}.kicker{margin:0 0 10px;color:#0066cc;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}h1{margin:0 0 16px;font-size:28px;line-height:1.2}p{color:#64748b;line-height:1.65}.icon{display:flex;width:72px;height:72px;margin-bottom:24px;align-items:center;justify-content:center;border-radius:22px;background:${color}14;color:${color};font-size:32px;font-weight:800}.details{margin:26px 0 0;padding:22px;border-radius:18px;background:#f8fafc}.details p{margin:7px 0;color:#334155}.details span{color:#64748b}.venue{margin-top:18px;padding:18px;border-radius:16px;background:#0066cc;color:white;font-size:14px;line-height:1.6}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}.btn{display:inline-flex;padding:13px 18px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700}.btn-primary{background:#0066cc;color:#fff}.btn-outline{background:#eef2f6;color:#064b8e}@keyframes enter{from{opacity:0;transform:translateY(24px) scale(.96)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.card{animation:none}}
  </style></head><body><main class="card"><div class="head"><img src="https://eizo.fr/cdn/shop/files/EIZO-Logo_RGB.png?v=1732704479&amp;width=310" alt="EIZO"></div><div class="body"><div class="icon">${success ? '✓' : '×'}</div><p class="kicker">${kicker}</p><h1>${title}</h1><p>${message}</p>${details}${venueHtml}</div></main></body></html>`;
}

export async function GET(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const action = searchParams.get('action');

    if (!token || !['accept', 'decline', 'cancel'].includes(action || '')) {
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
      .select('name, slug, email, specialty, notification_email, venue_name, venue_location, booth, event_start_date, event_end_date')
      .eq('id', booking.organizer_id)
      .single();

    const isEvent = Boolean(organizer?.event_start_date && organizer?.event_end_date);
    const eventName = organizer?.specialty || 'EIZO';
    const language: 'fr' | 'en' = booking.requested_product?.language === 'en' ? 'en' : 'fr';
    const eventKicker = (() => {
      if (!organizer?.event_start_date || !organizer?.event_end_date) return eventName;
      const locale = language === 'en' ? 'en-GB' : 'fr-FR';
      const start = new Date(`${organizer.event_start_date}T12:00:00`);
      const end = new Date(`${organizer.event_end_date}T12:00:00`);
      const range = start.getMonth() === end.getMonth()
        ? (language === 'en'
          ? `${start.toLocaleDateString(locale, { month: 'long' })} ${start.getDate()}–${end.getDate()}`
          : `${start.getDate()}–${end.getDate()} ${start.toLocaleDateString(locale, { month: 'long' })}`)
        : `${start.toLocaleDateString(locale, { day: 'numeric', month: 'long' })} – ${end.toLocaleDateString(locale, { day: 'numeric', month: 'long' })}`;
      return `${eventName} · ${range}`;
    })();
    const eventVenueHtml = isEvent
      ? `<div class="venue"><strong>${organizer?.venue_name || ''}</strong><br>${[
          organizer?.venue_location,
          organizer?.booth ? `${language === 'en' ? 'Booth' : 'Stand'} ${organizer.booth}` : null,
        ].filter(Boolean).join(' · ')}</div>`
      : '';
    const modification = isEvent ? booking.requested_product?.modification : null;
    const dateLabel = isEvent
      ? new Date(`${booking.date}T12:00:00`).toLocaleDateString(language === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : formatDate(booking.date);
    const timeLabel = formatTime(booking.start_time);
    const endTimeLabel = formatTime(booking.end_time);

    const commonDetails = `
      <div class="details">
        <p><span>${language === 'en' ? 'Customer' : 'Client'} :</span> ${booking.customer_name}</p>
        <p><span>Date :</span> ${dateLabel}</p>
        <p><span>${language === 'en' ? 'Time' : 'Heure'} :</span> ${timeLabel} - ${endTimeLabel}</p>
        <p><span>${language === 'en' ? 'Team' : 'Équipe'} :</span> ${organizer?.name || 'EIZO'}</p>
      </div>
    `;

    const manageUrl = booking.management_token
      ? `${siteConfig.appUrl}/manage/${booking.management_token}`
      : `${siteConfig.appUrl}/booking`;
    const rescheduleUrl = (booking.shop_domain && booking.product_handle)
      ? `https://${booking.shop_domain}/products/${booking.product_handle}`
      : `${siteConfig.appUrl}/booking`;

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

      const calendarTitle = isEvent ? `EIZO at ${eventName} — ${booking.customer_name}` : `Démonstration EIZO ColorEdge — ${booking.customer_name}`;
      const calendarLocation = isEvent
        ? [organizer?.venue_name, organizer?.venue_location, organizer?.hall ? `Hall ${organizer.hall}` : null, organizer?.booth ? `Booth ${organizer.booth}` : null].filter(Boolean).join(', ')
        : siteConfig.showroom.fullAddress;
      const googleUrl = buildGoogleCalendarUrl({
        title: calendarTitle,
        startDate: booking.date,
        startTime: booking.start_time.slice(0, 5),
        endDate: booking.date,
        endTime: booking.end_time.slice(0, 5),
        location: calendarLocation,
        description: [
          `Client : ${booking.customer_name}`,
          `Téléphone : ${booking.customer_phone || ''}`,
          `Email : ${booking.customer_email}`,
          booking.requested_product?.title && `Démonstration : ${booking.requested_product.title}`,
          `${language === 'en' ? 'Location' : 'Lieu'} : ${calendarLocation}`,
        ].filter(Boolean).join('\n'),
      });

      const icsUrl = booking.management_token
        ? `${siteConfig.appUrl}/api/public/calendar/ics?token=${booking.management_token}&role=expert`
        : '';

      const startIso = `${booking.date}T${booking.start_time.slice(0, 5)}`;
      const endIso = `${booking.date}T${booking.end_time.slice(0, 5)}`;
      const outlookUrl = `https://outlook.office.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(calendarTitle)}&startdt=${encodeURIComponent(startIso)}&enddt=${encodeURIComponent(endIso)}&body=${encodeURIComponent(`Client : ${booking.customer_name}\nTéléphone : ${booking.customer_phone || ''}\nEmail : ${booking.customer_email}\n${language === 'en' ? 'Location' : 'Lieu'} : ${calendarLocation}`)}&location=${encodeURIComponent(calendarLocation)}`;

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
          organizerSlug: organizer?.slug,
          language: booking.requested_product?.language === 'en' ? 'en' : 'fr',
          venueName: organizer?.venue_name,
          venueLocation: organizer?.venue_location,
          booth: organizer?.booth,
          isEvent,
          eventName,
          eventStartDate: organizer?.event_start_date,
          eventEndDate: organizer?.event_end_date,
        });
      } catch (emailError) {
        console.error('[validate booking] customer email error:', emailError);
      }

      const actions = `
        <div class="actions">
          <a href="${googleUrl}" target="_blank" class="btn btn-primary">${language === 'en' ? 'Add to Google Calendar' : 'Ajouter à Google Agenda'}</a>
          ${outlookUrl ? `<a href="${outlookUrl}" target="_blank" class="btn btn-outline">${language === 'en' ? 'Add to Outlook' : 'Ajouter à Outlook'}</a>` : ''}
          ${icsUrl ? `<a href="${icsUrl}" class="btn btn-outline">${language === 'en' ? 'Download .ics' : 'Télécharger .ics'}</a>` : ''}
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

      const acceptedTitle = modification
        ? (language === 'en' ? 'Appointment change confirmed' : 'Modification confirmée')
        : (language === 'en' ? 'Appointment confirmed' : 'Rendez-vous confirmé');
      const acceptedMessage = modification
        ? (language === 'en' ? `The appointment change for ${booking.customer_name} has been confirmed. The customer has been notified.` : `La modification du rendez-vous de ${booking.customer_name} est confirmée. Le client a été informé.`)
        : (language === 'en' ? `The ${eventName} appointment with ${booking.customer_name} is confirmed. The customer has been notified.` : `Le rendez-vous ${eventName} avec ${booking.customer_name} est confirmé. Le client a été informé.`);
      return new NextResponse(
        isEvent ? eventHtmlPage(acceptedTitle, acceptedMessage, `${commonDetails}${actions}`, true, language, eventKicker, eventVenueHtml) : htmlPage('Rendez-vous accepté', `${commonDetails}<p>Le rendez-vous avec ${booking.customer_name} est confirmé.</p>${actions}${contact}<p style="font-size: 13px; color: #6b7280; margin-top: 20px;"><a href="${manageUrl}" style="color: #0066CC; text-decoration: none;">Gérer le rendez-vous →</a></p>`, true),
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

      const declineUpdate = modification
        ? {
            status: modification.previousStatus,
            date: modification.previousDate,
            start_time: modification.previousTime,
            end_time: modification.previousEndTime,
            refused_at: null,
          }
        : { status: 'refused', refused_at: new Date().toISOString() };
      const { error: updateError } = await supabase
        .from('bookings')
        .update(declineUpdate)
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
          organizerSlug: organizer?.slug,
          language: booking.requested_product?.language === 'en' ? 'en' : 'fr',
          venueName: organizer?.venue_name,
          venueLocation: organizer?.venue_location,
          booth: organizer?.booth,
          isEvent,
          eventName,
          eventStartDate: organizer?.event_start_date,
          eventEndDate: organizer?.event_end_date,
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

      const declinedTitle = modification
        ? (language === 'en' ? 'Appointment change declined' : 'Modification refusée')
        : (language === 'en' ? 'Request declined' : 'Demande refusée');
      const declinedMessage = modification
        ? (language === 'en' ? `The requested appointment change for ${booking.customer_name} was declined. The original appointment remains confirmed.` : `La modification demandée par ${booking.customer_name} a été refusée. Le rendez-vous initial reste confirmé.`)
        : (language === 'en' ? `The appointment request from ${booking.customer_name} has been declined. The customer has been notified by email.` : `La demande de rendez-vous de ${booking.customer_name} a été refusée. Le client a été informé par email.`);
      return new NextResponse(
        isEvent ? eventHtmlPage(declinedTitle, declinedMessage, commonDetails, false, language, eventKicker, eventVenueHtml) : htmlPage('Rendez-vous refusé', `${commonDetails}<p>La demande de ${booking.customer_name} pour le ${dateLabel} de ${timeLabel} à ${endTimeLabel} a été refusée.</p><p>Le client a été informé et peut choisir un autre créneau.</p>${contact}`, false, manageUrl),
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    if (action === 'cancel') {
      if (booking.status === 'cancelled') {
        return new NextResponse(
          htmlPage('Déjà annulé', `${commonDetails}<p>Ce rendez-vous a déjà été annulé.</p>`, false, manageUrl),
          { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }

      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (updateError) {
        console.error('[validate booking] cancel error:', updateError);
        return withCors(NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 }), request);
      }

      try {
        await sendBookingCancelledEmail({
          customerName: booking.customer_name,
          customerEmail: booking.customer_email,
          customerPhone: booking.customer_phone || undefined,
          date: booking.date,
          time: booking.start_time.slice(0, 5),
          endTime: booking.end_time ? booking.end_time.slice(0, 5) : undefined,
          organizerName: organizer?.name || 'Expert EIZO',
          organizerEmail: organizer?.email || '',
          productTitle: booking.product_title || undefined,
          productHandle: booking.product_handle || undefined,
          shopDomain: booking.shop_domain || undefined,
          requestedProduct: booking.requested_product,
          customerUsage: booking.customer_usage,
          customerNeed: booking.customer_need,
          managementToken: booking.management_token,
          organizerSlug: organizer?.slug,
          language: booking.requested_product?.language === 'en' ? 'en' : 'fr',
          venueName: organizer?.venue_name,
          venueLocation: organizer?.venue_location,
          booth: organizer?.booth,
          isEvent,
          eventName,
          eventStartDate: organizer?.event_start_date,
          eventEndDate: organizer?.event_end_date,
        });
      } catch (emailError) {
        console.error('[validate booking] cancel customer email error:', emailError);
      }

      const cancelledTitle = language === 'en' ? 'Appointment cancelled' : 'Rendez-vous annulé';
      const cancelledMessage = language === 'en'
        ? `The ${eventName} appointment has been cancelled and the customer has been notified.`
        : `Le rendez-vous ${eventName} a bien été annulé et le client a été informé.`;
      return new NextResponse(
        isEvent ? eventHtmlPage(cancelledTitle, cancelledMessage, commonDetails, true, language, eventKicker, eventVenueHtml) : htmlPage('Rendez-vous annulé', `${commonDetails}<p>Le rendez-vous a bien été annulé. Le client en a été informé.</p>`, true, manageUrl),
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
