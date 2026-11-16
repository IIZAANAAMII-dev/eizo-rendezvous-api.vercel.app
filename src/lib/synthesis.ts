import { getSupabaseClient } from './supabase';
import { bookings, dayKey, events, weekKey, type Event } from './rdv';
import { bookingReport } from './rdv-report';
import { eventsReportSender, sendEventsReport } from './email';
import { DEV_RECIPIENT } from './report-recipients';
import { accessFor, reportAudience, scopeTo, type Access } from './events-access';

export type Cadence = 'jour' | '2jours' | 'semaine';
export const CADENCE_DAYS: Record<Cadence, number> = { jour: 1, '2jours': 2, semaine: 7 };
export const ORIGIN = process.env.EIZO_EVENTS_REPORT_ORIGIN || 'https://eizo-rendezvous-api-vercel-app.vercel.app';

export function reportSender() {
  return eventsReportSender(process.env.EIZO_EVENTS_REPORT_FROM)
    ?? eventsReportSender(process.env.SMTP_USER) ?? eventsReportSender(process.env.EMAIL_FROM);
}
export function mailReady() {
  return !!(reportSender() && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

/** Mode d'envoi : « production » (toute l'équipe) seulement si le réglage du back-office le dit
 *  ET que l'on tourne sur le déploiement de production. Sinon : uniquement le développeur. */
export async function reportMode() {
  const { data } = await getSupabaseClient().from('eizo_event_settings').select('value,updated_by,updated_at').eq('key','report_mode').maybeSingle();
  const wanted = data?.value ?? process.env.EIZO_EVENTS_REPORT_MODE ?? 'dev';
  return {
    production: wanted === 'production' && process.env.VERCEL_ENV === 'production',
    wanted: wanted === 'production' ? 'production' as const : 'dev' as const,
    dev: (process.env.EIZO_EVENTS_REPORT_DEV_TO || DEV_RECIPIENT).trim().toLowerCase(),
    updatedBy: data?.updated_by ?? null, updatedAt: data?.updated_at ?? null,
  };
}

export async function setReportMode(mode: 'dev' | 'production', by: string) {
  const { error } = await getSupabaseClient().from('eizo_event_settings')
    .upsert({ key: 'report_mode', value: mode, updated_by: by, updated_at: new Date().toISOString() });
  if (error) throw error;
}

const reported = () => new Set((process.env.EIZO_EVENTS_REPORT_EVENTS || 'rencontre-2026').split(',').map(slug => slug.trim()));

/** Dernier jour où une synthèse peut encore partir pour cet événement (fin + `days`). */
export function lastReportDay(event: Event, days: number) {
  const last = event.event_end_date ?? event.event_start_date;
  if (!last) return null;
  const stop = new Date(last+'T12:00:00Z'); stop.setUTCDate(stop.getUTCDate()+days);
  return stop.toISOString().slice(0,10);
}

/** Événements couverts par la synthèse (par défaut les Rencontres EIZO), encore suivis à `today`. */
export function reportedEvents(all: Event[], today: string, days: number) {
  const slugs = reported();
  return all.filter(event => { const stop = slugs.has(event.slug) ? lastReportDay(event, days) : null; return !!stop && today <= stop; });
}

const dayNumber = (day: string) => Math.round(Date.parse(day+'T00:00:00Z')/86_400_000);
export const isSendDay = (cadence: Cadence, now: Date) => {
  const today = dayKey(now);
  if (cadence === 'semaine') return today === weekKey(now);
  if (cadence === '2jours') return dayNumber(today) % 2 === 0;
  return true;
};

/** Prochain jour d'envoi (à partir de demain) tant qu'au moins un événement est suivi. */
export function nextSendDay(all: Event[], now: Date, cadence: Cadence = '2jours') {
  for (let offset = 1; offset <= 60; offset++) {
    const date = new Date(now.getTime() + offset*86_400_000);
    const day = dayKey(date);
    if (!reportedEvents(all, day, CADENCE_DAYS[cadence]).length) return null;
    if (isSendDay(cadence, date)) return day;
  }
  return null;
}

export type SynthesisResult =
  | { status: 'sent'; sent: number; failed: number; mode: 'dev' | 'production'; test: boolean; recipients: string[] }
  | { status: 'skipped'; reason: string }
  | { status: 'error'; reason: string };

/**
 * Construit et envoie la synthèse.
 * - test : envoi immédiat à `deliverTo` (le développeur par défaut), sans tenir compte du
 *   jour ni de l'historique, avec le périmètre de `viewer` (sa propre vue par défaut).
 * - sinon : envoi programmé, une seule fois par période, à chaque destinataire autorisé.
 */
export async function runSynthesis(options: { cadence: Cadence; test?: boolean; viewer?: string; deliverTo?: string; now?: Date }): Promise<SynthesisResult> {
  const { cadence, test = false } = options;
  const now = options.now ?? new Date();
  const days = CADENCE_DAYS[cadence];
  const sender = reportSender();
  if (!mailReady() || !sender) return { status: 'error', reason: 'Envoi d’e-mails non configuré (SMTP).' };
  if (!test && !isSendDay(cadence, now)) return { status: 'skipped', reason: 'Pas de synthèse aujourd’hui.' };

  const mode = await reportMode();
  const link = new URL('/events', ORIGIN);
  let deliveries: [string, Access][];
  if (test || !mode.production) {
    const viewer = await accessFor(options.viewer ?? mode.dev);
    if (!viewer) return { status: 'error', reason: 'Aucun accès configuré pour cette adresse.' };
    deliveries = [[options.deliverTo ?? mode.dev, viewer]];
  } else {
    deliveries = (await reportAudience()).map(access => [access.email, access]);
  }

  const [everyEvent, allRows] = await Promise.all([events(), bookings()]);
  const today = dayKey(now);
  const followed = reportedEvents(everyEvent, today, days);
  if (!followed.length) return { status: 'skipped', reason: 'Aucun événement en cours : plus de synthèse.' };

  const key = { scope: mode.production && !test ? 'global' : 'global-dev', cadence, period_start: bookingReport([], [], days, now, link).key };
  const client = getSupabaseClient();
  if (!test) {
    const claim = await client.from('eizo_event_reports').insert(key);
    if (claim.error?.code === '23505') return { status: 'skipped', reason: 'Synthèse déjà envoyée pour cette période.' };
    if (claim.error) throw claim.error;
  }
  const failures: string[] = [];
  const recipients: string[] = [];
  for (const [to, access] of deliveries) {
    const scoped = scopeTo(access, followed, allRows);
    if (!scoped.events.length) continue;
    const report = bookingReport(scoped.rows, scoped.events, days, now, link);
    const subject = (mode.production && !test ? '' : '[TEST] ') + report.subject + (access.email !== to ? ' · vue de ' + access.email : '');
    try {
      await sendEventsReport([to], { ...report, subject }, sender);
      recipients.push(to);
    } catch (error) {
      console.error('[events] synthèse non envoyée à', to, error);
      failures.push(to);
    }
  }
  if (!test) {
    if (!recipients.length) {
      await client.from('eizo_event_reports').delete().match(key);
      return { status: 'error', reason: 'Aucun envoi réussi.' };
    }
    await client.from('eizo_event_reports').update({ sent_at: new Date().toISOString() }).match(key);
  }
  return { status: 'sent', sent: recipients.length, failed: failures.length, mode: mode.production && !test ? 'production' : 'dev', test, recipients };
}

/** Historique des derniers envois programmés. */
export async function lastSyntheses(limit = 5) {
  const { data } = await getSupabaseClient().from('eizo_event_reports')
    .select('scope,cadence,period_start,sent_at').not('sent_at','is',null).order('sent_at',{ascending:false}).limit(limit);
  return data ?? [];
}
