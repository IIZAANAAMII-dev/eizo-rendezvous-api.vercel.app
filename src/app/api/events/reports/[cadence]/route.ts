import { z } from 'zod';
import { secretMatches } from '@/lib/rdv';
import { runSynthesis } from '@/lib/synthesis';

export const dynamic = 'force-dynamic';

// Appelée chaque matin par Vercel Cron (vercel.json) sur /api/events/reports/2jours, avec
// « Authorization: Bearer $CRON_SECRET ». La synthèse ne part qu'un jour sur deux, couvre les
// deux jours précédents et s'arrête seule après l'événement (voir src/lib/synthesis.ts).
// Test immédiat (toujours au seul développeur) : ?test=1, et &as=<email> pour la vue d'une personne.
// Depuis le back-office, un admin peut aussi s'envoyer un aperçu sans passer par ici.
export async function GET(request: Request, {params}: {params: Promise<{cadence:string}>}) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length<32 || !secretMatches(request.headers.get('authorization') ?? '', 'Bearer '+secret))
    return Response.json({error:'Accès refusé'},{status:401});
  const cadence = z.enum(['jour','2jours','semaine']).safeParse((await params).cadence);
  if (!cadence.success) return Response.json({error:'Cadence inconnue'},{status:404});
  const search = new URL(request.url).searchParams;
  try {
    const result = await runSynthesis({
      cadence: cadence.data,
      test: search.get('test') === '1',
      viewer: z.string().email().safeParse(search.get('as')).data,
    });
    return Response.json(result, {status: result.status === 'error' ? 503 : 200});
  } catch (error) {
    console.error('[events] synthèse non envoyée', error);
    return Response.json({status:'error',reason:'Rapport indisponible'},{status:503});
  }
}
