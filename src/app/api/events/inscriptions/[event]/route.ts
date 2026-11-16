import { formEvents, registrationInput, saveRegistration } from '@/lib/registrations';

// Reçoit les inscriptions du formulaire Shopify (Globo) des pages événement,
// envoyées par le script `shopify-rencontre-2026-capture.html` (navigator.sendBeacon).
const ORIGINS = new Set(['https://eizo.fr', 'https://www.eizo.fr', 'https://eizo-france.myshopify.com']);

function headers(origin: string | null): Record<string, string> {
  return origin && ORIGINS.has(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store', Vary: 'Origin' }
    : { 'Cache-Control': 'no-store', Vary: 'Origin' };
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

  try {
    await saveRegistration(slug, parsed.data);
    return Response.json({ saved: true }, { headers: cors });
  } catch (error) {
    console.error('[events] inscription non enregistrée', error);
    return Response.json({ error: 'Enregistrement indisponible' }, { status: 503, headers: cors });
  }
}
