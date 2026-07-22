import nodemailer from 'nodemailer';
import type { Reservation } from './shopify';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error('Missing SMTP configuration');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function getActionUrl(token: string, action: 'confirm' | 'cancel') {
  const base = process.env.API_BASE_URL;
  if (!base) throw new Error('Missing API_BASE_URL environment variable');
  return `${base}/api/reservation/action?token=${encodeURIComponent(token)}&action=${action}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendNewReservationEmail(data: Reservation) {
  const from = process.env.EMAIL_FROM || 'noreply@eizo.fr';
  const to = process.env.EMAIL_TO || 'klegarrec@feeder.fr';
  const confirmUrl = getActionUrl(data.token, 'confirm');
  const cancelUrl = getActionUrl(data.token, 'cancel');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Nouvelle demande de démonstration ColorEdge</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333;">
  <h2>Bonjour Fred,</h2>
  <p>Une nouvelle demande de rendez-vous vient d'être reçue.</p>
  <h3>Informations client</h3>
  <ul>
    <li><strong>Nom :</strong> ${escapeHtml(data.nom)}</li>
    <li><strong>Prénom :</strong> ${escapeHtml(data.prenom)}</li>
    <li><strong>Société :</strong> ${escapeHtml(data.societe)}</li>
    <li><strong>Email :</strong> ${escapeHtml(data.email)}</li>
    <li><strong>Téléphone :</strong> ${escapeHtml(data.telephone)}</li>
  </ul>
  <h3>Créneau demandé</h3>
  <ul>
    <li><strong>Date :</strong> ${escapeHtml(data.date)}</li>
    <li><strong>Heure :</strong> ${escapeHtml(data.heure)}</li>
  </ul>
  <p><strong>Produit concerné :</strong> ${escapeHtml(data.produit)}</p>
  <p><strong>Message :</strong></p>
  <p>${escapeHtml(data.message).replace(/\n/g, '<br>')}</p>
  <p style="margin-top: 24px;">
    <a href="${escapeHtml(confirmUrl)}" style="display:inline-block;padding:12px 24px;background:#28a745;color:#fff;text-decoration:none;border-radius:4px;">✅ Accepter le rendez-vous</a>
  </p>
  <p>
    <a href="${escapeHtml(cancelUrl)}" style="display:inline-block;padding:12px 24px;background:#dc3545;color:#fff;text-decoration:none;border-radius:4px;">❌ Refuser la demande</a>
  </p>
</body>
</html>`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from,
    to,
    subject: 'Nouvelle demande de démonstration ColorEdge',
    html,
  });
}

export async function sendClientConfirmationEmail(data: Reservation) {
  const from = process.env.EMAIL_FROM || 'noreply@eizo.fr';
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Votre démonstration EIZO ColorEdge est confirmée</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333;">
  <p>Bonjour,</p>
  <p>Votre rendez-vous avec Frédéric Rol est confirmé.</p>
  <p><strong>Date :</strong> ${escapeHtml(data.date)}<br>
     <strong>Heure :</strong> ${escapeHtml(data.heure)}</p>
  <p><strong>Lieu :</strong> Prophot</p>
  <p>Nous vous attendons pour votre démonstration ColorEdge.</p>
</body>
</html>`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from,
    to: data.email,
    subject: 'Votre démonstration EIZO ColorEdge est confirmée',
    html,
  });
}

export async function sendClientCancellationEmail(data: Reservation) {
  const from = process.env.EMAIL_FROM || 'noreply@eizo.fr';
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Votre demande de rendez-vous EIZO</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333;">
  <p>Bonjour,</p>
  <p>Nous sommes désolés mais ce créneau n'est plus disponible.</p>
  <p>Nous reviendrons vers vous prochainement.</p>
</body>
</html>`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from,
    to: data.email,
    subject: 'Votre demande de rendez-vous EIZO',
    html,
  });
}
