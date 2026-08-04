import nodemailer from 'nodemailer';

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
  confirmationUrl?: string;
  declineUrl?: string;
}

export async function sendConfirmationEmail(data: BookingEmailData): Promise<void> {
  const subject = `Votre demande de rendez-vous avec ${data.organizerName} a bien été reçue`;
  const body = buildCustomerRequestBody(data);
  
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'rendez-vous@eizo.fr';
  await sendEmail({
    to: data.customerEmail,
    from,
    subject,
    html: body,
  });
}

export async function sendBookingConfirmedEmail(data: BookingEmailData): Promise<void> {
  const subject = `Votre rendez-vous avec ${data.organizerName} est confirmé`;
  const body = buildCustomerEmailBody(data);
  
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'rendez-vous@eizo.fr';
  await sendEmail({
    to: data.customerEmail,
    from,
    subject,
    html: body,
  });
}

export async function sendOrganizerNotification(data: BookingEmailData): Promise<void> {
  const subject = `Nouveau rendez-vous - ${data.customerName} - ${data.date} à ${data.time}`;
  const body = buildOrganizerEmailBody(data);
  
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'rendez-vous@eizo.fr';
  await sendEmail({
    to: data.organizerEmail,
    from,
    subject,
    html: body,
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

  await transporter.sendMail({
    from: process.env.SMTP_USER || payload.from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
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
      from: { email: payload.from },
      subject: payload.subject,
      content: [{ type: 'text/html', value: payload.html }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sendgrid error: ${error}`);
  }
}

function emailWrapper(content: string, accentColor = '#0066CC'): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6f8fb; padding: 40px 16px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
        <div style="background: ${accentColor}; padding: 28px 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.3px;">ColorEdge</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">Rendez-vous avec Fred ROL</p>
        </div>
        <div style="padding: 32px;">
          ${content}
        </div>
        <div style="background: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #e3e8ef;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">EIZO / Feeder · 12 rue Paul Dautier, 78140 Vélizy-Villacoublay</p>
        </div>
      </div>
    </div>
  `;
}

function detailRow(label: string, value: string): string {
  if (!value) return '';
  return `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top; white-space: nowrap;">${label}</td><td style="padding: 8px 0 8px 16px; color: #111827; font-size: 14px; font-weight: 500;">${value}</td></tr>`;
}

function buildCustomerRequestBody(data: BookingEmailData): string {
  const productInfo = data.productTitle ? detailRow('Produit consulté', data.productTitle) : '';
  const shop = data.shopDomain ? detailRow('Boutique', data.shopDomain) : '';
  const phone = data.customerPhone ? detailRow('Téléphone', data.customerPhone) : '';
  const note = data.notes ? `<tr><td colspan="2" style="padding-top: 12px; color: #6b7280; font-size: 14px;"><em>"${data.notes}"</em></td></tr>` : '';

  const body = `
    <p style="font-size: 16px; color: #111827; margin: 0 0 24px;">Bonjour ${data.customerName},</p>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">Votre demande de rendez-vous a bien été enregistrée. Elle est en attente de validation par notre équipe.</p>
    <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 12px; padding: 20px; display: table;">
      ${detailRow('Expert', data.organizerName)}
      ${detailRow('Date', formatDate(data.date))}
      ${detailRow('Heure', formatTime(data.time, data.endTime))}
      ${productInfo}
      ${shop}
      ${phone}
      ${note}
    </table>
    <p style="font-size: 13px; color: #6b7280; margin: 24px 0 0;">Vous recevrez un nouvel email dès que le rendez-vous sera confirmé.</p>
  `;
  return emailWrapper(body);
}

function buildCustomerEmailBody(data: BookingEmailData): string {
  const productInfo = data.productTitle ? detailRow('Produit consulté', data.productTitle) : '';
  const phone = data.customerPhone ? detailRow('Téléphone', data.customerPhone) : '';
  const note = data.notes ? `<tr><td colspan="2" style="padding-top: 12px; color: #6b7280; font-size: 14px;"><em>"${data.notes}"</em></td></tr>` : '';

  const body = `
    <p style="font-size: 16px; color: #111827; margin: 0 0 24px;">Bonjour ${data.customerName},</p>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">Votre rendez-vous est confirmé. Voici les détails :</p>
    <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 12px; padding: 20px; display: table;">
      ${detailRow('Expert', data.organizerName)}
      ${detailRow('Date', formatDate(data.date))}
      ${detailRow('Heure', formatTime(data.time, data.endTime))}
      ${productInfo}
      ${phone}
      ${note}
    </table>
    <p style="font-size: 13px; color: #6b7280; margin: 24px 0 0;">Au plaisir de vous accueillir. N’hésitez pas à nous contacter si vous avez des questions.</p>
  `;
  return emailWrapper(body, '#10B981');
}

function buildOrganizerEmailBody(data: BookingEmailData): string {
  const productInfo = data.productTitle ? detailRow('Produit consulté', data.productTitle) : '';
  const shop = data.shopDomain ? detailRow('Boutique', data.shopDomain) : '';
  const phone = data.customerPhone ? detailRow('Téléphone', data.customerPhone) : '';
  const note = data.notes ? `<tr><td colspan="2" style="padding-top: 12px; color: #6b7280; font-size: 14px;"><em>"${data.notes}"</em></td></tr>` : '';
  const actions = (data.confirmationUrl && data.declineUrl)
    ? `<div style="margin-top: 28px; text-align: center;">
         <a href="${data.confirmationUrl}" style="display: inline-block; background: #10B981; color: #fff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 0 6px 8px;">Accepter le rendez-vous</a>
         <a href="${data.declineUrl}" style="display: inline-block; background: #ffffff; color: #EF4444; border: 2px solid #EF4444; padding: 12px 26px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 0 6px 8px;">Refuser</a>
       </div>`
    : '';

  const body = `
    <p style="font-size: 16px; color: #111827; margin: 0 0 20px;">Bonjour Fred,</p>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">Une nouvelle demande de rendez-vous est à valider.</p>
    <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 12px; padding: 20px; display: table; margin-bottom: 8px;">
      ${detailRow('Client', data.customerName)}
      ${detailRow('Email', `<a href="mailto:${data.customerEmail}" style="color: #0066CC;">${data.customerEmail}</a>`)}
      ${phone}
      ${detailRow('Date', formatDate(data.date))}
      ${detailRow('Heure', formatTime(data.time, data.endTime))}
      ${productInfo}
      ${shop}
      ${note}
    </table>
    <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px;">Cliquez sur <strong>Accepter</strong> pour confirmer. Le client recevra alors un email de confirmation.</p>
    ${actions}
  `;
  return emailWrapper(body);
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
