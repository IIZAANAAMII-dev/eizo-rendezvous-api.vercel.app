import { z } from 'zod';
import { eventsReportSender, sendEventsReport } from '@/lib/email';
import { secretMatches } from '@/lib/events';
import { demoReport } from '@/lib/events-report-demo';

export async function POST(request: Request) {
  const token = process.env.EIZO_EVENTS_TEST_SECRET;
  if (process.env.VERCEL_ENV !== 'preview' || !token || token.length < 32 ||
    !secretMatches(request.headers.get('authorization') ?? '', 'Bearer '+token))
    return Response.json({error:'Accès refusé'},{status:401});

  const recipient = z.string().trim().email().safeParse(process.env.EIZO_EVENTS_TEST_TO);
  const sender = eventsReportSender(process.env.SMTP_USER);
  if (!recipient.success || !sender || !process.env.SMTP_HOST || !process.env.SMTP_PASSWORD || !process.env.VERCEL_URL)
    return Response.json({error:'Boîte EIZO authentifiée ou destinataire de test indisponible'},{status:409});

  const mail = demoReport('https://'+process.env.VERCEL_URL);
  try {
    await sendEventsReport([recipient.data],{...mail,subject:'[DEV] '+mail.subject},sender);
    return Response.json({sent:true,from:sender});
  } catch {
    return Response.json({error:'Le serveur mail n’a pas confirmé l’envoi'},{status:502});
  }
}
