import type { CSSProperties, ReactNode } from 'react';
import { type Booking, type Event, bookingStatusLabels, bookingStatuses, dayKey, initials, inWeek, totals, weekKey } from '@/lib/rdv';
import { change, login } from './actions';
import { Motion } from './motion';
import styles from './events.module.css';

const FONTS = 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Manrope:wght@500;600;700;800&display=swap';

export function Shell({children,control,who}: {children:ReactNode;control?:ReactNode;who?:ReactNode}) {
  return <div className={styles.shell}>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
    <link rel="stylesheet" href={FONTS} />
    <script dangerouslySetInnerHTML={{__html:"try{if(sessionStorage.getItem('eizo-intro'))document.documentElement.dataset.intro='seen';else sessionStorage.setItem('eizo-intro','1')}catch(e){}"}} />
    <div className={styles.intro} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/media/EIZO-Logo_RGB.avif" alt="" width="200" height="80" /><span /><small>EIZO France · Events</small>
    </div>
    <div className={styles.glow} aria-hidden="true" />
    <header className={styles.topbar}>
      <a href="/events" className={styles.brand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/media/EIZO-Logo_RGB.avif" alt="EIZO" width="78" height="31" /><i /><span>Events</span></a>
      <span className={styles.live}><i />Données en direct · Supabase</span>
      <div className={styles.topright}>{who}{control}</div>
    </header>
    <main className={styles.main}>{children}</main>
    <footer className={styles.footer}><span>EIZO France · Feeder</span><span>Usage interne — ne pas diffuser</span></footer>
    <Motion />
  </div>;
}

const dayFormat = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'short'});
const longDateFormat = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',weekday:'long',day:'numeric',month:'long',year:'numeric'});
const longDate = {format:(date:Date)=>{const text=longDateFormat.format(date);return text.charAt(0).toUpperCase()+text.slice(1);}};
const stampFormat = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const timeFormat = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'});

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
const delay = (index:number) => ({'--d':`${index*70}ms`} as CSSProperties);

/** Titre découpé en mots pour l'apparition ligne à ligne. */
function Title({text,accent}:{text:string;accent?:string}) {
  const words = text.split(' ');
  return <h1 className={styles.title} data-reveal>
    {words.map((word,index)=><span key={index} className={styles.word}><span style={delay(index)}>{word}</span></span>)}
    {accent && <span className={styles.word}><em style={delay(words.length)}>{accent}<i>.</i></em></span>}
  </h1>;
}

function Metric({label,value,note,index}:{label:string;value:number;note?:string;index:number}) {
  return <div className={styles.metric} data-reveal style={delay(index)}>
    <span className={styles.metricLabel}><b>0{index+1}</b>{label}</span>
    <strong data-count={value}>{value}</strong>
    {note && <small>{note}</small>}
  </div>;
}

function Person({row,meta}:{row:Booking;meta:ReactNode}) {
  return <li>
    <span className={styles.avatar}>{initials(row.customer_name)}</span>
    <span className={styles.personMain}><strong>{row.customer_name}</strong>
      <small>{row.customer_need || [row.customer_email,row.customer_phone].filter(Boolean).join(' · ')}</small></span>
    <span className={styles.personMeta}>{meta}</span>
  </li>;
}

function StatusRing({rows}:{rows:Booking[]}) {
  const confirmed = rows.filter(r=>r.status==='confirmed').length;
  const pending = rows.filter(r=>r.status==='pending').length;
  const closed = rows.length - confirmed - pending;
  const total = Math.max(1,rows.length);
  const a = confirmed/total*100, b = (confirmed+pending)/total*100;
  return <section className={`${styles.card} ${styles.ringCard}`} data-reveal>
    <header className={styles.cardHead}><span className={styles.kicker}>Statuts</span><h2>Répartition</h2></header>
    <div className={styles.ring} style={{'--a':a+'%','--b':b+'%'} as CSSProperties}>
      <div><strong data-count={rows.length}>{rows.length}</strong><small>demandes</small></div>
    </div>
    <ul className={styles.legend}>
      <li><i className={styles.dotConfirm}/>Confirmés<b>{confirmed}</b></li>
      <li><i className={styles.dotPending}/>En attente<b>{pending}</b></li>
      <li><i className={styles.dotRefused}/>Refusés, annulés, autres<b>{closed}</b></li>
    </ul>
  </section>;
}

function WeeklyCard({rows,query,base,demo,exportBase}:{rows:Booking[];query:Record<string,string|undefined>;base:string;demo?:boolean;exportBase:string}) {
  const currentWeek = weekKey(new Date());
  const requested = /^\d{4}-\d{2}-\d{2}$/.test(query.semaine ?? '') ? weekKey(query.semaine!) : currentWeek;
  const week = requested > currentWeek ? currentWeek : requested;
  const previous = shiftWeek(week,-1);
  const next = shiftWeek(week,1);
  const weekRows = rows.filter(row=>inWeek(row,week));
  const previousRows = rows.filter(row=>inWeek(row,previous));
  const days = weekDays(week);
  const daily = days.map(day=>[day,weekRows.filter(row=>dayKey(row.created_at)===day).length] as const);
  const max = Math.max(1,...daily.map(([,count])=>count));
  const diff = weekRows.length - previousRows.length;
  const pct = previousRows.length ? Math.round(diff/previousRows.length*100) : null;
  const fmt = (value:string) => dayFormat.format(new Date(value+'T12:00:00Z'));
  return <section className={`${styles.card} ${styles.weekCard}`} data-reveal id="semaine">
    <header className={styles.cardHead}>
      <span className={styles.kicker}>Synthèse hebdomadaire</span>
      <h2>Semaine du <em>{fmt(week)}</em></h2>
      <nav className={styles.weeknav}>
        <a href={base+'&semaine='+previous+'#semaine'} aria-label="Semaine précédente" data-magnet>←</a>
        {next<=currentWeek ? <a href={base+'&semaine='+next+'#semaine'} aria-label="Semaine suivante" data-magnet>→</a> : <span aria-hidden="true">→</span>}
      </nav>
    </header>
    <div className={styles.weekGrid}>
      <div className={styles.bigNumber}>
        <strong data-count={weekRows.length}>{weekRows.length}</strong>
        <span>nouvelles demandes</span>
        <span className={diff>=0?styles.up:styles.down}>{diff>=0?'↗ +':'↘ '}{diff}{pct!==null && ` · ${pct>=0?'+':''}${pct} %`}
          <small> vs semaine du {fmt(previous)} ({previousRows.length})</small></span>
      </div>
      <div className={styles.bars}>{daily.map(([day,count],index)=><div key={day} style={delay(index)}>
        <b>{count||''}</b>
        <span><i style={{'--h':Math.round(count/max*100)+'%'} as CSSProperties} /></span>
        <small>{['L','M','M','J','V','S','D'][index]}</small>
      </div>)}</div>
    </div>
    <ul className={styles.people}>
      {weekRows.slice(0,6).map(row=><Person key={row.id} row={row} meta={<>{bookingStatusLabels[row.status]}<time dateTime={row.created_at}>{dayFormat.format(new Date(row.created_at))}</time></>}/>)}
      {!weekRows.length && <li className={styles.empty}>Aucune demande cette semaine.</li>}
    </ul>
    {!demo && <a className={styles.textLink} href={exportBase+'&type=semaine&semaine='+week}>Exporter la semaine (CSV) ↗</a>}
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
  const series = totals(scoped,weekly).slice(0,12).reverse();
  const max = Math.max(1,...series.map(([,count])=>count));
  const currentWeekCount = scoped.filter(row=>weekKey(row.created_at)===week).length;
  const lastWeekCount = scoped.filter(row=>weekKey(row.created_at)===lastWeek).length;
  const search = query.q?.trim().toLowerCase() ?? '';
  const matches = scoped.filter(row =>
    (!query.status || query.status===row.status) &&
    (!query.from || dayKey(row.date)>=query.from) &&
    (!query.to || dayKey(row.date)<=query.to) &&
    [row.customer_name,row.customer_email,row.customer_phone??'',row.customer_need??'',row.customer_usage??'',row.customer_notes??'',eventName.get(row.organizer_id)??'']
      .some(value=>value.toLowerCase().includes(search)));
  const page = Math.min(Math.max(1,Number.parseInt(query.page ?? '1',10)||1),Math.max(1,Math.ceil(matches.length/25)));
  const pager = new URLSearchParams();
  for (const key of ['q','status','from','to','period']) if (query[key]) pager.set(key,query[key]!);
  const qs = event ? 'event='+event.slug : 'vue=global';
  const app = demo ? '/events/demo' : '/events';
  const base = app+'?'+qs;
  const exportBase = '/events/export?'+qs;
  const single = events.length === 1;
  const titleText = event ? event.name.replace(/\s+\d{4}$/,'') : (single ? events[0].name.replace(/\s+\d{4}$/,'') : 'Rendez-vous');
  const titleAccent = event ? (event.name.match(/\d{4}$/)?.[0] ?? event.specialty ?? undefined) : (single ? events[0].name.match(/\d{4}$/)?.[0] : 'tous événements');

  return <div className={styles.page}>
    <section className={styles.hero}>
      <p className={styles.kicker} data-reveal>Tableau de bord · {longDate.format(new Date())}</p>
      <Title text={titleText} accent={titleAccent} />
      <div className={styles.heroMeta} data-reveal>
        {event?.event_start_date ? <p>
          <time dateTime={event.event_start_date}>{longDate.format(new Date(event.event_start_date+'T12:00:00Z'))}</time>
          {event.venue_name && <> — {event.venue_name}{event.venue_location ? ', '+event.venue_location : ''}</>}
        </p> : <p>{events.length} événement{events.length>1?'s':''} suivi{events.length>1?'s':''} · {rows.length} demande{rows.length>1?'s':''} au total</p>}
        {!demo && <div className={styles.actions}>
          <a className={styles.button} href={exportBase+'&format=xlsx'} data-magnet>Export Excel <span>↓</span></a>
          <a className={styles.ghost} href="#rendez-vous">Voir les rendez-vous <span>↘</span></a>
        </div>}
      </div>
    </section>

    {events.length > 1 && <nav className={styles.tabs} aria-label="Événements" data-reveal>
      <a aria-current={!event?'page':undefined} href={app+'?vue=global'}>Vue d’ensemble<b>{rows.filter(active).length}</b></a>
      {events.map(item=>{
        const count = rows.filter(row=>row.organizer_id===item.id && active(row)).length;
        return <a aria-current={event?.id===item.id?'page':undefined} key={item.id} href={app+'?event='+item.slug}>
          {item.name}{item.venue_name && <small>{item.venue_name}</small>}<b>{count}</b></a>;})}
    </nav>}

    <section className={styles.metrics}>
      <Metric index={0} label="Demandes actives" value={scoped.filter(active).length} note="En attente + confirmées" />
      <Metric index={1} label="Cette semaine" value={currentWeekCount} note={`Semaine précédente : ${lastWeekCount}`} />
      <Metric index={2} label="Confirmées" value={scoped.filter(r=>r.status==='confirmed').length} />
      <Metric index={3} label="RDV aujourd’hui" value={scoped.filter(r=>dayKey(r.date)===today && active(r)).length} />
    </section>

    <div className={styles.marquee} aria-hidden="true"><div>
      {Array.from({length:2},(_,copy)=><span key={copy}>
        {(event ? [event] : events).map(item=><span key={item.id}>{item.name}<i>✳</i></span>)}
        <span>Au-delà de l’écran<i>✳</i></span><span>Au cœur de chaque décision<i>✳</i></span><span>{rows.length} demandes suivies<i>✳</i></span>
      </span>)}
    </div></div>

    <div className={styles.bento}>
      <WeeklyCard rows={scoped} query={query} base={base} demo={demo} exportBase={exportBase}/>
      <StatusRing rows={scoped}/>
      <section className={`${styles.card} ${styles.chartCard}`} data-reveal>
        <header className={styles.cardHead}><span className={styles.kicker}>Évolution</span><h2>Demandes par {weekly?'semaine':'jour'}</h2>
          <nav className={styles.switch}><a aria-current={!weekly?'page':undefined} href={base+'&period=jour'}>Jour</a><a aria-current={weekly?'page':undefined} href={base+'&period=semaine'}>Semaine</a></nav></header>
        {series.length ? <div className={styles.chart}>{series.map(([date,count],index)=><div key={date} style={delay(index)}>
          <b>{count}</b><span><i style={{'--h':Math.round(count/max*100)+'%'} as CSSProperties}/></span><small>{date.slice(8)}/{date.slice(5,7)}</small>
        </div>)}</div> : <p className={styles.empty}>Aucune demande enregistrée.</p>}
        {!demo && <div className={styles.linkRow}><a className={styles.textLink} href={exportBase+'&type=jour'}>Synthèse quotidienne CSV ↗</a>
          <a className={styles.textLink} href={exportBase+'&type=semaine'}>Synthèse hebdomadaire CSV ↗</a></div>}
      </section>
      <section className={`${styles.card} ${styles.latestCard}`} data-reveal>
        <header className={styles.cardHead}><span className={styles.kicker}>Fil</span><h2>Dernières demandes</h2></header>
        <ul className={styles.people}>
          {scoped.slice(0,7).map(row=><Person key={row.id} row={row} meta={<time dateTime={row.created_at}>{stampFormat.format(new Date(row.created_at))}</time>}/>)}
          {!scoped.length && <li className={styles.empty}>Aucune demande pour le moment.</li>}
        </ul>
      </section>
    </div>

    <section className={`${styles.card} ${styles.tableCard}`} id="rendez-vous" data-reveal>
      <header className={styles.cardHead}><span className={styles.kicker}>Registre</span><h2>Rendez-vous <em>{matches.length}</em></h2>
        {!demo && <div className={styles.linkRow}><a className={styles.textLink} href={exportBase+'&format=xlsx'}>Excel ↓</a><a className={styles.textLink} href={exportBase}>CSV ↓</a></div>}</header>
      <form className={styles.filters} action={app+'#rendez-vous'}>
        {event ? <input type="hidden" name="event" value={event.slug}/> : <input type="hidden" name="vue" value="global"/>}
        <input type="hidden" name="period" value={weekly?'semaine':'jour'}/>
        <label className={styles.searchField}>Recherche<input name="q" defaultValue={query.q} placeholder="Nom, e-mail, société, message…"/></label>
        <label>Statut<select name="status" defaultValue={query.status}><option value="">Tous</option>
          {bookingStatuses.map(s=><option key={s} value={s}>{bookingStatusLabels[s]}</option>)}</select></label>
        <label>Du<input type="date" name="from" defaultValue={query.from}/></label>
        <label>Au<input type="date" name="to" defaultValue={query.to}/></label>
        <button data-magnet>Filtrer</button>
      </form>
      <div className={styles.table}><table><thead><tr>
        <th>Participant</th>{!event&&<th>Événement</th>}<th>Créneau</th><th>Statut</th><th>Demande</th>{!demo&&admin&&<th>Suivi</th>}
      </tr></thead>
      <tbody>{matches.slice((page-1)*25,page*25).map(row=><tr key={row.id}>
        <td><strong>{row.customer_name}</strong>
          <small>{row.customer_email}{row.customer_phone ? ' · '+row.customer_phone : ''}</small>
          {row.customer_notes && <small className={styles.quote}>« {row.customer_notes} »</small>}
        </td>
        {!event && <td>{eventName.get(row.organizer_id) ?? '—'}</td>}
        <td>{row.source==='registration' && row.customer_usage ? row.customer_usage.replace('Créneau : ','') : formatSlot(row)}</td>
        <td><span className={`${styles.status} ${styles['status-'+row.status] ?? ''}`}>{bookingStatusLabels[row.status]}</span></td>
        <td>{[row.customer_need, row.requested_product?.title || row.product_title].filter(Boolean).join(' · ') || '—'}
          <small>reçue le {stampFormat.format(new Date(row.created_at))}</small></td>
        {!demo && admin && <td><details className={styles.editor}><summary>Modifier</summary><form action={change}>
          <input type="hidden" name="action" value="status"/><input type="hidden" name="id" value={row.id}/><input type="hidden" name="source" value={row.source ?? 'booking'}/>
          {event && <input type="hidden" name="event" value={event.slug}/>}
          <label>Statut<select name="status" defaultValue={row.status}>
            {bookingStatuses.map(s=><option key={s} value={s}>{bookingStatusLabels[s]}</option>)}</select></label>
          <button>Enregistrer</button>
        </form></details></td>}
      </tr>)}</tbody></table></div>
      {!matches.length && <p className={styles.empty}>Aucun rendez-vous pour cette sélection.</p>}
      <div className={styles.pager}>{page>1&&<a href={base+'&'+pager+'&page='+(page-1)+'#rendez-vous'}>← Précédent</a>}
        <span>Page {page} / {Math.max(1,Math.ceil(matches.length/25))}</span>
        {page*25<matches.length&&<a href={base+'&'+pager+'&page='+(page+1)+'#rendez-vous'}>Suivant →</a>}</div>
    </section>
  </div>;
}

export function Login({refused}:{refused?:boolean}) {
  return <section className={styles.login}>
    <div className={styles.loginIntro}>
      <p className={styles.kicker} data-reveal>Accès équipe</p>
      <Title text="Suivi des" accent="rendez-vous" />
      <p data-reveal>Chaque personne ne voit que les événements qui lui sont attribués.</p>
    </div>
    <form action={login} className={styles.loginForm} data-reveal>
      {refused && <p role="alert" className={styles.alert}>Connexion refusée.</p>}
      <label>Adresse professionnelle<input name="email" type="email" autoComplete="username" required /></label>
      <label>Mot de passe<input name="password" type="password" autoComplete="current-password" required /></label>
      <button data-magnet>Se connecter <span>↗</span></button>
    </form>
  </section>;
}
