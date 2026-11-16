import { z } from 'zod';
import { getSupabaseClient } from '@/lib/supabase';
import { participants, secretMatches, slug, period } from '@/lib/events';
import { report } from '@/lib/events-report';
import { sendEventsReport } from '@/lib/email';

export async function GET(request: Request, {params}: {params: Promise<{cadence:string}>}) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length<32 || !secretMatches(request.headers.get('authorization') ?? '', 'Bearer '+secret))
    return Response.json({error:'Accès refusé'},{status:401});
  const cadence = z.enum(['jour','semaine']).safeParse((await params).cadence);
  const recipients = z.array(z.string().email()).min(1).max(30).safeParse(
    [...new Set((process.env.EIZO_EVENTS_REPORT_TO ?? '').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean))]);
  const source = slug.safeParse(process.env.EIZO_EVENTS_REPORT_EVENT);
  const origin = process.env.EIZO_EVENTS_REPORT_ORIGIN;
  if (!cadence.success || !recipients.success || !source.success || !origin ||
    !process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD)
    return Response.json({error:'Rapports non configurés'},{status:503});
  try {
    const link = new URL('/events?event='+source.data,origin);
    if (link.protocol!=='https:') throw new Error();
    const now = new Date();
    if (cadence.data==='semaine' && period(now,false)!==period(now,true)) return Response.json({skipped:true});
    const db = getSupabaseClient();
    const {data:event,error} = await db.from('eizo_events').select('slug,title,starts_on').eq('slug',source.data).single();
    if (error) throw error;
    const message = report(event,await participants(source.data),cadence.data,now,link);
    const key = {event_slug:source.data,cadence:cadence.data,period_start:message.key};
    const claim = await db.from('eizo_event_reports').insert(key);
    if (claim.error?.code==='23505') return Response.json({skipped:true});
    if (claim.error) throw claim.error;
    await sendEventsReport(recipients.data,message);
    const updated = await db.from('eizo_event_reports').update({sent_at:new Date().toISOString()}).match(key);
    if (updated.error) throw updated.error;
    return Response.json({sent:true});
  } catch {
    return Response.json({error:'Rapport indisponible'},{status:503});
  }
}
