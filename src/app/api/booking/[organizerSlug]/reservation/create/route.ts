import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateToken } from '@/lib/token';
import {
  getOrganizerBySlug,
  createAppointment,
  getAppointmentsByDate,
  getBookingSettings,
} from '@/lib/supabase';
import { sendNewReservationEmail } from '@/lib/mail';
import type { AppointmentInput } from '@/types/appointment';

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

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const endMinutes = minutes + durationMinutes;
  const endHours = hours + Math.floor(endMinutes / 60);
  const endMinutesRemainder = endMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutesRemainder).padStart(2, '0')}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizerSlug: string }> }
) {
  try {
    const { organizerSlug } = await params;

    // Get organizer
    const organizer = await getOrganizerBySlug(organizerSlug);
    if (!organizer) {
      return setCorsHeaders(
        NextResponse.json({ error: 'Organizer not found' }, { status: 404 })
      );
    }

    if (!organizer.active) {
      return setCorsHeaders(
        NextResponse.json({ error: 'Organizer is not active' }, { status: 403 })
      );
    }

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
      console.warn('[booking reservation create] validation error', parsed.error.flatten());
      return setCorsHeaders(
        NextResponse.json(
          { error: 'Données invalides', details: parsed.error.flatten() },
          { status: 400 }
        )
      );
    }

    const data: ReservationInput = parsed.data;

    // Get booking settings for duration
    const settings = await getBookingSettings(organizer.id);

    // Check availability before creating
    const existingReservations = await getAppointmentsByDate(data.date, organizer.id);
    const isSlotTaken = existingReservations.some((r) => r.start_time === data.heure);
    if (isSlotTaken) {
      return setCorsHeaders(
        NextResponse.json(
          { error: 'Ce créneau horaire est déjà réservé' },
          { status: 409 }
        )
      );
    }

    const token = generateToken();
    const endTime = calculateEndTime(data.heure, settings.duration_minutes);

    const appointment = await createAppointment(
      {
        customer_name: data.nom,
        customer_first_name: data.prenom,
        customer_company: data.societe,
        customer_email: data.email,
        customer_phone: data.telephone,
        appointment_date: data.date,
        start_time: data.heure,
        end_time: endTime,
        product: data.produit,
        message: data.message,
        status: 'En attente',
        confirmation_token: token,
      },
      organizer.id
    );

    await sendNewReservationEmail(appointment);

    return setCorsHeaders(NextResponse.json({ success: true }, { status: 201 }));
  } catch (error) {
    console.error('[booking reservation create]', error);
    return setCorsHeaders(
      NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
    );
  }
}
