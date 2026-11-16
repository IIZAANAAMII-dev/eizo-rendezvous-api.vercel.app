import { NextResponse, type NextRequest } from 'next/server';

// Garde la session du back-office ouverte : quand le jeton d'accès (1 h) expire, on le
// renouvelle avec le refresh token Supabase (valable 14 jours) avant d'afficher la page.
const ACCESS = 'eizo-events';
const REFRESH = 'eizo-events-refresh';

function expiresSoon(token: string | undefined) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    return typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now() + 60_000;
  } catch { return true; }
}

export async function middleware(request: NextRequest) {
  const refresh = request.cookies.get(REFRESH)?.value;
  if (!refresh || !expiresSoon(request.cookies.get(ACCESS)?.value)) return NextResponse.next();
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.next();
  try {
    const answer = await fetch(url + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }), cache: 'no-store',
    });
    if (!answer.ok) {
      const response = NextResponse.next();
      response.cookies.set(REFRESH, '', { path: '/events', maxAge: 0 });
      return response;
    }
    const session = await answer.json() as { access_token: string; refresh_token: string; expires_in: number };
    request.cookies.set(ACCESS, session.access_token);
    request.cookies.set(REFRESH, session.refresh_token);
    const response = NextResponse.next({ request });
    const options = { path: '/events', httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' };
    response.cookies.set(ACCESS, session.access_token, { ...options, maxAge: session.expires_in });
    response.cookies.set(REFRESH, session.refresh_token, { ...options, maxAge: 14 * 86_400 });
    return response;
  } catch {
    return NextResponse.next();
  }
}

export const config = { matcher: ['/events', '/events/:path*'] };
