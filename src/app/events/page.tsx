import { cookies } from 'next/headers';
import { eventAccess, scopeTo } from '@/lib/events-access';
import { bookings, dayKey, events, type Event, type Query, singleValues } from '@/lib/rdv';
import { lastSyntheses, lastReportDay, mailReady, nextSendDay, reportMode, reportedEvents } from '@/lib/synthesis';
import { team } from '@/lib/team';
import { logout } from './actions';
import { Submit } from './motion';
import { Dashboard, Login, Shell, type AdminData } from './view';
import styles from './events.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title:'EIZO Events', robots:{index:false,follow:false}, referrer:'no-referrer' as const };

/** Événement mis en avant : celui en cours ou le prochain, sinon le plus récent. */
function featured(list: Event[]) {
  const today = dayKey(new Date());
  const dated = list.filter(event=>event.event_start_date);
  const upcoming = dated.filter(event=>(event.event_end_date ?? event.event_start_date)! >= today)
    .sort((a,b)=>a.event_start_date!.localeCompare(b.event_start_date!));
  return upcoming[0];
}

export default async function Page({searchParams}: {searchParams:Promise<Query>}) {
  const query = singleValues(await searchParams);
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return <Shell><section className={styles.login}><h1 className={styles.title}>Service non configuré</h1></section></Shell>;
  const access = await eventAccess((await cookies()).get('eizo-events')?.value);
  if (!access) return <Shell><Login refused={query.notice === 'connexion'} /></Shell>;
  const [allEvents, allRows] = await Promise.all([events(), bookings()]);
  // Chaque personne ne voit que les événements qui lui sont attribués (table eizo_event_access).
  const {events:list, rows} = scopeTo(access, allEvents, allRows);
  const current = query.event ? list.find(event=>event.slug===query.event)
    : query.vue === 'global' ? undefined : (list.length===1 ? list[0] : featured(list));

  let admin: AdminData | undefined;
  if (access.role === 'admin') {
    const [mode, members, history] = await Promise.all([reportMode(), team(), lastSyntheses()]);
    const followed = reportedEvents(allEvents, dayKey(new Date()), 2);
    admin = {
      self: access.email, mode, members, history, mailReady: mailReady(),
      nextSend: nextSendDay(allEvents, new Date()),
      followed: followed.map(event=>({name:event.name, stop:lastReportDay(event,2)})),
    };
  }

  return <Shell
    who={<span className={styles.who}>{access.email}<b>{access.role==='admin' ? 'Admin' : access.events==='*' ? 'Tous les événements' : access.events.length+' événement'+(access.events.length>1?'s':'')}</b></span>}
    control={<form action={logout}><Submit className={styles.logout} pending="Déconnexion…">Déconnexion</Submit></form>}>
    <Dashboard events={list} event={current} rows={rows} query={query} admin={admin} />
  </Shell>;
}
