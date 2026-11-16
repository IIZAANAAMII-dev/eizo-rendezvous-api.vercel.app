import { z } from 'zod';
import { getSupabaseClient } from '@/lib/supabase';
import { bookings, events, secretMatches, weekKey, dayKey } from '@/lib/rdv';
import { bookingReport } from '@/lib/rdv-report';
import { eventsReportSender, sendEventsReport } from '@/lib/email';

const REPORT_SCOPE = 'global';
// La synthèse hebdomadaire est globale ; après l'événement, supprimer le cron
// et les variables EIZO_EVENTS_REPORT_* pour arrêter les envois.

export async function GET(request: Request, {params}: {params: Promise<{cadence:string}>}) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length<32 || !secretMatches(request.headers.get('authorization') ?? '', 'Bearer '+secret))
    return Response.json({error:'Accès refusé'},{status:401});
  if (process.env.VERCEL_ENV !== 'production' || process.env.EIZO_EVENTS_REPORT_MODE !== 'production')
    return Response.json({error:'Envois programmés désactivés'},{status:409});
  const cadence = z.enum(['jour','semaine']).safeParse((await params).cadence);
  const recipients = z.array(z.string().email()).min(1).max(30).safeParse(
    [...new Set((process.env.EIZO_EVENTS_REPORT_TO ?? '').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean))]);
  const origin = process.env.EIZO_EVENTS_REPORT_ORIGIN;
  const sender = eventsReportSender(process.env.EIZO_EVENTS_REPORT_FROM);
  if (!cadence.success || !recipients.success || !origin || !sender ||
    !process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD)
    return Response.json({error:'Rapports non configurés'},{status:503});
  try {
    const link = new URL('/events?vue=global',origin);
    if (link.protocol!=='https:') throw new Error();
    const now = new Date();
    // La synthèse hebdomadaire part le lundi : les autres jours on ignore.
    if (cadence.data==='semaine' && dayKey(now) !== weekKey(now)) return Response.json({skipped:true});
    const [list, rows] = await Promise.all([events(), bookings()]);
    const message = bookingReport(rows,list,cadence.data,now,link);
    const key = {scope:REPORT_SCOPE,cadence:cadence.data,period_start:message.key};
    const claim = await getSupabaseClient().from('eizo_event_reports').insert(key);
    if (claim.error?.code==='23505') return Response.json({skipped:true});
    if (claim.error) throw claim.error;
    await sendEventsReport(recipients.data,message,sender);
    const updated = await getSupabaseClient().from('eizo_event_reports').update({sent_at:new Date().toISOString()}).match(key);
    if (updated.error) throw updated.error;
    return Response.json({sent:true});
  } catch {
    return Response.json({error:'Rapport indisponible'},{status:503});
  }
}
