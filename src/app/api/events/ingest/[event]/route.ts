import { ingest, secretMatches, slug, submission } from '@/lib/events';

export async function POST(request: Request, {params}: {params: Promise<{event:string}>}) {
  const event = slug.safeParse((await params).event);
  const sources = (process.env.EIZO_EVENTS_SOURCES ?? '').split(',').map(entry => entry.trim().split('='));
  const expected = event.success ? sources.find(([key]) => key === event.data)?.[1] : undefined;
  if (!expected || expected.length < 32 || !secretMatches(request.headers.get('authorization') ?? '', 'Bearer ' + expected))
    return Response.json({error:'Accès refusé'},{status:401});
  const row = await request.json().catch(() => null);
  const parsed = submission.safeParse(row);
  if (!event.success || !parsed.success)
    return Response.json({error:'Inscription invalide'},{status:400});
  try {
    const inserted = await ingest(event.data,[parsed.data]);
    return Response.json({inserted});
  } catch {
    return Response.json({error:'Enregistrement indisponible'},{status:503});
  }
}
