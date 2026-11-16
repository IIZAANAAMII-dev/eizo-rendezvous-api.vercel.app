import { z } from 'zod';
import type { Booking, Event } from './rdv';
import { getSupabaseClient } from './supabase';

/**
 * Événements dont les inscriptions arrivent par un formulaire Shopify (Globo Form Builder)
 * et non par le widget de réservation. Ils apparaissent dans le back-office comme des
 * événements à part entière ; leurs inscriptions sont converties au format `Booking`.
 */
export const formEvents: (Event & { day: string; defaultStart: string; defaultEnd: string })[] = [
  {
    id: 'form:rencontre-2026', slug: 'rencontre-2026', name: 'Les Rencontres EIZO 2026',
    specialty: 'Événement', event_start_date: '2026-12-03', event_end_date: '2026-12-03',
    venue_name: 'EIZO France · Bâtiment Synapses', venue_location: 'Vélizy-Villacoublay', active: true,
    day: '2026-12-03', defaultStart: '09:00:00', defaultEnd: '14:00:00',
  },
];

export const registrationInput = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  first_name: z.string().trim().max(120).default(''),
  last_name: z.string().trim().max(120).default(''),
  company: z.string().trim().max(200).default(''),
  job_title: z.string().trim().max(200).default(''),
  slot: z.string().trim().max(120).default(''),
  message: z.string().trim().max(4000).default(''),
  consent: z.coerce.boolean().default(false),
});
export type RegistrationInput = z.infer<typeof registrationInput>;

type Registration = RegistrationInput & {
  id: string; event_slug: string; status: Booking['status']; created_at: string;
};

/** "10h30 - 11h00", "10:30–11:00", "10h" → heures de début/fin si présentes. */
function parseSlot(slot: string) {
  const times = [...slot.matchAll(/(\d{1,2})\s*[h:]\s*(\d{2})?/gi)]
    .map(([, h, m]) => Number(h) <= 23 ? `${h.padStart(2, '0')}:${m ?? '00'}:00` : null)
    .filter((value): value is string => Boolean(value));
  return { start: times[0], end: times[1] };
}

export function registrationToBooking(row: Registration): Booking | null {
  const event = formEvents.find(item => item.slug === row.event_slug);
  if (!event) return null;
  const { start, end } = parseSlot(row.slot);
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email;
  return {
    id: row.id, organizer_id: event.id, date: event.day,
    start_time: start ?? event.defaultStart, end_time: end ?? (start ? start : event.defaultEnd),
    customer_name: name, customer_email: row.email, customer_phone: null,
    customer_notes: row.message || null, customer_need: null, customer_usage: null,
    requested_product: null, product_title: null,
    company: row.company || null, job_title: row.job_title || null, slot_label: row.slot || null,
    status: row.status, created_at: row.created_at, source: 'registration',
  };
}

export async function registrationBookings(): Promise<Booking[]> {
  const rows: Booking[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await getSupabaseClient().from('eizo_event_registrations')
      .select('id,event_slug,email,first_name,last_name,company,job_title,slot,message,consent,status,created_at')
      .order('created_at', { ascending: false }).order('id').range(start, start + 999);
    if (error) {
      // Table absente (migration non appliquée) : on n'empêche pas l'affichage des RDV.
      if (error.code === '42P01' || error.code === 'PGRST205') return rows;
      throw new Error('Lecture des inscriptions indisponible');
    }
    for (const row of data as Registration[]) {
      const booking = registrationToBooking(row);
      if (booking) rows.push(booking);
    }
    if (data.length < 1000) return rows;
  }
}

/** Enregistre (ou met à jour) une inscription ; une seule par e-mail et par événement. */
export async function saveRegistration(eventSlug: string, input: RegistrationInput, source = 'globo') {
  const { error } = await getSupabaseClient().from('eizo_event_registrations').upsert(
    { event_slug: eventSlug, ...input, source, updated_at: new Date().toISOString() },
    { onConflict: 'event_slug,email' },
  );
  if (error) throw error;
}
