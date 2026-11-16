import { getSupabaseClient } from './supabase';
import type { Booking, Event } from './rdv';

export type Access = { email: string; role: 'admin' | 'reader'; events: string[] | '*'; weeklyReport: boolean };

type Row = { email: string; role: 'admin' | 'reader'; events: string[]; weekly_report: boolean };
const toAccess = (row: Row): Access => ({
  email: row.email, role: row.role, weeklyReport: row.weekly_report,
  events: row.events.includes('*') ? '*' : row.events,
});

/** Table eizo_event_access (prioritaire), sinon variable EIZO_EVENTS_USERS (email=admin|reader). */
export async function accessFor(email: string): Promise<Access | null> {
  const account = email.toLowerCase();
  const { data, error } = await getSupabaseClient().from('eizo_event_access')
    .select('email,role,events,weekly_report').eq('email', account).maybeSingle();
  if (!error && data) return toAccess(data as Row);
  for (const entry of (process.env.EIZO_EVENTS_USERS ?? '').split(',')) {
    const [address, role] = entry.trim().split('=');
    if (address?.toLowerCase() === account && role === 'admin') return { email: account, role, events: '*', weeklyReport: true };
  }
  return null;
}

/** Personnes qui reçoivent la synthèse du lundi, chacune avec son périmètre. */
export async function reportAudience(): Promise<Access[]> {
  const { data, error } = await getSupabaseClient().from('eizo_event_access')
    .select('email,role,events,weekly_report').eq('weekly_report', true);
  if (error) throw error;
  return (data as Row[]).map(toAccess);
}

export async function eventAccess(token: string | undefined): Promise<Access | null> {
  if (!token) return null;
  const { data, error } = await getSupabaseClient().auth.getUser(token);
  if (error || !data.user?.email_confirmed_at || !data.user.email) return null;
  return accessFor(data.user.email);
}

/** Compatibilité : rôle seul. */
export async function eventRole(token: string | undefined) {
  return (await eventAccess(token))?.role ?? null;
}

export function canSee(access: Access, event: Pick<Event, 'slug'> | undefined) {
  return !!event && (access.events === '*' || access.events.includes(event.slug));
}

/** Restreint événements et rendez-vous au périmètre de la personne. */
export function scopeTo(access: Access, events: Event[], rows: Booking[]) {
  if (access.events === '*') return { events, rows };
  const visible = events.filter(event => canSee(access, event));
  const ids = new Set(visible.map(event => event.id));
  return { events: visible, rows: rows.filter(row => ids.has(row.organizer_id)) };
}
