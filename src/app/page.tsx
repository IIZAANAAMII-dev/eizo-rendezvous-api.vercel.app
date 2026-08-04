import { redirect } from 'next/navigation';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const shop = params.shop;
  const idToken = params.id_token;
  const session = params.session;
  const embedded = params.embedded;
  const host = params.host;
  const hmac = params.hmac;

  console.log('[/] Route hit');
  console.log('[/] embedded:', embedded);
  console.log('[/] shop:', shop);
  console.log('[/] id_token present:', !!idToken);
  console.log('[/] session present:', !!session);
  console.log('[/] host:', host);
  console.log('[/] hmac present:', !!hmac);

  // Handle embedded app flow
  if (embedded === '1' && idToken && shop) {
    console.log('[/] Embedded detected, delegating to /api/auth/session for JWT verification + cookie issuance');
    const query = new URLSearchParams({ shop, id_token: idToken });
    if (session) query.set('session', session);
    // Server Components cannot set cookies directly; the route handler below
    // verifies the JWT and issues the signed admin session cookie before
    // redirecting to /shopify.
    redirect(`/api/auth/session?${query.toString()}`);
  }

  // Default page for non-embedded access
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>EIZO Rendez-vous API</h1>
      <p>Le backend est opérationnel.</p>
    </main>
  );
}
