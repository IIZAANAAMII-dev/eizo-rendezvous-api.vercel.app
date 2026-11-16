import { cookies } from 'next/headers';
import { getSupabaseClient } from '@/lib/supabase';
import { eventRole } from '@/lib/events-access';
import { type Event, type Query, participants, singleValues } from '@/lib/events';
import { change, login, logout } from './actions';
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
  const db = getSupabaseClient();
  const [list, counts] = await Promise.all([
    db.from('eizo_events').select('slug,title,starts_on').order('created_at',{ascending:false}),
    db.from('eizo_event_counts').select('slug,registrations'),
  ]);
  if (list.error || counts.error) return <Shell><h1>Événements indisponibles</h1></Shell>;
  const totals = new Map(counts.data.map(row=>[row.slug,row.registrations]));
  const events:Event[] = list.data.map(row=>({...row,registrations:totals.get(row.slug)}));
  const current = events.find(event=>event.slug===query.event) ?? events[0];
  const rows = current ? await participants(current.slug) : [];
  const notice = query.notice ?? '';
  return <Shell control={<form action={logout}><button>Déconnexion</button></form>}>
    {notice && <p role="status">{notice.startsWith('import-') ? 'Nouvelles inscriptions importées : ' + Number(notice.slice(7)) :
      notice==='enregistre' ? 'Modifications enregistrées.' : 'Action refusée ou données invalides.'}</p>}
    <Dashboard events={events} event={current} rows={rows} query={query} admin={role==='admin'} />
    {role==='admin' && <section className={styles.card}><h2>Créer un événement</h2>
      <form action={change} className={styles.fields}>
        <input type="hidden" name="action" value="create" />
        <label>Nom<input name="title" maxLength={160} required /></label>
        <label>Identifiant<input name="event" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} required /></label>
        <label>Date<input name="date" type="date" /></label><button>Créer</button>
      </form>
    </section>}
  </Shell>;
}
