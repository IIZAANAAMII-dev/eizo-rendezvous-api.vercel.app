import { cookies } from 'next/headers';
import { eventAccess, scopeTo } from '@/lib/events-access';
import { bookings, events, type Query, singleValues } from '@/lib/rdv';
import { logout } from './actions';
import { Dashboard, Login, Shell } from './view';
import styles from './events.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title:'EIZO Events', robots:{index:false,follow:false}, referrer:'no-referrer' as const };

export default async function Page({searchParams}: {searchParams:Promise<Query>}) {
  const query = singleValues(await searchParams);
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return <Shell><section className={styles.login}><h1 className={styles.title}>Service non configuré</h1></section></Shell>;
  const access = await eventAccess((await cookies()).get('eizo-events')?.value);
  if (!access) return <Shell><Login refused={query.notice === 'connexion'} /></Shell>;
  const [allEvents, allRows] = await Promise.all([events(), bookings()]);
  // Chaque personne ne voit que les événements qui lui sont attribués (table eizo_event_access).
  const {events:list, rows} = scopeTo(access, allEvents, allRows);
  const current = query.event ? list.find(event=>event.slug===query.event) : (list.length===1 ? list[0] : undefined);
  return <Shell
    who={<span className={styles.who}>{access.email}<b>{access.events==='*' ? 'Tous les événements' : access.events.length+' événement'+(access.events.length>1?'s':'')}</b></span>}
    control={<form action={logout}><button className={styles.logout}>Déconnexion</button></form>}>
    <Dashboard events={list} event={current} rows={rows} query={query} />
  </Shell>;
}
