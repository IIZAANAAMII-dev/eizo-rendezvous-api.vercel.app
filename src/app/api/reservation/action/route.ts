import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getReservationByToken, updateReservationStatus } from '@/lib/shopify';
import { sendClientConfirmationEmail, sendClientCancellationEmail } from '@/lib/mail';

const paramsSchema = z.object({
  token: z.string().uuid(),
  action: z.enum(['confirm', 'cancel']),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const parsed = paramsSchema.safeParse({
      token: searchParams.get('token'),
      action: searchParams.get('action'),
    });

    if (!parsed.success) {
      return htmlResponse(
        400,
        'Lien invalide',
        'Le lien est incomplet ou le token est incorrect.'
      );
    }

    const { token, action } = parsed.data;
    const reservation = await getReservationByToken(token);

    if (!reservation) {
      return htmlResponse(
        404,
        'Rendez-vous introuvable',
        'Aucune demande ne correspond à ce lien.'
      );
    }

    const newStatus = action === 'confirm' ? 'Confirmé' : 'Annulé';
    await updateReservationStatus(reservation.id, newStatus);

    if (action === 'confirm') {
      await sendClientConfirmationEmail(reservation);
    } else {
      await sendClientCancellationEmail(reservation);
    }

    const title = action === 'confirm' ? 'Rendez-vous confirmé' : 'Rendez-vous annulé';
    const message =
      action === 'confirm'
        ? `Votre rendez-vous du ${reservation.date} à ${reservation.heure} est confirmé.`
        : `Le rendez-vous du ${reservation.date} à ${reservation.heure} est annulé.`;

    return htmlResponse(200, title, message);
  } catch (error) {
    console.error('[reservation action]', error);
    return htmlResponse(500, 'Erreur', 'Une erreur est survenue lors du traitement.');
  }
}

function htmlResponse(status: number, title: string, message: string) {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 40px; margin: 0; }
    .box { max-width: 600px; margin: auto; background: #fff; padding: 40px; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #111; margin-bottom: 16px; }
    p { color: #555; font-size: 16px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="box">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
