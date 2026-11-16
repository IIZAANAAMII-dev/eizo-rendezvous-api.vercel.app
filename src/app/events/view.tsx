import type { ReactNode } from 'react';
import { type Event, type Participant, period, statuses, totals } from '@/lib/events';
import { change } from './actions';
import styles from './events.module.css';

export function Shell({children,control}: {children:ReactNode;control?:ReactNode}) {
  return <div className={styles.shell}><header><strong>EIZO<span> / </span>Events</strong>{control}</header>
    <main>{children}</main></div>;
}
export function Dashboard({event,events,rows,query,admin,demo}:{
  event?:Event; events:Event[]; rows:Participant[]; query:Record<string,string|undefined>; admin?:boolean; demo?:boolean;
}) {
  if (!event) return <h1>Événements</h1>;
  const root = demo ? '/events/demo' : '/events';
  const base = root + '?event=' + event.slug;
  const weekly = query.period !== 'jour';
  const series = totals(rows,weekly).slice(0,10).reverse();
  const max = Math.max(1,...series.map(([,count])=>count));
  const today = period(new Date(),false);
  const week = period(new Date(),true);
  const lastWeek = new Date(week);
  lastWeek.setUTCDate(lastWeek.getUTCDate()-7);
  const currentWeekCount = rows.filter(row=>period(new Date(row.registered_at),true)===week).length;
  const lastWeekCount = rows.filter(row=>period(new Date(row.registered_at),true)===lastWeek.toISOString().slice(0,10)).length;
  const search = query.q?.trim().toLowerCase() ?? '';
  const matches = rows.filter(row =>
    (!query.status || query.status===row.status) &&
    (!query.from || period(new Date(row.registered_at),false)>=query.from) &&
    (!query.to || period(new Date(row.registered_at),false)<=query.to) &&
    [row.name,row.company,row.sector].some(value=>value.toLowerCase().includes(search)));
  const page = Math.min(Math.max(1,Number.parseInt(query.page ?? '1',10)||1),Math.max(1,Math.ceil(matches.length/25)));
  const pager = new URLSearchParams();
  for (const key of ['q','status','from','to','period']) if (query[key]) pager.set(key,query[key]!);
  return <div className={styles.grid}>
    <aside className={styles.sidebar}><h2>Événements</h2>{events.map(item=>
      <a aria-current={item.slug===event.slug?'page':undefined} key={item.slug} href={root+'?event='+item.slug}>
        {item.title}{item.registrations !== undefined && <small>{item.registrations} inscriptions</small>}
      </a>)}</aside>
    <div className={styles.content}>
      <div className={styles.hero}>
        {demo && <p className={styles.demo}>Démonstration · données fictives</p>}
        <h1>{event.title}</h1>
        {event.starts_on && <p><time dateTime={event.starts_on}>{event.starts_on.split('-').reverse().join('/')}</time></p>}
        {demo && <a href="/events/demo/synthese">Voir l’e-mail de synthèse</a>}
      </div>
      <div className={styles.metrics}>{[
        ['Inscriptions',rows.length],
        ['Aujourd’hui',rows.filter(r=>period(new Date(r.registered_at),false)===today).length],
        ['Cette semaine',currentWeekCount],
        ['Entreprises',new Set(rows.map(r=>r.company.trim().toLowerCase()).filter(Boolean)).size],
      ].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong>
        {label==='Cette semaine' && <small>Semaine précédente · {lastWeekCount}</small>}
      </div>)}</div>
      <section className={styles.card}><div className={styles.heading}><h2>Évolution des inscriptions</h2>
        <nav><a aria-current={!weekly?'page':undefined} href={base+'&period=jour'}>Jour</a><a aria-current={weekly?'page':undefined} href={base+'&period=semaine'}>Semaine</a></nav></div>
        {series.length ? <div className={styles.chart}>{series.map(([date,count])=><div key={date}>
          <strong>{count}</strong><span style={{height:Math.round(count/max*110)}} /><small>{date.slice(8)}/{date.slice(5,7)}</small>
        </div>)}</div> : <p>Aucune inscription enregistrée.</p>}
        {!demo && <div className={styles.links}><a href={base.replace('/events?', '/events/export?')+'&type=jour'}>Synthèse quotidienne CSV</a>
          <a href={base.replace('/events?', '/events/export?')+'&type=semaine'}>Synthèse hebdomadaire CSV</a></div>}
      </section>
      <section className={styles.card}><div className={styles.heading}><h2>Participants <small>{matches.length}</small></h2>
        {!demo && <a href={'/events/export?event='+event.slug}>Exporter tous les participants</a>}</div>
        <form className={styles.fields} action={root}>
          <input type="hidden" name="event" value={event.slug}/><input type="hidden" name="period" value={weekly?'semaine':'jour'}/>
          <label>Recherche<input name="q" defaultValue={query.q} placeholder="Nom, entreprise, secteur…"/></label>
          <label>Statut<select name="status" defaultValue={query.status}><option value="">Tous</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></label>
          <label>Du<input type="date" name="from" defaultValue={query.from}/></label><label>Au<input type="date" name="to" defaultValue={query.to}/></label>
          <button>Filtrer</button>
        </form>
        <div className={styles.table}><table><thead><tr><th>Participant</th><th>Entreprise</th><th>Secteur</th><th>Inscription</th><th>Statut</th>{!demo&&<th>Suivi</th>}</tr></thead>
        <tbody>{matches.slice((page-1)*25,page*25).map(row=><tr key={row.id}>
          <td><strong>{row.name}</strong><small>{row.email}</small></td><td>{row.company || '—'}</td><td>{row.sector || '—'}</td>
          <td>{period(new Date(row.registered_at),false)}</td><td><span className={styles.status}>{row.status}</span></td>
          {!demo && <td><details><summary>Notes</summary>{admin ? <form action={change}>
            <input type="hidden" name="event" value={event.slug}/><input type="hidden" name="action" value="update"/><input type="hidden" name="id" value={row.id}/>
            <label>Statut<select name="status" defaultValue={row.status}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label>
            <label>Note interne<textarea name="notes" maxLength={3000} defaultValue={row.notes}/></label><button>Enregistrer</button>
          </form> : <p>{row.notes || 'Aucune note'}</p>}</details></td>}
        </tr>)}</tbody></table></div>
        {!matches.length && <p>Aucun participant pour cette sélection.</p>}
        <div className={styles.links}>{page>1&&<a href={base+'&'+pager+'&page='+(page-1)}>Précédent</a>}
        {page*25<matches.length&&<a href={base+'&'+pager+'&page='+(page+1)}>Suivant</a>}</div>
      </section>
      {admin && <section className={styles.card}><h2>Importer l’historique</h2><form action={change} className={styles.fields}>
        <input type="hidden" name="event" value={event.slug}/><input type="hidden" name="action" value="import"/>
        <label>Fichier JSON normalisé<input name="file" type="file" accept=".json,application/json" required/></label><button>Importer</button>
      </form></section>}
    </div>
  </div>;
}
