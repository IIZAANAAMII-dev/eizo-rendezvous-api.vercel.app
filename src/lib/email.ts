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
}

export async function sendConfirmationEmail(data: BookingEmailData): Promise<void> {
  const subject = `Votre rendez-vous avec ${data.organizerName} est confirmé`;
  const body = buildCustomerEmailBody(data);
  
  await sendEmail({
    to: data.customerEmail,
    from: 'rendez-vous@eizo.fr',
    subject,
    html: body,
  });
}

export async function sendOrganizerNotification(data: BookingEmailData): Promise<void> {
  const subject = `Nouveau rendez-vous - ${data.customerName} - ${data.date} à ${data.time}`;
  const body = buildOrganizerEmailBody(data);
  
  await sendEmail({
    to: data.organizerEmail,
    from: 'rendez-vous@eizo.fr',
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
  const apiKey = process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.warn('[email] No email provider configured. Skipping email send.');
    return;
  }

  if (process.env.RESEND_API_KEY) {
    return sendWithResend(payload);
  }

  if (process.env.SENDGRID_API_KEY) {
    return sendWithSendgrid(payload);
  }
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
      <p style="font-size: 14px; color: #6b7280;">Vous recevrez un rappel avant votre rendez-vous.</p>
    </div>
  `;
}

function buildOrganizerEmailBody(data: BookingEmailData): string {
  const productInfo = data.productTitle ? `<p><strong>Produit :</strong> ${data.productTitle}</p>` : '';
  const notes = data.notes ? `<p><strong>Notes client :</strong> ${data.notes}</p>` : '';
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #111827;">
      <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">Nouveau rendez-vous</h1>
      <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px;"><strong>Client :</strong> ${data.customerName}</p>
        <p style="margin: 0 0 8px;"><strong>Email :</strong> ${data.customerEmail}</p>
        <p style="margin: 0 0 8px;"><strong>Date :</strong> ${formatDate(data.date)}</p>
        <p style="margin: 0 0 8px;"><strong>Heure :</strong> ${data.time}</p>
        ${productInfo}
        ${notes}
      </div>
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
