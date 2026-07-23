import { redirect } from 'next/navigation';
import { verifyShopifyJWT, setShopifyEmbeddedSession } from '@/lib/oauth';

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
    console.log('[/] Embedded detected');
    console.log('[/] Shop:', shop);

    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    if (!clientSecret) {
      console.error('[/] Missing SHOPIFY_CLIENT_SECRET');
      return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
          <h1>Configuration Error</h1>
          <p>Missing SHOPIFY_CLIENT_SECRET environment variable.</p>
        </main>
      );
    }

    // Verify JWT
    console.log('[/] JWT validation: starting');
    const jwt = verifyShopifyJWT(idToken, clientSecret, shop);
    if (!jwt) {
      console.error('[/] JWT validation: failed');
      return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
          <h1>Authentication Error</h1>
          <p>Invalid JWT token.</p>
        </main>
      );
    }
    console.log('[/] JWT validation: success');

    // Store session in Supabase
    console.log('[/] Saving Shopify session to Supabase');
    try {
      await setShopifyEmbeddedSession(
        shop,
        idToken,
        session || undefined,
        jwt.dest,
        jwt.aud
      );
      console.log('[/] Shopify session saved successfully');
    } catch (error) {
      console.error('[/] Failed to store embedded session:', error);
      return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
          <h1>Database Error</h1>
          <p>Failed to store session. Please try again.</p>
        </main>
      );
    }

    // Redirect to /shopify
    console.log('[/] Redirecting to /shopify');
    redirect(`/shopify?shop=${shop}`);
  }

  // Default page for non-embedded access
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>EIZO Rendez-vous API</h1>
      <p>Le backend est opérationnel.</p>
    </main>
  );
}
