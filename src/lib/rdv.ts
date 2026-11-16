import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { getSupabaseClient } from './supabase';

export const slug = z.string().max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
export function secretMatches(received: string, expected?: string) {
  if (!expected || expected.length < 32 || received.length !== expected.length) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type Event = {
  id: string; slug: string; name: string; specialty: string | null;
  event_start_date: string | null; event_end_date: string | null;
  venue_name: string | null; venue_location: string | null; active: boolean;
};

export type Booking = {
  id: string; organizer_id: string; date: string; start_time: string; end_time: string;
  customer_name: string; customer_email: string; customer_phone: string | null;
  customer_notes: string | null; customer_need: string | null; customer_usage: string | null;
  requested_product: { title?: string } | null; product_title: string | null;
  status: 'pending'|'confirmed'|'refused'|'cancelled'|'completed'|'no_show';
  created_at: string;
};

export type Query = Record<string, string | string[] | undefined>;
export function singleValues(query: Query) {
  return Object.fromEntries(Object.entries(query).map(([key,value])=>[key,typeof value==='string' ? value : undefined]));
}

export const bookingStatuses = ['pending','confirmed','refused','cancelled','completed','no_show'] as const;
export const bookingStatusLabels: Record<Booking['status'],string> = {
  pending:'En attente', confirmed:'Confirmé', refused:'Refusé',
  cancelled:'Annulé', completed:'Terminé', no_show:'No-show',
};

export async function events(): Promise<Event[]> {
  const {data,error} = await getSupabaseClient().from('organizers')
    .select('id,slug,name,specialty,event_start_date,event_end_date,venue_name,venue_location,active')
    .order('event_start_date',{ascending:false,nullsFirst:false});
  if (error) throw new Error('Événements indisponibles');
  return data ?? [];
}

export async function bookings(): Promise<Booking[]> {
  const rows: Booking[] = [];
  for (let start = 0; ; start += 1000) {
    const {data,error} = await getSupabaseClient().from('bookings')
      .select('id,organizer_id,date,start_time,end_time,customer_name,customer_email,customer_phone,customer_notes,customer_need,customer_usage,requested_product,product_title,status,created_at')
      .order('created_at',{ascending:false}).order('id').range(start,start+999);
    if (error) throw new Error('Lecture des rendez-vous indisponible');
    rows.push(...(data as Booking[]));
    if (data.length < 1000) return rows;
  }
}

const paris = new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'});
export function dayKey(date: Date | string) {
  return paris.format(new Date(date));
}
export function weekKey(date: Date | string) {
  const day = dayKey(date);
  const monday = new Date(day+'T12:00:00Z');
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay()+6)%7);
  return monday.toISOString().slice(0,10);
}
export function totals(rows: Booking[], weekly: boolean) {
  const counts = new Map<string,number>();
  for (const row of rows) {
    const key = weekly ? weekKey(row.created_at) : dayKey(row.created_at);
    counts.set(key,(counts.get(key) ?? 0)+1);
  }
  return [...counts.entries()].sort(([a],[b])=>b.localeCompare(a));
}
export function inWeek(row: Booking, monday: string) {
  return weekKey(row.created_at) === monday;
}
export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase() ?? '').join('') || '—';
}
export function csvCell(value: string) {
  const safe = /^[\s\u0000-\u001f]*[=+@-]|^[\t\r\n]/u.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"','""') + '"';
}
