import { z } from 'zod';
import { getSupabaseClient } from '@/lib/supabase';
import { bookings, events, secretMatches, weekKey, dayKey } from '@/lib/rdv';
import { bookingReport } from '@/lib/rdv-report';
import { eventsReportSender, sendEventsReport } from '@/lib/email';
import { reportMode } from '@/lib/report-recipients';
import { accessFor, reportAudience, scopeTo, type Access } from '@/lib/events-access';

export const dynamic = 'force-dynamic';

// Appelée par Vercel Cron (vercel.json) chaque lundi, avec « Authorization: Bearer $CRON_SECRET ».
// Chaque destinataire reçoit une synthèse limitée aux événements qu'il a le droit de voir
// (table eizo_event_access).
// Mode dev (par défaut) : seule la synthèse de klegarrec@feeder.fr est envoyée, à lui seul.
// Mode production (EIZO_EVENTS_REPORT_MODE=production) : à toutes les lignes weekly_report.
// Test immédiat (toujours envoyé au seul développeur) : ?test=1, et &as=<email> pour
// recevoir la version telle que cette personne la verrait.
export async function GET(request: Request, {params}: {params: Promise<{cadence:string}>}) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length<32 || !secretMatches(request.headers.get('authorization') ?? '', 'Bearer '+secret))
    return Response.json({error:'Accès refusé'},{status:401});
  const cadence = z.enum(['jour','semaine']).safeParse((await params).cadence);
  if (!cadence.success) return Response.json({error:'Cadence inconnue'},{status:404});
  const search = new URL(request.url).searchParams;
  const test = search.get('test') === '1';
  const mode = reportMode();
  const sender = eventsReportSender(process.env.EIZO_EVENTS_REPORT_FROM)
    ?? eventsReportSender(process.env.EMAIL_FROM) ?? eventsReportSender(process.env.SMTP_USER);
  const origin = process.env.EIZO_EVENTS_REPORT_ORIGIN || 'https://eizo-rendezvous-api-vercel-app.vercel.app';
  const missing = [
    !sender && 'expéditeur @eizo.fr (EIZO_EVENTS_REPORT_FROM)',
    !(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) && 'SMTP',
  ].filter(Boolean);
  if (missing.length) return Response.json({error:'Rapports non configurés : '+missing.join(', ')},{status:503});
  try {
    const link = new URL('/events',origin);
    if (link.protocol!=='https:') throw new Error('EIZO_EVENTS_REPORT_ORIGIN doit être en https');
    const now = new Date();
    // La synthèse hebdomadaire part le lundi (heure de Paris) : les autres jours on ignore.
    if (!test && cadence.data==='semaine' && dayKey(now) !== weekKey(now)) return Response.json({skipped:'pas lundi'});

    // Qui reçoit quoi : [adresse de livraison, périmètre utilisé pour construire le mail].
    let deliveries: [string, Access][];
    if (test || !mode.production) {
      const viewer = await accessFor(z.string().email().safeParse(search.get('as')).data ?? mode.dev);
      if (!viewer) return Response.json({error:'Aucun accès configuré pour cette adresse'},{status:404});
      deliveries = [[mode.dev, viewer]];
    } else {
      deliveries = (await reportAudience()).map(access=>[access.email, access]);
    }

    const [allEvents, allRows] = await Promise.all([events(), bookings()]);
    const scope = mode.production && !test ? 'global' : 'global-dev';
    const periodKey = bookingReport([],[],cadence.data,now,link).key;
    const key = {scope,cadence:cadence.data,period_start:periodKey};
    if (!test) {
      const claim = await getSupabaseClient().from('eizo_event_reports').insert(key);
      if (claim.error?.code==='23505') return Response.json({skipped:'déjà envoyé'});
      if (claim.error) throw claim.error;
    }
    const failures: string[] = [];
    for (const [to, access] of deliveries) {
      const scoped = scopeTo(access, allEvents, allRows);
      if (!scoped.events.length) continue;
      const report = bookingReport(scoped.rows, scoped.events, cadence.data, now, link);
      const subject = (mode.production && !test ? '' : '[DEV] ') + report.subject +
        (test && access.email !== to ? ' · vue de '+access.email : '');
      try {
        await sendEventsReport([to], {...report, subject}, sender!);
      } catch (error) {
        console.error('[events] synthèse non envoyée à', to, error);
        failures.push(to);
      }
    }
    if (!test) {
      if (failures.length === deliveries.length && deliveries.length) {
        // Rien n'est parti : on libère la période pour permettre un nouvel essai.
        await getSupabaseClient().from('eizo_event_reports').delete().match(key);
        throw new Error('Aucun envoi réussi');
      }
      const updated = await getSupabaseClient().from('eizo_event_reports').update({sent_at:new Date().toISOString()}).match(key);
      if (updated.error) throw updated.error;
    }
    return Response.json({sent:deliveries.length-failures.length, failed:failures.length,
      mode:mode.production && !test ? 'production' : 'dev', test});
  } catch (error) {
    console.error('[events] synthèse non envoyée', error);
    return Response.json({error:'Rapport indisponible'},{status:503});
  }
}
