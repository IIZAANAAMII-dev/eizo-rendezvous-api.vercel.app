import nodemailer from 'nodemailer';
import { siteConfig } from './config';
import { buildGoogleCalendarUrl } from './calendar';

interface RequestedProduct {
  productId?: string;
  title?: string;
  handle?: string;
  url?: string;
}

interface ViewedProduct {
  productId?: string;
  title?: string;
  handle?: string;
  url?: string;
  viewedAt?: number;
}

export interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  date: string;
  time: string;
  endTime?: string;
  organizerName: string;
  organizerEmail: string;
  productTitle?: string;
  productHandle?: string;
  shopDomain?: string;
  notes?: string;
  requestedProduct?: RequestedProduct | null;
  productsViewed?: ViewedProduct[] | null;
  customerNeed?: string | null;
  customerUsage?: string | null;
  confirmationUrl?: string;
  declineUrl?: string;
  cancelUrl?: string;
  managementToken?: string;
  organizerSlug?: string;
  language?: 'fr' | 'en';
  venueName?: string;
  venueLocation?: string;
  booth?: string;
}

const accentBlue = siteConfig.brand.color;

function escapeHtml(value: string | undefined | null): string {
  if (!value) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function detailRow(label: string, value: string): string {
  if (!value) return '';
  return `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top; white-space: nowrap;">${escapeHtml(label)}</td><td style="padding: 8px 0 8px 16px; color: #111827; font-size: 14px; font-weight: 500;">${value}</td></tr>`;
}

function productLink(product: { title?: string; url?: string; handle?: string } | null | undefined): string {
  if (!product) return '';
  const title = escapeHtml(product.title || product.handle || 'Produit');
  if (product.url) {
    return `<a href="${escapeHtml(product.url)}" style="color: #0066CC; text-decoration: none;">${title}</a>`;
  }
  return title;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(start: string, end?: string): string {
  const s = start.slice(0, 5);
  if (!end) return s;
  return `${s} - ${end.slice(0, 5)}`;
}

function buildGoogleLink(data: BookingEmailData): string {
  const startTime = data.time.length === 5 ? `${data.time}:00` : data.time;
  const endTime = data.endTime || startTime;
  const title = `Démonstration EIZO ColorEdge — ${data.customerName}`;
  const description = [
    `Client : ${data.customerName}`,
    data.customerPhone && `Téléphone : ${data.customerPhone}`,
    `Email : ${data.customerEmail}`,
    data.requestedProduct?.title && `Démonstration : ${data.requestedProduct.title}`,
    data.customerUsage && `Utilisation : ${data.customerUsage}`,
    data.notes && `Message : ${data.notes}`,
    `Lieu : ${siteConfig.showroom.fullAddress}`,
  ].filter(Boolean).join('\n');

  return buildGoogleCalendarUrl({
    title,
    startDate: data.date,
    startTime,
    endDate: data.date,
    endTime,
    location: siteConfig.showroom.fullAddress,
    description,
  });
}

function contactBlock(): string {
  const phone = siteConfig.contact.phone;
  const email = siteConfig.contact.email;

  return `
    <div style="margin-top: 28px; padding: 20px; background: #f6f8fb; border-radius: 12px; border-left: 4px solid ${accentBlue};">
      <p style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #0B1220; text-transform: uppercase; letter-spacing: 0.4px;">CONTACT</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #4b5563;">Une question concernant votre rendez-vous ?</p>
      ${phone ? `<p style="margin: 0 0 4px; font-size: 14px; color: #111827;">Téléphone : <a href="tel:${escapeHtml(phone)}" style="color: #0066CC; text-decoration: none;">${escapeHtml(phone)}</a></p>` : ''}
      ${email ? `<p style="margin: 0 0 4px; font-size: 14px; color: #111827;">Email : <a href="mailto:${escapeHtml(email)}" style="color: #0066CC; text-decoration: none;">${escapeHtml(email)}</a></p>` : ''}
      <p style="margin: 12px 0 0; font-size: 14px; font-weight: 600; color: #0B1220;">${escapeHtml(siteConfig.showroom.name)}</p>
      <p style="margin: 2px 0 0; font-size: 13px; color: #6b7280;">${siteConfig.showroom.lines.map(escapeHtml).join('<br>')}</p>
      <p style="margin: 10px 0 0;">
        <a href="${siteConfig.showroom.googleMapsUrl}" style="display: inline-block; color: #0066CC; text-decoration: none; font-weight: 600; font-size: 13px;">Voir le showroom sur Google Maps →</a>
      </p>
    </div>
  `;
}

function emailWrapper(content: string, accentColor = accentBlue): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6f8fb; padding: 40px 16px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
        <div style="background: ${accentColor}; padding: 28px 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.3px;">EIZO ColorEdge</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">Rendez-vous personnalisé</p>
        </div>
        <div style="padding: 32px;">
          ${content}
        </div>
      </div>
    </div>
  `;
}

function buildCustomerRequestBody(data: BookingEmailData): string {
  const productInfo = data.requestedProduct?.title
    ? detailRow('Démonstration souhaitée', productLink(data.requestedProduct))
    : (data.productTitle ? detailRow('Produit consulté', escapeHtml(data.productTitle)) : '');
  const usage = data.customerUsage ? detailRow('Utilisation', escapeHtml(data.customerUsage)) : '';
  const need = data.customerNeed ? `<tr><td colspan="2" style="padding-top: 12px; color: #6b7280; font-size: 14px;"><em>"${escapeHtml(data.customerNeed)}"</em></td></tr>` : '';
  const phone = data.customerPhone ? detailRow('Téléphone', escapeHtml(data.customerPhone)) : '';
  const note = data.notes ? `<tr><td colspan="2" style="padding-top: 12px; color: #6b7280; font-size: 14px;"><em>"${escapeHtml(data.notes)}"</em></td></tr>` : '';
  const location = detailRow('Lieu', siteConfig.showroom.lines.join(' · '));

  const body = `
    <p style="font-size: 16px; color: #111827; margin: 0 0 24px;">Bonjour ${escapeHtml(data.customerName)},</p>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">Votre demande de rendez-vous a bien été enregistrée. Elle est en attente de validation par notre équipe.</p>
    <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 12px; padding: 20px; display: table;">
      ${detailRow('Expert', escapeHtml(data.organizerName))}
      ${detailRow('Date', formatDate(data.date))}
      ${detailRow('Heure', formatTime(data.time, data.endTime))}
      ${productInfo}
      ${usage}
      ${need}
      ${phone}
      ${location}
      ${note}
    </table>
    <p style="font-size: 13px; color: #6b7280; margin: 24px 0 0;">Vous recevrez un nouvel email dès que le rendez-vous sera confirmé.</p>
    ${contactBlock()}
  `;
  return emailWrapper(body);
}

function buildCustomerConfirmedBody(data: BookingEmailData): string {
  const productInfo = data.requestedProduct?.title
    ? detailRow('Démonstration souhaitée', productLink(data.requestedProduct))
    : (data.productTitle ? detailRow('Produit consulté', escapeHtml(data.productTitle)) : '');
  const usage = data.customerUsage ? detailRow('Utilisation', escapeHtml(data.customerUsage)) : '';
  const need = data.customerNeed ? `<tr><td colspan="2" style="padding-top: 12px; color: #6b7280; font-size: 14px;"><em>"${escapeHtml(data.customerNeed)}"</em></td></tr>` : '';
  const note = data.notes ? `<tr><td colspan="2" style="padding-top: 12px; color: #6b7280; font-size: 14px;"><em>"${escapeHtml(data.notes)}"</em></td></tr>` : '';
  const location = detailRow('Lieu', siteConfig.showroom.lines.join(' · '));

  const googleUrl = buildGoogleLink(data);
  const icsUrl = data.managementToken
    ? `${siteConfig.appUrl}/api/public/calendar/ics?token=${data.managementToken}&role=client`
    : '';
  const manageUrl = data.managementToken
    ? `${siteConfig.appUrl}/manage/${data.managementToken}`
    : '';

  const body = `
    <p style="font-size: 16px; color: #111827; margin: 0 0 24px;">Bonjour ${escapeHtml(data.customerName)},</p>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">Votre rendez-vous de démonstration EIZO ColorEdge est confirmé.</p>
    <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 12px; padding: 20px; display: table;">
      ${detailRow('Expert', escapeHtml(data.organizerName))}
      ${detailRow('Date', formatDate(data.date))}
      ${detailRow('Heure', formatTime(data.time, data.endTime))}
      ${productInfo}
      ${usage}
      ${need}
      ${location}
      ${note}
    </table>
    <div style="margin: 24px 0; text-align: center;">
      <a href="${googleUrl}" target="_blank" style="display: inline-block; background: #10B981; color: #fff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 0 6px 8px;">Ajouter à Google Agenda</a>
      ${icsUrl ? `<a href="${icsUrl}" style="display: inline-block; background: #ffffff; color: #10B981; border: 2px solid #10B981; padding: 12px 26px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 0 6px 8px;">Ajouter à Outlook (.ics)</a>` : ''}
    </div>
    ${manageUrl ? `<p style="font-size: 13px; color: #6b7280; margin: 8px 0 0;"><a href="${manageUrl}" style="color: #0066CC; text-decoration: none; font-weight: 600;">Gérer mon rendez-vous</a></p>` : ''}
    ${contactBlock()}
  `;
  return emailWrapper(body, '#10B981');
}

function buildBookingDeclinedBody(data: BookingEmailData): string {
  const manageUrl = data.managementToken
    ? `${siteConfig.appUrl}/manage/${data.managementToken}`
    : '';

  const rescheduleUrl = data.shopDomain && data.productHandle
    ? `https://${data.shopDomain}/products/${data.productHandle}`
    : `${siteConfig.appUrl}/booking/coloredge`;

  const body = `
    <p style="font-size: 16px; color: #111827; margin: 0 0 24px;">Bonjour ${escapeHtml(data.customerName)},</p>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">Malheureusement, le créneau demandé pour votre démonstration EIZO ColorEdge le <strong>${formatDate(data.date)}</strong> de <strong>${formatTime(data.time, data.endTime)}</strong> n'est plus disponible.</p>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">Nous vous invitons à choisir un autre créneau avec notre expert EIZO.</p>
    <div style="margin: 24px 0; text-align: center;">
      <a href="${rescheduleUrl}" style="display: inline-block; background: #0066CC; color: #fff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600;">Choisir un autre créneau</a>
    </div>
    ${manageUrl ? `<p style="font-size: 13px; color: #6b7280; margin: 8px 0 0; text-align: center;"><a href="${manageUrl}" style="color: #0066CC; text-decoration: none; font-weight: 600;">Gérer mes rendez-vous</a></p>` : ''}
    ${contactBlock()}
  `;
  return emailWrapper(body, '#EF4444');
}

function buildOrganizerEmailBody(data: BookingEmailData): string {
  const productRequested = data.requestedProduct?.title
    ? detailRow('Démonstration souhaitée', productLink(data.requestedProduct))
    : (data.productTitle ? detailRow('Démonstration souhaitée', escapeHtml(data.productTitle)) : '');
  const usage = data.customerUsage ? detailRow('Utilisation', escapeHtml(data.customerUsage)) : '';
  const need = data.customerNeed
    ? `<tr><td colspan="2" style="padding-top: 12px; color: #6b7280; font-size: 14px;"><em>"${escapeHtml(data.customerNeed)}"</em></td></tr>`
    : '';
  const viewedProductsList = (() => {
    if (!data.productsViewed || !data.productsViewed.length) return [] as { product: ViewedProduct; count: number; lastViewedAt: number }[];
    const counts = new Map<string, { product: ViewedProduct; count: number; lastViewedAt: number }>();
    for (const p of data.productsViewed) {
      const handle = p.handle || 'inconnu';
      const existing = counts.get(handle);
      const viewedAt = typeof p.viewedAt === 'number' ? p.viewedAt : 0;
      if (!existing || viewedAt > existing.lastViewedAt) {
        counts.set(handle, { product: p, count: (existing?.count || 0) + 1, lastViewedAt: viewedAt });
      } else {
        existing.count += 1;
      }
    }
    const requestedHandle = data.requestedProduct?.handle;
    return Array.from(counts.values())
      .sort((a, b) => {
        if (a.product.handle === requestedHandle) return -1;
        if (b.product.handle === requestedHandle) return 1;
        if (b.count !== a.count) return b.count - a.count;
        return b.lastViewedAt - a.lastViewedAt;
      });
  })();

  const viewedProducts = viewedProductsList.length
    ? `<tr><td colspan="2" style="padding-top: 16px;">
         <p style="font-size: 13px; font-weight: 700; color: #111827; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.4px;">Produits ColorEdge consultés avant la demande</p>
         <ul style="margin: 0; padding-left: 18px; color: #4b5563; font-size: 14px; line-height: 1.6;">
           ${viewedProductsList.map(({ product, count }) => {
             const word = count === 1 ? 'consultation' : 'consultations';
             return `<li style="margin-bottom: 4px;">${productLink(product)} — ${count} ${word}</li>`;
           }).join('')}
         </ul>
       </td></tr>`
    : '';
  const note = data.notes ? `<tr><td colspan="2" style="padding-top: 12px; color: #6b7280; font-size: 14px;"><em>"${escapeHtml(data.notes)}"</em></td></tr>` : '';
  const actions = (data.confirmationUrl && data.declineUrl)
    ? `<div style="margin-top: 28px; text-align: center;">
        <a href="${escapeHtml(data.confirmationUrl)}" style="display: inline-block; background: #10B981; color: #fff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 0 6px 8px;">Accepter le rendez-vous</a>
        <a href="${escapeHtml(data.declineUrl)}" style="display: inline-block; background: #ffffff; color: #EF4444; border: 2px solid #EF4444; padding: 12px 26px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 0 6px 8px;">Refuser</a>
        ${data.cancelUrl ? `<a href="${escapeHtml(data.cancelUrl)}" style="display: inline-block; background: #ffffff; color: #6B7280; border: 2px solid #6B7280; padding: 12px 26px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 0 6px 8px;">Annuler</a>` : ''}
      </div>`
    : '';

  const body = `
    <p style="font-size: 16px; color: #111827; margin: 0 0 20px;">Bonjour,</p>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">Une nouvelle demande de démonstration EIZO est à valider.</p>
    <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 12px; padding: 20px; display: table; margin-bottom: 8px;">
      ${detailRow('Client', escapeHtml(data.customerName))}
      ${detailRow('Email', `<a href="mailto:${escapeHtml(data.customerEmail)}" style="color: #0066CC; text-decoration: none;">${escapeHtml(data.customerEmail)}</a>`)}
      ${data.customerPhone ? detailRow('Téléphone', `<a href="tel:${escapeHtml(data.customerPhone)}" style="color: #0066CC; text-decoration: none;">${escapeHtml(data.customerPhone)}</a>`) : ''}
      ${detailRow('Date', formatDate(data.date))}
      ${detailRow('Heure', formatTime(data.time, data.endTime))}
      ${detailRow('Expert', escapeHtml(data.organizerName))}
      ${productRequested}
      ${usage}
      ${need}
      ${viewedProducts}
      ${note}
    </table>
    <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px;">Cliquez sur <strong>Accepter</strong> pour confirmer. Le client recevra alors un email de confirmation.</p>
    ${actions}
  `;
  return emailWrapper(body);
}

type IbcEmailKind = 'request' | 'confirmed' | 'declined' | 'cancelled' | 'organizer' | 'organizer-cancelled';

function isIbcBooking(data: BookingEmailData): boolean {
  return data.organizerSlug === 'ibc-2026';
}

function buildIbcEmail(data: BookingEmailData, kind: IbcEmailKind): string {
  const en = data.language === 'en';
  const venue = `${data.venueName || 'RAI Amsterdam'} · ${data.venueLocation || 'Amsterdam, the Netherlands'} · ${en ? 'Booth' : 'Stand'} ${data.booth || '7.D33'}`;
  const date = new Date(`${data.date}T12:00:00`).toLocaleDateString(en ? 'en-GB' : 'fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const messages: Record<IbcEmailKind, { title: string; intro: string; status: string }> = en ? {
    request: { title: 'Appointment request received', intro: `Hello ${escapeHtml(data.customerName)}, your appointment request for IBC 2026 has been received.`, status: 'Our EIZO team will confirm your appointment shortly.' },
    confirmed: { title: 'Your IBC 2026 appointment is confirmed', intro: `Hello ${escapeHtml(data.customerName)}, your appointment with the EIZO team is confirmed.`, status: 'We look forward to welcoming you at IBC 2026.' },
    declined: { title: 'IBC 2026 appointment update', intro: `Hello ${escapeHtml(data.customerName)}, unfortunately the requested time is no longer available.`, status: 'Please contact our team if you need assistance.' },
    cancelled: { title: 'Your IBC 2026 appointment has been cancelled', intro: `Hello ${escapeHtml(data.customerName)}, your appointment has been cancelled.`, status: 'We hope to see you at another time during IBC 2026.' },
    organizer: { title: 'New IBC 2026 appointment request', intro: `A new appointment request has been submitted by ${escapeHtml(data.customerName)}.`, status: 'Use the actions below to accept or decline this request.' },
    'organizer-cancelled': { title: 'IBC 2026 appointment cancelled', intro: `${escapeHtml(data.customerName)} has cancelled their appointment.`, status: 'This time is now available again.' },
  } : {
    request: { title: 'Demande de rendez-vous reçue', intro: `Bonjour ${escapeHtml(data.customerName)}, votre demande de rendez-vous pour IBC 2026 a bien été reçue.`, status: 'Notre équipe EIZO confirmera prochainement votre rendez-vous.' },
    confirmed: { title: 'Votre rendez-vous IBC 2026 est confirmé', intro: `Bonjour ${escapeHtml(data.customerName)}, votre rendez-vous avec l’équipe EIZO est confirmé.`, status: 'Nous avons hâte de vous accueillir à IBC 2026.' },
    declined: { title: 'Mise à jour de votre rendez-vous IBC 2026', intro: `Bonjour ${escapeHtml(data.customerName)}, le créneau demandé n’est malheureusement plus disponible.`, status: 'Contactez notre équipe si vous avez besoin d’aide.' },
    cancelled: { title: 'Votre rendez-vous IBC 2026 a été annulé', intro: `Bonjour ${escapeHtml(data.customerName)}, votre rendez-vous a bien été annulé.`, status: 'Nous espérons vous rencontrer à un autre moment pendant IBC 2026.' },
    organizer: { title: 'Nouvelle demande de rendez-vous IBC 2026', intro: `${escapeHtml(data.customerName)} vient d’envoyer une nouvelle demande de rendez-vous.`, status: 'Utilisez les actions ci-dessous pour accepter ou refuser cette demande.' },
    'organizer-cancelled': { title: 'Rendez-vous IBC 2026 annulé', intro: `${escapeHtml(data.customerName)} a annulé son rendez-vous.`, status: 'Ce créneau est de nouveau disponible.' },
  };
  const message = messages[kind];
  let actions = '';
  if (kind === 'organizer' && data.confirmationUrl && data.declineUrl) {
    actions = `<div style="margin:28px 0 8px;text-align:center;"><a href="${escapeHtml(data.confirmationUrl)}" style="display:inline-block;margin:4px;background:#0066CC;color:#fff;padding:13px 22px;border-radius:9px;text-decoration:none;font-weight:700;">${en ? 'Accept' : 'Accepter'}</a><a href="${escapeHtml(data.declineUrl)}" style="display:inline-block;margin:4px;background:#eef2f6;color:#344054;padding:13px 22px;border-radius:9px;text-decoration:none;font-weight:700;">${en ? 'Decline' : 'Refuser'}</a></div>`;
  }
  if (kind === 'confirmed' && data.managementToken) {
    const location = `${data.venueName || 'RAI Amsterdam'}, ${data.venueLocation || 'Amsterdam, the Netherlands'}, ${en ? 'Booth' : 'Stand'} ${data.booth || '7.D33'}`;
    const googleUrl = buildGoogleCalendarUrl({ title: `EIZO at IBC 2026 — ${data.customerName}`, startDate: data.date, startTime: data.time, endDate: data.date, endTime: data.endTime || data.time, location, description: `${en ? 'Appointment with the EIZO team at IBC 2026' : 'Rendez-vous avec l’équipe EIZO à IBC 2026'}\n${location}` });
    const icsUrl = `${siteConfig.appUrl}/api/public/calendar/ics?token=${data.managementToken}&role=client`;
    const manageUrl = `${siteConfig.appUrl}/manage/${data.managementToken}`;
    actions = `<div style="margin:28px 0 8px;text-align:center;"><a href="${googleUrl}" style="display:inline-block;margin:4px;background:#0066CC;color:#fff;padding:13px 22px;border-radius:9px;text-decoration:none;font-weight:700;">${en ? 'Add to Google Calendar' : 'Ajouter à Google Agenda'}</a><a href="${icsUrl}" style="display:inline-block;margin:4px;background:#eef2f6;color:#064b8e;padding:13px 22px;border-radius:9px;text-decoration:none;font-weight:700;">${en ? 'Add to Outlook (.ics)' : 'Ajouter à Outlook (.ics)'}</a></div><p style="text-align:center;margin:18px 0 0;"><a href="${manageUrl}" style="color:#0066CC;font-weight:700;text-decoration:none;">${en ? 'Change or cancel my appointment' : 'Modifier ou annuler mon rendez-vous'}</a></p>`;
  }

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f2f5f9;padding:40px 16px;">
    <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,.08);">
      <div style="padding:28px 32px;border-bottom:1px solid #e6ebf1;">
        <img src="https://eizo.fr/cdn/shop/files/EIZO-Logo_RGB.png?v=1732704479&amp;width=310" alt="EIZO" style="display:block;width:120px;height:auto;">
      </div>
      <div style="padding:34px 32px;">
        <p style="margin:0 0 8px;color:#0066CC;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">IBC 2026 · September 11–14</p>
        <h1 style="margin:0 0 18px;color:#101828;font-size:26px;line-height:1.25;">${message.title}</h1>
        <p style="margin:0 0 26px;color:#475467;font-size:15px;line-height:1.65;">${message.intro}</p>
        <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;padding:18px;display:table;">
          ${detailRow(en ? 'Date' : 'Date', escapeHtml(date))}
          ${detailRow(en ? 'Time' : 'Heure', escapeHtml(formatTime(data.time, data.endTime)))}
          ${detailRow(en ? 'Location' : 'Lieu', escapeHtml(venue))}
          ${kind.startsWith('organizer') ? detailRow(en ? 'Customer' : 'Client', escapeHtml(data.customerName)) : ''}
          ${kind.startsWith('organizer') ? detailRow('Email', `<a href="mailto:${escapeHtml(data.customerEmail)}" style="color:#0066CC;text-decoration:none;">${escapeHtml(data.customerEmail)}</a>`) : ''}
          ${data.customerPhone ? detailRow(en ? 'Phone' : 'Téléphone', escapeHtml(data.customerPhone)) : ''}
          ${data.notes ? detailRow(en ? 'Notes' : 'Notes', escapeHtml(data.notes)) : ''}
        </table>
        ${actions}
        <p style="margin:24px 0 0;color:#667085;font-size:13px;line-height:1.55;">${message.status}</p>
      </div>
    </div>
  </div>`;
}

function ibcSubject(data: BookingEmailData, kind: IbcEmailKind): string {
  const en = data.language === 'en';
  const subjects: Record<IbcEmailKind, string> = en ? {
    request: 'Your IBC 2026 appointment request has been received',
    confirmed: 'Your IBC 2026 appointment is confirmed',
    declined: 'Update regarding your IBC 2026 appointment',
    cancelled: 'Your IBC 2026 appointment has been cancelled',
    organizer: `New IBC 2026 appointment request — ${data.customerName}`,
    'organizer-cancelled': `IBC 2026 appointment cancelled — ${data.customerName}`,
  } : {
    request: 'Votre demande de rendez-vous IBC 2026 a bien été reçue',
    confirmed: 'Votre rendez-vous IBC 2026 est confirmé',
    declined: 'Mise à jour de votre rendez-vous IBC 2026',
    cancelled: 'Votre rendez-vous IBC 2026 a été annulé',
    organizer: `Nouvelle demande de rendez-vous IBC 2026 — ${data.customerName}`,
    'organizer-cancelled': `Rendez-vous IBC 2026 annulé — ${data.customerName}`,
  };
  return subjects[kind];
}

export async function sendConfirmationEmail(data: BookingEmailData): Promise<void> {
  if (isIbcBooking(data)) {
    await sendEmail({ to: data.customerEmail, from: siteConfig.emailFrom, subject: ibcSubject(data, 'request'), html: buildIbcEmail(data, 'request') });
    return;
  }
  const subject = `Votre demande de rendez-vous avec ${data.organizerName} a bien été reçue`;
  await sendEmail({
    to: data.customerEmail,
    from: siteConfig.emailFrom,
    subject,
    html: buildCustomerRequestBody(data),
  });
}

export async function sendBookingConfirmedEmail(data: BookingEmailData): Promise<void> {
  if (isIbcBooking(data)) {
    await sendEmail({ to: data.customerEmail, from: siteConfig.emailFrom, subject: ibcSubject(data, 'confirmed'), html: buildIbcEmail(data, 'confirmed') });
    return;
  }
  const subject = `Votre rendez-vous EIZO ColorEdge est confirmé`;
  await sendEmail({
    to: data.customerEmail,
    from: siteConfig.emailFrom,
    subject,
    html: buildCustomerConfirmedBody(data),
  });
}

export async function sendBookingDeclinedEmail(data: BookingEmailData): Promise<void> {
  if (isIbcBooking(data)) {
    await sendEmail({ to: data.customerEmail, from: siteConfig.emailFrom, subject: ibcSubject(data, 'declined'), html: buildIbcEmail(data, 'declined') });
    return;
  }
  const subject = `Votre rendez-vous EIZO ColorEdge — créneau indisponible`;
  await sendEmail({
    to: data.customerEmail,
    from: siteConfig.emailFrom,
    subject,
    html: buildBookingDeclinedBody(data),
  });
}

export async function sendOrganizerNotification(data: BookingEmailData): Promise<void> {
  if (isIbcBooking(data)) {
    await sendEmail({ to: data.organizerEmail, from: siteConfig.emailFrom, subject: ibcSubject(data, 'organizer'), html: buildIbcEmail(data, 'organizer') });
    return;
  }
  const subject = `Nouvelle demande de démonstration EIZO — ${data.customerName} — ${data.date} à ${data.time}`;
  await sendEmail({
    to: data.organizerEmail,
    from: siteConfig.emailFrom,
    subject,
    html: buildOrganizerEmailBody(data),
  });
}

function buildBookingCancelledBody(data: BookingEmailData): string {
  const rescheduleUrl = data.shopDomain && data.productHandle
    ? `https://${data.shopDomain}/products/${data.productHandle}`
    : `${siteConfig.appUrl}/booking/coloredge`;

  const body = `
    <p style="font-size: 16px; color: #111827; margin: 0 0 24px;">Bonjour ${escapeHtml(data.customerName)},</p>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">Votre rendez-vous EIZO ColorEdge du <strong>${formatDate(data.date)}</strong> de <strong>${formatTime(data.time, data.endTime)}</strong> a bien été annulé.</p>
    <div style="margin: 24px 0; text-align: center;">
      <a href="${rescheduleUrl}" style="display: inline-block; background: #0066CC; color: #fff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600;">Choisir un autre créneau</a>
    </div>
    ${contactBlock()}
  `;
  return emailWrapper(body, '#6B7280');
}

function buildOrganizerCancelledBody(data: BookingEmailData): string {
  const productInfo = data.requestedProduct?.title
    ? detailRow('Démonstration souhaitée', productLink(data.requestedProduct))
    : (data.productTitle ? detailRow('Produit consulté', escapeHtml(data.productTitle)) : '');

  const body = `
    <p style="font-size: 16px; color: #111827; margin: 0 0 20px;">Bonjour,</p>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">Le client a annulé son rendez-vous EIZO ColorEdge.</p>
    <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 12px; padding: 20px; display: table; margin-bottom: 8px;">
      ${detailRow('Client', escapeHtml(data.customerName))}
      ${detailRow('Email', `<a href="mailto:${escapeHtml(data.customerEmail)}" style="color: #0066CC; text-decoration: none;">${escapeHtml(data.customerEmail)}</a>`)}
      ${data.customerPhone ? detailRow('Téléphone', `<a href="tel:${escapeHtml(data.customerPhone)}" style="color: #0066CC; text-decoration: none;">${escapeHtml(data.customerPhone)}</a>`) : ''}
      ${detailRow('Date', formatDate(data.date))}
      ${detailRow('Heure', formatTime(data.time, data.endTime))}
      ${productInfo}
    </table>
    <p style="font-size: 13px; color: #6b7280; margin: 8px 0 0;">Ce créneau est de nouveau disponible.</p>
  `;
  return emailWrapper(body, '#6B7280');
}

export async function sendBookingCancelledEmail(data: BookingEmailData): Promise<void> {
  if (isIbcBooking(data)) {
    await sendEmail({ to: data.customerEmail, from: siteConfig.emailFrom, subject: ibcSubject(data, 'cancelled'), html: buildIbcEmail(data, 'cancelled') });
    return;
  }
  const subject = `Votre rendez-vous EIZO ColorEdge a été annulé`;
  await sendEmail({
    to: data.customerEmail,
    from: siteConfig.emailFrom,
    subject,
    html: buildBookingCancelledBody(data),
  });
}

export async function sendOrganizerCancellationNotification(data: BookingEmailData): Promise<void> {
  if (isIbcBooking(data)) {
    await sendEmail({ to: data.organizerEmail, from: siteConfig.emailFrom, subject: ibcSubject(data, 'organizer-cancelled'), html: buildIbcEmail(data, 'organizer-cancelled') });
    return;
  }
  const subject = `Annulation de rendez-vous EIZO ColorEdge — ${data.customerName} — ${data.date} à ${data.time}`;
  await sendEmail({
    to: data.organizerEmail,
    from: siteConfig.emailFrom,
    subject,
    html: buildOrganizerCancelledBody(data),
  });
}

interface SendEmailPayload {
  to: string;
  from: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: SendEmailPayload): Promise<void> {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return sendWithSmtp(payload);
  }

  if (process.env.RESEND_API_KEY) {
    return sendWithResend(payload);
  }

  if (process.env.SENDGRID_API_KEY) {
    return sendWithSendgrid(payload);
  }

  console.warn('[email] No email provider configured. Skipping email send.');
}

async function sendWithSmtp(payload: SendEmailPayload): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: (process.env.SMTP_PORT || '587') === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: { ciphers: 'SSLv3' },
    requireTLS: true,
  });

  const senderName = payload.subject.includes('IBC 2026') ? 'EIZO Events' : 'EIZO ColorEdge';
  await transporter.sendMail({
    from: { name: senderName, address: process.env.SMTP_USER || payload.from },
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    replyTo: payload.from,
  });
}

async function sendWithResend(payload: SendEmailPayload): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend error: ${error}`);
  }
}

async function sendWithSendgrid(payload: SendEmailPayload): Promise<void> {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: payload.to }] }],
      from: { email: payload.from, name: payload.subject.includes('IBC 2026') ? 'EIZO Events' : 'EIZO ColorEdge' },
      subject: payload.subject,
      content: [{ type: 'text/html', value: payload.html }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sendgrid error: ${error}`);
  }
}
