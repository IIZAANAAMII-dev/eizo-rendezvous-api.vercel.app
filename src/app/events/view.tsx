import type { ReactNode } from 'react';
import { type Booking, type Event, bookingStatusLabels, bookingStatuses, dayKey, initials, inWeek, totals, weekKey, type Query } from '@/lib/rdv';
import { change } from './actions';
import styles from './events.module.css';

export function Shell({children,control}: {children:ReactNode;control?:ReactNode}) {
  return <div className={styles.shell}><header><strong>EIZO<span> / </span>Events</strong>{control}</header>
    <main>{children}</main></div>;
}

const dayFormat = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'short'});
const stampFormat = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const timeFormat = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'});

function mondayOf(date: Date | string) {
  return weekKey(date);
}
function shiftWeek(week: string, delta: number) {
  const date = new Date(week+'T12:00:00Z');
  date.setUTCDate(date.getUTCDate()+delta*7);
  return date.toISOString().slice(0,10);
}
function weekDays(week: string) {
  const start = new Date(week+'T12:00:00Z');
  return Array.from({length:7},(_,index)=>{
    const date = new Date(start); date.setUTCDate(start.getUTCDate()+index);
    return date.toISOString().slice(0,10);
  });
}
const active = (row:Booking) => row.status==='pending' || row.status==='confirmed';

function LatestCard({rows}:{rows:Booking[]}) {
  return <section className={styles.card}><div className={styles.heading}><h2>Derniers rendez-vous</h2></div>
    <ul className={styles.latest}>
      {rows.slice(0,8).map(row=><li key={row.id}>
        <span className={styles.avatar}>{initials(row.customer_name)}</span>
        <span className={styles.latestMain}><strong>{row.customer_name}</strong>
          <small>{[row.customer_email,row.customer_phone].filter(Boolean).join(' · ')}</small></span>
        <time dateTime={row.created_at}>{stampFormat.format(new Date(row.created_at))}</time>
      </li>)}
      {!rows.length && <li>Aucun rendez-vous pour le moment.</li>}
    </ul>
  </section>;
}

function WeeklyCard({rows,query,event,demo}:{rows:Booking[];query:Record<string,string|undefined>;event?:Event;demo?:boolean}) {
  const base = (demo ? '/events/demo' : '/events')+'?'+(event ? 'event='+event.slug : 'vue=global');
  const currentWeek = mondayOf(new Date());
  const requested = /^\d{4}-\d{2}-\d{2}$/.test(query.semaine ?? '') ? query.semaine! : currentWeek;
  const requestedMonday = mondayOf(requested);
  const week = requestedMonday > currentWeek ? currentWeek : requestedMonday;
  const previous = shiftWeek(week,-1);
  const next = shiftWeek(week,1);
  const weekRows = rows.filter(row=>inWeek(row,week));
  const previousRows = rows.filter(row=>inWeek(row,previous));
  const confirmed = weekRows.filter(row=>row.status==='confirmed').length;
  const pending = weekRows.filter(row=>row.status==='pending').length;
  const refused = weekRows.filter(row=>['refused','cancelled','no_show'].includes(row.status)).length;
  const days = weekDays(week);
  const daily = days.map(day=>[day,weekRows.filter(row=>dayKey(row.created_at)===day).length] as const);
  const max = Math.max(1,...daily.map(([,count])=>count));
  const diff = weekRows.length - previousRows.length;
  const pct = previousRows.length ? Math.round(diff/previousRows.length*100) : null;
  const fmt = (value:string) => dayFormat.format(new Date(value+'T12:00:00Z'));
  return <section className={styles.card}>
    <div className={styles.heading}><h2>Synthèse hebdomadaire</h2>
      <nav className={styles.weeknav}>
        <a href={base+'&semaine='+previous} aria-label="Semaine précédente">←</a>
        <strong>Semaine du {fmt(week)}</strong>
        {next<=currentWeek && <a href={base+'&semaine='+next} aria-label="Semaine suivante">→</a>}
      </nav></div>
    <div className={styles.weekstats}>
      <div><span>Nouveaux rendez-vous</span><strong>{weekRows.length}</strong></div>
      <div><span>Total actifs</span><strong>{rows.filter(active).length}</strong></div>
      <div><span>vs semaine précédente</span><strong className={diff>=0?styles.up:styles.down}>
        {diff>=0?'+':''}{diff}{pct!==null && ' · '+(pct>=0?'+':'')+pct+' %'}</strong>
        <small>{previousRows.length} la semaine du {fmt(previous)}</small></div>
    </div>
    <div className={styles.statusline}>
      <span><i className={styles.dotConfirm}/>{confirmed} confirmé{confirmed>1?'s':''}</span>
      <span><i className={styles.dotPending}/>{pending} en attente</span>
      <span><i className={styles.dotRefused}/>{refused} refusé{refused>1?'s':''}/annulé{refused>1?'s':''}</span>
    </div>
    <div className={styles.weekchart}>{daily.map(([day,count])=><div key={day}>
      <strong>{count||''}</strong><span style={{height:Math.round(count/max*90)}} />
      <small>{['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'][days.indexOf(day)]}</small>
    </div>)}</div>
    <div className={styles.heading}><h3>Nouveaux rendez-vous · {weekRows.length}</h3>
      {!demo && <a href={'/events/export?'+(event?'event='+event.slug:'')+'&type=semaine&semaine='+week}>Exporter la semaine (CSV)</a>}</div>
    <ul className={styles.latest}>
      {weekRows.slice(0,12).map(row=><li key={row.id}>
        <span className={styles.avatar}>{initials(row.customer_name)}</span>
        <span className={styles.latestMain}><strong>{row.customer_name}</strong>
          <small>{[row.customer_email,row.customer_phone].filter(Boolean).join(' · ')}</small></span>
        <time dateTime={row.created_at}>{dayFormat.format(new Date(row.created_at))}</time>
      </li>)}
      {!weekRows.length && <li>Aucun rendez-vous sur cette semaine.</li>}
    </ul>
  </section>;
}

function formatSlot(row:Booking) {
  return dayFormat.format(new Date(row.date+'T12:00:00Z'))+' · '+timeFormat.format(new Date('2000-01-01T'+row.start_time))+'–'+timeFormat.format(new Date('2000-01-01T'+row.end_time));
}

export function Dashboard({event,events,rows,query,admin,demo}:{
  event?:Event; events:Event[]; rows:Booking[]; query:Record<string,string|undefined>; admin?:boolean; demo?:boolean;
}) {
  const scoped = event ? rows.filter(row=>row.organizer_id===event.id) : rows;
  const eventName = new Map(events.map(e=>[e.id,e.name]));
  const today = dayKey(new Date());
  const week = weekKey(new Date());
  const lastWeek = shiftWeek(week,-1);
  const weekly = query.period !== 'jour';
  const series = totals(scoped,weekly).slice(0,10).reverse();
  const max = Math.max(1,...series.map(([,count])=>count));
  const currentWeekCount = scoped.filter(row=>weekKey(row.created_at)===week).length;
  const lastWeekCount = scoped.filter(row=>weekKey(row.created_at)===lastWeek).length;
  const search = query.q?.trim().toLowerCase() ?? '';
  const matches = scoped.filter(row =>
    (!query.status || query.status===row.status) &&
    (!query.from || dayKey(row.date)>=query.from) &&
    (!query.to || dayKey(row.date)<=query.to) &&
    [row.customer_name,row.customer_email,row.customer_phone??'',row.customer_need??'',row.customer_usage??'',eventName.get(row.organizer_id)??'']
      .some(value=>value.toLowerCase().includes(search)));
  const page = Math.min(Math.max(1,Number.parseInt(query.page ?? '1',10)||1),Math.max(1,Math.ceil(matches.length/25)));
  const pager = new URLSearchParams();
  for (const key of ['q','status','from','to','period']) if (query[key]) pager.set(key,query[key]!);
  const qs = event ? 'event='+event.slug : 'vue=global';
  const app = demo ? '/events/demo' : '/events';
  const base = app+'?'+qs;
  return <div className={styles.grid}>
    <aside className={styles.sidebar}>
      <h2>Événements</h2>
      <a aria-current={!event?'page':undefined} href={app+'?vue=global'}>
        Vue d'ensemble<small>{rows.filter(active).length} RDV actifs</small></a>
      {events.map(item=>{
        const count = rows.filter(row=>row.organizer_id===item.id && active(row)).length;
        return <a aria-current={event?.id===item.id?'page':undefined} key={item.id} href={app+'?event='+item.slug}>
          {item.name}{item.specialty && <small>{item.specialty}</small>}
          <small>{count} RDV actifs</small></a>;})}
    </aside>
    <div className={styles.content}>
      <div className={styles.hero}>
        <p className={styles.demo}>EIZO France · suivi des rendez-vous</p>
        <h1>{event ? event.name : 'Synthèse globale des rendez-vous'}</h1>
        {event?.event_start_date && <p>
          <time dateTime={event.event_start_date}>{event.event_start_date.split('-').reverse().join('/')}</time>
          {event.event_end_date && event.event_end_date!==event.event_start_date && <> – <time dateTime={event.event_end_date}>{event.event_end_date.split('-').reverse().join('/')}</time></>}
          {event.venue_name && <> · {event.venue_name}{event.venue_location ? ' — '+event.venue_location : ''}</>}
        </p>}
        {!event && <p>{events.length} événement{events.length>1?'s':''} · {rows.length} rendez-vous enregistrés</p>}
      </div>
      <div className={styles.metrics}>{[
        ['Rendez-vous',scoped.filter(active).length],
        ['Aujourd’hui',scoped.filter(r=>dayKey(r.date)===today && active(r)).length],
        ['Cette semaine',currentWeekCount],
        ['Confirmés',scoped.filter(r=>r.status==='confirmed').length],
      ].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong>
        {label==='Cette semaine' && <small>Demandes reçues · semaine précédente {lastWeekCount}</small>}
      </div>)}</div>
      <LatestCard rows={scoped}/>
      <WeeklyCard rows={scoped} query={query} event={event} demo={demo}/>
      <section className={styles.card}><div className={styles.heading}><h2>Évolution des demandes</h2>
        <nav><a aria-current={!weekly?'page':undefined} href={base+'&period=jour'}>Jour</a><a aria-current={weekly?'page':undefined} href={base+'&period=semaine'}>Semaine</a></nav></div>
        {series.length ? <div className={styles.chart}>{series.map(([date,count])=><div key={date}>
          <strong>{count}</strong><span style={{height:Math.round(count/max*110)}} /><small>{date.slice(8)}/{date.slice(5,7)}</small>
        </div>)}</div> : <p>Aucune demande enregistrée.</p>}
        {!demo && <div className={styles.links}><a href={'/events/export?'+qs+'&type=jour'}>Synthèse quotidienne CSV</a>
          <a href={'/events/export?'+qs+'&type=semaine'}>Synthèse hebdomadaire CSV</a></div>}
      </section>
      <section className={styles.card}><div className={styles.heading}><h2>Rendez-vous <small>{matches.length}</small></h2>
        {!demo && <div className={styles.links}>
          <a href={'/events/export?'+qs+'&format=xlsx'}>Exporter Excel</a>
          <a href={'/events/export?'+qs}>Exporter CSV</a></div>}</div>
        <form className={styles.fields} action={app}>
          {event ? <input type="hidden" name="event" value={event.slug}/>
            : <input type="hidden" name="vue" value="global"/>}
          <input type="hidden" name="period" value={weekly?'semaine':'jour'}/>
          <label>Recherche<input name="q" defaultValue={query.q} placeholder="Nom, e-mail, téléphone, besoin…"/></label>
          <label>Statut<select name="status" defaultValue={query.status}><option value="">Tous</option>
            {bookingStatuses.map(s=><option key={s} value={s}>{bookingStatusLabels[s]}</option>)}</select></label>
          <label>Du<input type="date" name="from" defaultValue={query.from}/></label>
          <label>Au<input type="date" name="to" defaultValue={query.to}/></label>
          <button>Filtrer</button>
        </form>
        <div className={styles.table}><table><thead><tr>
          <th>Participant</th>{!event&&<th>Événement</th>}<th>Créneau</th><th>Statut</th><th>Bouton</th>{!demo&&admin&&<th>Suivi</th>}
        </tr></thead>
        <tbody>{matches.slice((page-1)*25,page*25).map(row=><tr key={row.id}>
          <td><strong>{row.customer_name}</strong>
            <small>{row.customer_email}{row.customer_phone ? ' · '+row.customer_phone : ''}</small>
            {(row.customer_need || row.customer_usage) && <small>{[row.customer_need,row.customer_usage].filter(Boolean).join(' · ')}</small>}
          </td>
          {!event && <td>{eventName.get(row.organizer_id) ?? '—'}</td>}
          <td>{formatSlot(row)}</td>
          <td><span className={styles['status-'+row.status]}>{bookingStatusLabels[row.status]}</span></td>
          <td>{row.requested_product?.title || row.product_title || '—'}</td>
          {!demo && admin && <td><details><summary>Statut</summary><form action={change}>
            <input type="hidden" name="action" value="status"/><input type="hidden" name="id" value={row.id}/>
            {event && <input type="hidden" name="event" value={event.slug}/>}
            {!event && <input type="hidden" name="vue" value="global"/>}
            <label>Statut<select name="status" defaultValue={row.status}>
              {bookingStatuses.map(s=><option key={s} value={s}>{bookingStatusLabels[s]}</option>)}</select></label>
            <button>Enregistrer</button>
          </form></details></td>}
        </tr>)}</tbody></table></div>
        {!matches.length && <p>Aucun rendez-vous pour cette sélection.</p>}
        <div className={styles.links}>{page>1&&<a href={base+'&'+pager+'&page='+(page-1)}>Précédent</a>}
        {page*25<matches.length&&<a href={base+'&'+pager+'&page='+(page+1)}>Suivant</a>}</div>
      </section>
    </div>
  </div>;
}
