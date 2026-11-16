import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { getSupabaseClient } from './supabase';

export const statuses = ['Nouveau', 'Contacté', 'Confirmé', 'Annulé'] as const;
export const slug = z.string().max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const optionalText = z.string().trim().max(200).default('');
export const submission = z.object({
  source_id: z.string().trim().min(1).max(200),
  registered_at: z.string().datetime({ offset: true }),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(254),
  company: optionalText,
  sector: optionalText,
}).strict();
export type Event = { slug: string; title: string; starts_on: string | null; registrations?: number };
export type Participant = z.infer<typeof submission> & { id: string; status: typeof statuses[number]; notes: string };

export type Query = Record<string, string | string[] | undefined>;
export function singleValues(query: Query) {
  return Object.fromEntries(Object.entries(query).map(([key,value])=>[key,typeof value==='string' ? value : undefined]));
}

export function secretMatches(received: string, expected?: string) {
  if (!expected || expected.length < 32 || received.length !== expected.length) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function participants(event: string): Promise<Participant[]> {
  const db = getSupabaseClient();
  const rows: Participant[] = [];
  for (let start = 0; ; start += 500) {
    const {data,error} = await db.from('eizo_event_participants')
      .select('id,source_id,registered_at,name,email,company,sector,status,notes')
      .eq('event_slug',event).order('registered_at',{ascending:false}).order('id').range(start,start+499);
    if (error) throw new Error('Lecture des inscriptions indisponible');
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}

export async function ingest(event: string, rows: z.infer<typeof submission>[]) {
  const {data,error} = await getSupabaseClient().from('eizo_event_participants')
    .upsert(rows.map(row => ({...row,event_slug:event})), {onConflict:'event_slug,source_id',ignoreDuplicates:true}).select('id');
  if (error) throw new Error('Enregistrement indisponible');
  return data.length;
}

const paris = new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'});
export function period(date: Date, weekly: boolean) {
  const day = paris.format(date);
  if (!weekly) return day;
  const monday = new Date(day);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay()+6)%7);
  return monday.toISOString().slice(0,10);
}
export function totals(rows: Participant[], weekly: boolean) {
  const counts = new Map<string,number>();
  for (const row of rows) {
    const key = period(new Date(row.registered_at), weekly);
    counts.set(key,(counts.get(key) ?? 0)+1);
  }
  return [...counts.entries()].sort(([a],[b])=>b.localeCompare(a));
}
export function csvCell(value: string) {
  const safe = /^[\s\u0000-\u001f]*[=+@-]|^[\t\r\n]/u.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"','""') + '"';
}
