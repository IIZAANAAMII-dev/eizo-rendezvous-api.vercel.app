import { createHmac } from 'node:crypto';
import { getSupabaseClient } from '@/lib/supabase';
import { formEvents, registrationInput, saveRegistration } from '@/lib/registrations';

// Reçoit les inscriptions du formulaire Shopify (Globo) des pages événement, envoyées par
// public/eizo-events-capture.js. Protections : origines eizo.fr uniquement, taille limitée,
// champ piège, et au plus 20 envois par heure et par adresse IP (journal anonymisé).
const ORIGINS = new Set(['https://eizo.fr', 'https://www.eizo.fr', 'https://eizo-france.myshopify.com']);
const PER_HOUR = 20;

function headers(origin: string | null): Record<string, string> {
  return origin && ORIGINS.has(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store', Vary: 'Origin' }
    : { 'Cache-Control': 'no-store', Vary: 'Origin' };
}

/** Compte l'envoi ; refuse au-delà de PER_HOUR par IP. Ne bloque jamais en cas d'incident. */
async function allowed(request: Request) {
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'inconnue';
  const hash = createHmac('sha256', process.env.CRON_SECRET || 'eizo-events').update(ip).digest('hex').slice(0, 32);
  const client = getSupabaseClient();
  const since = new Date(Date.now() - 3_600_000).toISOString();
  try {
    const { count } = await client.from('eizo_event_ingest_log').select('id', { count: 'exact', head: true })
      .eq('ip_hash', hash).gte('created_at', since);
    if ((count ?? 0) >= PER_HOUR) return false;
    await client.from('eizo_event_ingest_log').insert({ ip_hash: hash });
    if (Math.random() < .05) await client.from('eizo_event_ingest_log').delete().lt('created_at', new Date(Date.now() - 86_400_000).toISOString());
  } catch { /* journal indisponible : on laisse passer */ }
  return true;
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: headers(request.headers.get('origin')) });
}

export async function POST(request: Request, { params }: { params: Promise<{ event: string }> }) {
  const origin = request.headers.get('origin');
  const cors = headers(origin);
  if (!origin || !ORIGINS.has(origin)) return Response.json({ error: 'Origine refusée' }, { status: 403, headers: cors });
  const slug = (await params).event;
  if (!formEvents.some(event => event.slug === slug))
    return Response.json({ error: 'Événement inconnu' }, { status: 404, headers: cors });

  const text = await request.text();
  if (text.length > 20_000) return Response.json({ error: 'Trop volumineux' }, { status: 413, headers: cors });
  let body: Record<string, unknown> | null = null;
  try { body = JSON.parse(text); } catch { /* invalide */ }
  // Champ piège : rempli uniquement par les robots.
  if (body && typeof body.website === 'string' && body.website) return new Response(null, { status: 204, headers: cors });
  const parsed = registrationInput.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Inscription invalide' }, { status: 400, headers: cors });
  if (!await allowed(request)) return Response.json({ error: 'Trop de demandes, réessayez plus tard' }, { status: 429, headers: cors });

  try {
    await saveRegistration(slug, parsed.data);
    return Response.json({ saved: true }, { headers: cors });
  } catch (error) {
    console.error('[events] inscription non enregistrée', error);
    return Response.json({ error: 'Enregistrement indisponible' }, { status: 503, headers: cors });
  }
}
