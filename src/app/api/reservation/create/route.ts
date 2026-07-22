import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateToken } from '@/lib/token';
import { createReservationMetaobject, getAllReservationsByDate } from '@/lib/shopify';
import { sendNewReservationEmail } from '@/lib/mail';

const reservationSchema = z.object({
  nom: z.string().min(1).max(100),
  prenom: z.string().min(1).max(100),
  societe: z.string().max(200).default(''),
  email: z.string().email().max(200),
  telephone: z.string().max(50).default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La date doit être au format YYYY-MM-DD'),
  heure: z.string().min(1).max(50),
  produit: z.string().min(1).max(200),
  message: z.string().max(2000).default(''),
});

type ReservationInput = z.infer<typeof reservationSchema>;

function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function OPTIONS() {
  return setCorsHeaders(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return setCorsHeaders(
        NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
      );
    }

    const parsed = reservationSchema.safeParse(body);
    if (!parsed.success) {
      console.warn('[reservation create] validation error', parsed.error.flatten());
      return setCorsHeaders(
        NextResponse.json(
          { error: 'Données invalides', details: parsed.error.flatten() },
          { status: 400 }
        )
      );
    }

    const data: ReservationInput = parsed.data;

    // Check availability before creating
    const existingReservations = await getAllReservationsByDate(data.date);
    const isSlotTaken = existingReservations.some((r) => r.heure === data.heure);
    if (isSlotTaken) {
      return setCorsHeaders(
        NextResponse.json(
          { error: 'Ce créneau horaire est déjà réservé' },
          { status: 409 }
        )
      );
    }

    const token = generateToken();
    const createdAt = new Date().toISOString();

    const reservation = await createReservationMetaobject({
      ...data,
      statut: 'En attente',
      token,
      createdAt,
    });

    await sendNewReservationEmail(reservation);

    return setCorsHeaders(NextResponse.json({ success: true }, { status: 201 }));
  } catch (error) {
    console.error('[reservation create]', error);
    return setCorsHeaders(
      NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
    );
  }
}
