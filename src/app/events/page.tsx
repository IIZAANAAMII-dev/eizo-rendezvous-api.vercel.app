import { cookies } from 'next/headers';
import { getSupabaseClient } from '@/lib/supabase';
import { eventRole } from '@/lib/events-access';
import { bookings, events, type Query, singleValues } from '@/lib/rdv';
import { login, logout } from './actions';
import { Dashboard, Shell } from './view';
import styles from './events.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title:'EIZO Events', robots:{index:false,follow:false}, referrer:'no-referrer' as const };

export default async function Page({searchParams}: {searchParams:Promise<Query>}) {
  const query = singleValues(await searchParams);
  const ready = process.env.EIZO_EVENTS_USERS && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!ready) return <Shell><section><h1>Accès équipe</h1><p>Le service de connexion doit être configuré.</p></section></Shell>;
  const role = await eventRole((await cookies()).get('eizo-events')?.value);
  if (!role) return <Shell><section className={styles.login}><h1>Accès équipe</h1>
    {query.notice === 'connexion' && <p role="alert">Connexion refusée.</p>}
    <form action={login}>
      <label>Adresse professionnelle<input name="email" type="email" autoComplete="username" required /></label>
      <label>Mot de passe<input name="password" type="password" autoComplete="current-password" required /></label>
      <button>Se connecter</button>
    </form>
  </section></Shell>;
  const [list, rows] = await Promise.all([events(), bookings()]);
  const current = query.event ? list.find(event=>event.slug===query.event) : undefined;
  return <Shell control={<form action={logout}><button>Déconnexion</button></form>}>
    {query.notice && <p role="status">{query.notice==='enregistre' ? 'Modifications enregistrées.' : 'Action refusée ou données invalides.'}</p>}
    <Dashboard events={list} event={current} rows={rows} query={query} admin={role==='admin'} />
  </Shell>;
}
