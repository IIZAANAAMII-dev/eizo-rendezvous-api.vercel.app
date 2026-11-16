import { z } from 'zod';
import { getSupabaseClient } from '@/lib/supabase';
import { bookings, events, secretMatches, weekKey, dayKey } from '@/lib/rdv';
import { bookingReport } from '@/lib/rdv-report';
import { eventsReportSender, sendEventsReport } from '@/lib/email';
import { reportRecipients } from '@/lib/report-recipients';

export const dynamic = 'force-dynamic';

// Appelée par Vercel Cron (vercel.json) chaque lundi, avec « Authorization: Bearer $CRON_SECRET ».
// Mode dev (par défaut) : la synthèse part uniquement à klegarrec@feeder.fr.
// Mode production (EIZO_EVENTS_REPORT_MODE=production) : à toute l'équipe.
// Test manuel immédiat (toujours au seul développeur) : GET ...?test=1 avec le même en-tête.
// Après l'événement : retirer le cron de vercel.json pour arrêter les envois.
export async function GET(request: Request, {params}: {params: Promise<{cadence:string}>}) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length<32 || !secretMatches(request.headers.get('authorization') ?? '', 'Bearer '+secret))
    return Response.json({error:'Accès refusé'},{status:401});
  const cadence = z.enum(['jour','semaine']).safeParse((await params).cadence);
  if (!cadence.success) return Response.json({error:'Cadence inconnue'},{status:404});
  const test = new URL(request.url).searchParams.get('test') === '1';
  const target = test ? reportRecipients({...process.env, EIZO_EVENTS_REPORT_MODE:'dev'}) : reportRecipients();
  const sender = eventsReportSender(process.env.EIZO_EVENTS_REPORT_FROM)
    ?? eventsReportSender(process.env.EMAIL_FROM) ?? eventsReportSender(process.env.SMTP_USER);
  const origin = process.env.EIZO_EVENTS_REPORT_ORIGIN || 'https://eizo-rendezvous-api.vercel.app';
  const missing = [
    !target.recipients && 'destinataires',
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
    const [list, rows] = await Promise.all([events(), bookings()]);
    const report = bookingReport(rows,list,cadence.data,now,link);
    const message = target.production ? report : {...report, subject:'[DEV] '+report.subject};
    const scope = target.production ? 'global' : 'global-dev';
    const key = {scope,cadence:cadence.data,period_start:report.key};
    if (!test) {
      const claim = await getSupabaseClient().from('eizo_event_reports').insert(key);
      if (claim.error?.code==='23505') return Response.json({skipped:'déjà envoyé'});
      if (claim.error) throw claim.error;
    }
    try {
      await sendEventsReport(target.recipients!,message,sender!);
    } catch (error) {
      // Libère la période pour qu'un nouvel appel puisse réessayer.
      if (!test) await getSupabaseClient().from('eizo_event_reports').delete().match(key);
      throw error;
    }
    if (!test) {
      const updated = await getSupabaseClient().from('eizo_event_reports').update({sent_at:new Date().toISOString()}).match(key);
      if (updated.error) throw updated.error;
    }
    return Response.json({sent:true, mode:target.production?'production':'dev', recipients:target.recipients!.length, test});
  } catch (error) {
    console.error('[events] synthèse non envoyée', error);
    return Response.json({error:'Rapport indisponible'},{status:503});
  }
}
