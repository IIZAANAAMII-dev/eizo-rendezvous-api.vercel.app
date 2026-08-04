import nodemailer from 'nodemailer';

export interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  date: string;
  time: string;
  organizerName: string;
  organizerEmail: string;
  productTitle?: string;
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

function buildCustomerRequestBody(data: BookingEmailData): string {
  const productInfo = data.productTitle ? `<p><strong>Produit :</strong> ${data.productTitle}</p>` : '';
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #111827;">
      <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Demande de rendez-vous enregistrée</h1>
      <p style="font-size: 16px; color: #6b7280; margin-bottom: 32px;">Bonjour ${data.customerName},</p>
      <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px;"><strong>Expert :</strong> ${data.organizerName}</p>
        <p style="margin: 0 0 8px;"><strong>Date :</strong> ${formatDate(data.date)}</p>
        <p style="margin: 0 0 8px;"><strong>Heure :</strong> ${data.time}</p>
        ${productInfo}
      </div>
      <p style="font-size: 14px; color: #6b7280;">Votre demande est en attente de validation. Vous recevrez un email de confirmation dès qu'elle sera acceptée.</p>
    </div>
  `;
}

function buildCustomerEmailBody(data: BookingEmailData): string {
  const productInfo = data.productTitle ? `<p><strong>Produit :</strong> ${data.productTitle}</p>` : '';
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #111827;">
      <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Votre rendez-vous est confirmé</h1>
      <p style="font-size: 16px; color: #6b7280; margin-bottom: 32px;">Bonjour ${data.customerName},</p>
      <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px;"><strong>Expert :</strong> ${data.organizerName}</p>
        <p style="margin: 0 0 8px;"><strong>Date :</strong> ${formatDate(data.date)}</p>
        <p style="margin: 0 0 8px;"><strong>Heure :</strong> ${data.time}</p>
        ${productInfo}
      </div>
      <p style="font-size: 14px; color: #6b7280;">Votre rendez-vous a été validé. À bientôt !</p>
    </div>
  `;
}

function buildOrganizerEmailBody(data: BookingEmailData): string {
  const productInfo = data.productTitle ? `<p><strong>Produit :</strong> ${data.productTitle}</p>` : '';
  const notes = data.notes ? `<p><strong>Notes client :</strong> ${data.notes}</p>` : '';
  const actions = (data.confirmationUrl && data.declineUrl)
    ? `<p style="margin-top: 24px;">
         <a href="${data.confirmationUrl}" style="display: inline-block; background: #0066CC; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Accepter</a>
         <a href="${data.declineUrl}" style="display: inline-block; background: #EF4444; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-left: 8px;">Refuser</a>
       </p>`
    : '';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #111827;">
      <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Nouveau rendez-vous à valider</h1>
      <p style="font-size: 16px; color: #6b7280; margin-bottom: 24px;">Cliquez sur <strong>Accepter</strong> pour confirmer le rendez-vous. Le client sera notifié.</p>
      <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px;"><strong>Client :</strong> ${data.customerName}</p>
        <p style="margin: 0 0 8px;"><strong>Email :</strong> ${data.customerEmail}</p>
        <p style="margin: 0 0 8px;"><strong>Date :</strong> ${formatDate(data.date)}</p>
        <p style="margin: 0 0 8px;"><strong>Heure :</strong> ${data.time}</p>
        ${productInfo}
        ${notes}
      </div>
      ${actions}
    </div>
  `;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
