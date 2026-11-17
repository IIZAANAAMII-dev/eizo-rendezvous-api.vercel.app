import type { CSSProperties, ReactNode } from 'react';
import { type Booking, type Event, dayKey, initials, inWeek, isCounted, slotText, totals, weekKey } from '@/lib/rdv';
import { changeReportMode, invite, login, saveRegistration, sendPreview } from './actions';
import type { Member } from '@/lib/team';
import { formEvents } from '@/lib/registrations';
import { Motion, Submit } from './motion';
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
const stampFormat = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});

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
const delay = (index:number) => ({'--d':`${index*70}ms`} as CSSProperties);
const product = (row:Booking) => row.requested_product?.title || row.product_title || null;
const subtitle = (row:Booking) => [row.job_title, row.company].filter(Boolean).join(' · ') || row.customer_need || row.customer_email;

export type AdminData = {
  self: string; mailReady: boolean; nextSend: string | null;
  mode: { production: boolean; wanted: 'dev' | 'production'; dev: string; updatedBy: string | null; updatedAt: string | null };
  members: Member[]; history: { scope: string; cadence: string; period_start: string; sent_at: string | null }[];
  followed: { name: string; stop: string | null }[];
};

const NOTICES: Record<string,[string,'ok'|'ko']> = {
  'apercu-envoye': ['Aperçu de la synthèse envoyé dans votre boîte mail.','ok'],
  'apercu-aucun': ['Aucun événement suivi : pas de synthèse à envoyer.','ko'],
  'apercu-erreur': ['L’aperçu n’a pas pu être envoyé. Réessayez dans un instant.','ko'],
  'mode-equipe': ['La synthèse partira désormais à toute l’équipe.','ok'],
  'mode-test': ['La synthèse ne part plus qu’à vous (mode test).','ok'],
  'mode-confirmer': ['Cochez la case de confirmation pour envoyer la synthèse à toute l’équipe.','ko'],
  'invitation-envoyee': ['Invitation envoyée : la personne va recevoir un lien pour choisir son mot de passe.','ok'],
  'invitation-erreur': ['L’invitation n’a pas pu être envoyée.','ko'],
  'fiche-enregistree': ['Fiche mise à jour.','ok'],
  'fiche-ajoutee': ['Inscription ajoutée.','ok'],
  'fiche-doublon': ['Cette adresse e-mail est déjà inscrite à cet événement.','ko'],
  'fiche-erreur': ['Enregistrement impossible : vérifiez les champs.','ko'],
  'autorisation': ['Action réservée aux administrateurs.','ko'],
};
const frDate = (day: string) => new Intl.DateTimeFormat('fr-FR',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'}).format(new Date(day+'T12:00:00Z'));

/** Titre découpé en mots pour l'apparition ligne à ligne. */
export function Title({text,accent}:{text:string;accent?:string}) {
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
    <span className={styles.personMain}><strong>{row.customer_name}</strong><small>{subtitle(row)}</small></span>
    <span className={styles.personMeta}>{meta}</span>
  </li>;
}

/** Créneaux les plus demandés (remplace l'ancienne répartition par statut). */
function SlotsCard({rows}:{rows:Booking[]}) {
  const counts = new Map<string,number>();
  for (const row of rows) counts.set(slotText(row),(counts.get(slotText(row)) ?? 0)+1);
  const list = [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,8);
  const max = Math.max(1,...list.map(([,count])=>count));
  return <section className={`${styles.card} ${styles.ringCard}`} data-reveal>
    <header className={styles.cardHead}><span className={styles.kicker}>Agenda</span><h2>Créneaux demandés</h2></header>
    <ul className={styles.slots}>{list.map(([slot,count],index)=><li key={slot} style={delay(index)}>
      <span>{slot}</span><b>{count}</b><i style={{'--w':Math.round(count/max*100)+'%'} as CSSProperties} />
    </li>)}
    {!list.length && <li className={styles.empty}>Aucune demande pour le moment.</li>}</ul>
  </section>;
}

function WeeklyCard({rows,query,base,exportBase}:{rows:Booking[];query:Record<string,string|undefined>;base:string;exportBase:string}) {
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
  const fmt = (value:string) => dayFormat.format(new Date(value+'T12:00:00Z'));
  return <section className={`${styles.card} ${styles.weekCard}`} data-reveal id="semaine">
    <header className={styles.cardHead}>
      <span className={styles.kicker}>Synthèse de la semaine</span>
      <h2>Semaine du <em>{fmt(week)}</em></h2>
      <nav className={styles.weeknav}>
        <a href={base+'&semaine='+previous+'#semaine'} aria-label="Semaine précédente" data-magnet>←</a>
        {next<=currentWeek ? <a href={base+'&semaine='+next+'#semaine'} aria-label="Semaine suivante" data-magnet>→</a> : <span aria-hidden="true">→</span>}
      </nav>
    </header>
    <div className={styles.weekGrid}>
      <div className={styles.bigNumber}>
        <strong data-count={weekRows.length}>{weekRows.length}</strong>
        <span>nouvelle{weekRows.length>1?'s':''} demande{weekRows.length>1?'s':''}</span>
        <span className={diff>=0?styles.up:styles.down}>{diff>=0?'↗ +':'↘ '}{diff}<small> vs semaine du {fmt(previous)} ({previousRows.length})</small></span>
      </div>
      <div className={styles.bars}>{daily.map(([day,count],index)=><div key={day} style={delay(index)}>
        <b>{count||''}</b>
        <span><i style={{'--h':Math.round(count/max*100)+'%'} as CSSProperties} /></span>
        <small>{['L','M','M','J','V','S','D'][index]}</small>
      </div>)}</div>
    </div>
    <ul className={styles.people}>
      {weekRows.slice(0,6).map(row=><Person key={row.id} row={row} meta={<><span>{slotText(row)}</span><time dateTime={row.created_at}>{dayFormat.format(new Date(row.created_at))}</time></>}/>)}
      {!weekRows.length && <li className={styles.empty}>Aucune demande cette semaine.</li>}
    </ul>
    <a className={styles.textLink} href={exportBase+'&type=semaine&semaine='+week}>Exporter la semaine (CSV) ↗</a>
  </section>;
}

/** Fiche complète d'un rendez-vous : toutes les informations transmises. */
function Detail({row,eventName,editable,eventSlug}:{row:Booking;eventName?:string;editable?:boolean;eventSlug?:string}) {
  const fields: [string,ReactNode][] = [
    ['Entreprise', row.company],
    ['Fonction', row.job_title],
    ['E-mail', <a key="m" href={'mailto:'+row.customer_email}>{row.customer_email}</a>],
    ['Téléphone', row.customer_phone && <a key="t" href={'tel:'+row.customer_phone}>{row.customer_phone}</a>],
    ['Créneau', slotText(row)],
    ['Produit', product(row)],
    ['Besoin', row.customer_need],
    ['Usage', row.customer_usage],
    ['Événement', eventName],
    ['Reçue le', stampFormat.format(new Date(row.created_at))],
  ];
  return <article className={styles.detail}>
    <header>
      <span className={styles.avatar}>{initials(row.customer_name)}</span>
      <div><h3>{row.customer_name}</h3><p>{subtitle(row)}</p></div>
      <span className={styles.slotBadge}>{slotText(row)}</span>
    </header>
    <dl>{fields.filter(([,value])=>value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {row.customer_notes && <blockquote>« {row.customer_notes} »</blockquote>}
    {row.status==='cancelled' && <p className={styles.cancelled}>Annulé par le participant</p>}
    {row.origin?.startsWith('globo-import') && <p className={styles.origin}>Importée depuis Globo · détails à compléter</p>}
    {row.origin?.startsWith('manuel:') && <p className={styles.origin}>Ajoutée à la main par {row.origin.slice(7)}</p>}
    {editable && row.source==='registration' && <details className={styles.edit}>
      <summary>Compléter la fiche</summary>
      <RegistrationFields action={saveRegistration} row={row} eventSlug={eventSlug} submit="Enregistrer la fiche" />
    </details>}
  </article>;
}

function RegistrationFields({action,row,eventSlug,submit}:{action:(form:FormData)=>Promise<void>;row?:Booking;eventSlug?:string;submit:string}) {
  return <form action={action} className={styles.ficheForm}>
    {row && <input type="hidden" name="id" value={row.id}/>}
    {eventSlug && <input type="hidden" name="event" value={eventSlug}/>}
    <label>Prénom<input name="first_name" defaultValue={row?.first_name ?? ''} /></label>
    <label>Nom<input name="last_name" defaultValue={row?.last_name ?? ''} /></label>
    {!row && <label className={styles.wide}>E-mail<input name="email" type="email" required /></label>}
    <label>Entreprise<input name="company" defaultValue={row?.company ?? ''} /></label>
    <label>Fonction<input name="job_title" defaultValue={row?.job_title ?? ''} /></label>
    <label>Téléphone<input name="phone" type="tel" defaultValue={row?.customer_phone ?? ''} /></label>
    <label>Créneau<input name="slot" list="eizo-slots" defaultValue={row?.slot_label ?? ''} placeholder="Ex. : 10 h - 11 h" /></label>
    <label className={styles.wide}>Message<textarea name="message" rows={2} defaultValue={row?.customer_notes ?? ''} /></label>
    <Submit pending="Enregistrement…">{submit}</Submit>
  </form>;
}

function AdminPanel({data,event}:{data:AdminData;event?:Event}) {
  const {mode} = data;
  const others = data.members.filter(member=>member.email!==data.self);
  return <section className={styles.adminGrid} id="administration">
    <article className={`${styles.card} ${styles.adminCard}`} data-reveal>
      <header className={styles.cardHead}><span className={styles.kicker}>Administration</span><h2>Synthèse <em>e-mail</em></h2></header>
      <p className={styles.modeLine}><span className={mode.production ? styles.modeLive : styles.modeTest}>{mode.production ? 'Envoi à l’équipe' : 'Mode test'}</span>
        {mode.production ? 'Chaque destinataire reçoit la synthèse de ses événements.' : <>Seul <strong>{mode.dev}</strong> la reçoit.</>}</p>
      <dl className={styles.facts}>
        <div><dt>Rythme</dt><dd>Tous les 2 jours, vers 8 h</dd></div>
        <div><dt>Prochain envoi</dt><dd>{data.nextSend ? frDate(data.nextSend) : 'Aucun (événement terminé)'}</dd></div>
        {data.followed.map(item=><div key={item.name}><dt>Dernier envoi</dt><dd>{item.stop ? frDate(item.stop) : '—'} · {item.name}</dd></div>)}
        <div><dt>Derniers envois</dt><dd>{data.history.length ? data.history.slice(0,3).map(item=>new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(item.sent_at!))+(item.scope==='global'?' (équipe)':' (test)')).join(' · ') : 'Aucun pour l’instant'}</dd></div>
      </dl>
      {!data.mailReady && <p className={styles.warn}>L’envoi d’e-mails n’est pas configuré (SMTP).</p>}
      <form action={sendPreview} className={styles.inline}>
        {event && <input type="hidden" name="event" value={event.slug}/>}
        <label>Version de<select name="as" defaultValue={data.self}>
          {data.members.map(member=><option key={member.email} value={member.email}>{member.email===data.self ? 'moi' : member.email}</option>)}</select></label>
        <Submit className={styles.smallButton} pending="Envoi en cours…">M’envoyer un aperçu maintenant</Submit>
      </form>
      <form action={changeReportMode} className={styles.modeForm}>
        {event && <input type="hidden" name="event" value={event.slug}/>}
        {mode.wanted==='production'
          ? <><input type="hidden" name="mode" value="dev"/><Submit className={styles.ghostSmall} pending="Enregistrement…">Repasser en mode test (moi seul)</Submit></>
          : <><input type="hidden" name="mode" value="production"/>
            <label className={styles.check}><input type="checkbox" name="confirm" value="oui"/>Je confirme l’envoi aux {data.members.filter(m=>m.weeklyReport).length} destinataires</label>
            <Submit className={styles.ghostSmall} pending="Enregistrement…">Envoyer la synthèse à l’équipe</Submit></>}
      </form>
      {mode.updatedBy && <p className={styles.small}>Dernier changement : {mode.updatedBy}</p>}
    </article>
    <article className={`${styles.card} ${styles.adminCard}`} data-reveal>
      <header className={styles.cardHead}><span className={styles.kicker}>Équipe</span><h2>Accès <em>{data.members.length}</em></h2></header>
      <ul className={styles.members}>{[...data.members].sort((a,b)=>Number(b.email===data.self)-Number(a.email===data.self)).map(member=><li key={member.email}>
        <span className={styles.avatar}>{member.email.slice(0,2).toUpperCase()}</span>
        <span className={styles.personMain}><strong>{member.email}</strong>
          <small>{member.role==='admin'?'Admin · ':''}{member.events==='*' ? 'tous les événements' : member.events.join(', ')}{member.weeklyReport ? ' · reçoit la synthèse' : ''}</small></span>
        <span className={member.lastSignIn ? styles.memberOn : styles.memberOff}>{member.lastSignIn ? 'Connecté le '+new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'short'}).format(new Date(member.lastSignIn)) : member.account ? 'Compte créé' : 'Pas encore invité'}</span>
        {member.email!==data.self && <form action={invite}>{event && <input type="hidden" name="event" value={event.slug}/>}<input type="hidden" name="email" value={member.email}/>
          <Submit className={styles.ghostSmall} pending="Envoi…">{member.lastSignIn ? 'Renvoyer un lien' : 'Inviter'}</Submit></form>}
      </li>)}</ul>
      <p className={styles.small}>{others.filter(m=>!m.lastSignIn).length} personne(s) ne se sont pas encore connectées. Les droits (événements visibles, synthèse) se règlent dans la table <code>eizo_event_access</code>.</p>
    </article>
  </section>;
}

export function Dashboard({event,events,rows:allRows,query,admin}:{
  event?:Event; events:Event[]; rows:Booking[]; query:Record<string,string|undefined>; admin?:AdminData;
}) {
  const rows = allRows.filter(isCounted);
  const scoped = event ? rows.filter(row=>row.organizer_id===event.id) : rows;
  const eventName = new Map(events.map(e=>[e.id,e.name]));
  const week = weekKey(new Date());
  const lastWeek = shiftWeek(week,-1);
  const twoDaysAgo = dayKey(new Date(Date.now()-2*86_400_000));
  const weekly = query.period !== 'jour';
  const series = totals(scoped,weekly).slice(0,12).reverse();
  const max = Math.max(1,...series.map(([,count])=>count));
  const currentWeekCount = scoped.filter(row=>weekKey(row.created_at)===week).length;
  const lastWeekCount = scoped.filter(row=>weekKey(row.created_at)===lastWeek).length;
  const search = query.q?.trim().toLowerCase() ?? '';
  const matches = scoped.filter(row =>
    (!query.from || dayKey(row.created_at)>=query.from) &&
    (!query.to || dayKey(row.created_at)<=query.to) &&
    [row.customer_name,row.customer_email,row.customer_phone??'',row.company??'',row.job_title??'',slotText(row),row.customer_need??'',row.customer_usage??'',row.customer_notes??'',product(row)??'',eventName.get(row.organizer_id)??'']
      .some(value=>value.toLowerCase().includes(search)));
  const perPage = 20;
  const pages = Math.max(1,Math.ceil(matches.length/perPage));
  const page = Math.min(Math.max(1,Number.parseInt(query.page ?? '1',10)||1),pages);
  const pager = new URLSearchParams();
  for (const key of ['q','from','to','period']) if (query[key]) pager.set(key,query[key]!);
  const qs = event ? 'event='+event.slug : 'vue=global';
  const base = '/events?'+qs;
  const exportBase = '/events/export?'+qs;
  const single = events.length === 1;
  const titleText = event ? event.name.replace(/\s+\d{4}$/,'') : (single ? events[0].name.replace(/\s+\d{4}$/,'') : 'Rendez-vous');
  const titleAccent = event ? (event.name.match(/\d{4}$/)?.[0] ?? event.specialty ?? undefined) : (single ? events[0].name.match(/\d{4}$/)?.[0] : 'tous événements');

  const today = dayKey(new Date());
  const countdown = event?.event_start_date ? Math.round((Date.parse(event.event_start_date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86_400_000) : null;
  const ended = (item:Event) => !!(item.event_end_date ?? item.event_start_date) && (item.event_end_date ?? item.event_start_date)! < today;
  const ordered = [...events].sort((a,b)=>Number(ended(a))-Number(ended(b)) || (a.event_start_date ?? '9').localeCompare(b.event_start_date ?? '9'));
  const notice = query.notice ? NOTICES[query.notice] : undefined;
  const isFormEvent = event ? formEvents.some(item=>item.slug===event.slug) : false;
  const slotOptions = [...new Set(scoped.map(row=>row.slot_label).filter(Boolean))] as string[];

  return <div className={styles.page}>
    {notice && <p role="status" className={notice[1]==='ok' ? styles.toastOk : styles.toastKo}>{notice[0]}</p>}
    <section className={styles.hero}>
      <p className={styles.kicker} data-reveal>Tableau de bord · {longDate.format(new Date())}
        {countdown!==null && <span className={styles.countdown}>{countdown>0 ? 'J-'+countdown : countdown===0 ? 'Aujourd’hui' : 'Terminé'}</span>}</p>
      <Title text={titleText} accent={titleAccent} />
      <div className={styles.heroMeta} data-reveal>
        {event?.event_start_date ? <p>
          <time dateTime={event.event_start_date}>{longDate.format(new Date(event.event_start_date+'T12:00:00Z'))}</time>
          {event.venue_name && <> — {event.venue_name}{event.venue_location ? ', '+event.venue_location : ''}</>}
        </p> : <p>{events.length} événement{events.length>1?'s':''} suivi{events.length>1?'s':''} · {rows.length} demande{rows.length>1?'s':''} au total</p>}
        <div className={styles.actions}>
          <a className={styles.button} href={exportBase+'&format=xlsx'} data-magnet>Export Excel <span>↓</span></a>
          <a className={styles.ghost} href="#rendez-vous">Voir les fiches <span>↘</span></a>
        </div>
      </div>
    </section>

    {events.length > 1 && <nav className={styles.tabs} aria-label="Événements" data-reveal>
      <a aria-current={!event?'page':undefined} href="/events?vue=global">Vue d’ensemble<b>{rows.length}</b></a>
      {ordered.map(item=>{
        const count = rows.filter(row=>row.organizer_id===item.id).length;
        return <a aria-current={event?.id===item.id?'page':undefined} key={item.id} href={'/events?event='+item.slug} className={ended(item) ? styles.pastTab : undefined}>
          {item.name}<small>{ended(item) ? 'Terminé' : item.venue_name}</small><b>{count}</b></a>;})}
    </nav>}

    <section className={styles.metrics}>
      <Metric index={0} label="Demandes" value={scoped.length} note="Depuis l’ouverture" />
      <Metric index={1} label="Dernières 48 h" value={scoped.filter(r=>dayKey(r.created_at)>=twoDaysAgo).length} note="Rythme de la synthèse" />
      <Metric index={2} label="Cette semaine" value={currentWeekCount} note={`Semaine précédente : ${lastWeekCount}`} />
      <Metric index={3} label="Entreprises" value={new Set(scoped.map(r=>(r.company || r.customer_email.split('@')[1] || '').toLowerCase())).size} note="Organisations distinctes" />
    </section>

    <div className={styles.marquee} aria-hidden="true"><div>
      {Array.from({length:2},(_,copy)=><span key={copy}>
        {(event ? [event] : events).map(item=><span key={item.id}>{item.name}<i>✳</i></span>)}
        <span>Au-delà de l’écran<i>✳</i></span><span>Au cœur de chaque décision<i>✳</i></span>
      </span>)}
    </div></div>

    <div className={styles.bento}>
      <WeeklyCard rows={scoped} query={query} base={base} exportBase={exportBase}/>
      <SlotsCard rows={scoped}/>
      <section className={`${styles.card} ${styles.chartCard}`} data-reveal>
        <header className={styles.cardHead}><span className={styles.kicker}>Évolution</span><h2>Demandes par {weekly?'semaine':'jour'}</h2>
          <nav className={styles.switch}><a aria-current={!weekly?'page':undefined} href={base+'&period=jour'}>Jour</a><a aria-current={weekly?'page':undefined} href={base+'&period=semaine'}>Semaine</a></nav></header>
        {series.length ? <div className={styles.chart}>{series.map(([date,count],index)=><div key={date} style={delay(index)}>
          <b>{count}</b><span><i style={{'--h':Math.round(count/max*100)+'%'} as CSSProperties}/></span><small>{date.slice(8)}/{date.slice(5,7)}</small>
        </div>)}</div> : <p className={styles.empty}>Aucune demande enregistrée.</p>}
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
      <header className={styles.cardHead}><span className={styles.kicker}>Registre détaillé</span><h2>Rendez-vous <em>{matches.length}</em></h2>
        <div className={styles.linkRow}><a className={styles.textLink} href={exportBase+'&format=xlsx'}>Excel ↓</a><a className={styles.textLink} href={exportBase}>CSV ↓</a></div></header>
      <form className={styles.filters} action="/events#rendez-vous">
        {event ? <input type="hidden" name="event" value={event.slug}/> : <input type="hidden" name="vue" value="global"/>}
        <input type="hidden" name="period" value={weekly?'semaine':'jour'}/>
        <label className={styles.searchField}>Recherche<input name="q" defaultValue={query.q} placeholder="Nom, société, e-mail, créneau, message…"/></label>
        <label>Reçues du<input type="date" name="from" defaultValue={query.from}/></label>
        <label>au<input type="date" name="to" defaultValue={query.to}/></label>
        <Submit magnet pending="Recherche…">Filtrer</Submit>
      </form>
      {admin && isFormEvent && <details className={styles.addFiche}>
        <summary>+ Ajouter une inscription (téléphone, salon…)</summary>
        <RegistrationFields action={saveRegistration} eventSlug={event!.slug} submit="Ajouter l’inscription" />
      </details>}
      <datalist id="eizo-slots">{['Sans préférence','09 h - 10 h','10 h - 11 h','11 h - 12 h','12 h - 13 h','13 h - 14 h',...slotOptions].filter((v,i,a)=>a.indexOf(v)===i).map(slot=><option key={slot} value={slot}/>)}</datalist>
      <div className={styles.details}>{matches.slice((page-1)*perPage,page*perPage).map(row=>
        <Detail key={row.id} row={row} eventName={event ? undefined : eventName.get(row.organizer_id)} editable={!!admin} eventSlug={event?.slug} />)}</div>
      {!matches.length && <p className={styles.empty}>Aucun rendez-vous pour cette sélection.</p>}
      {pages>1 && <div className={styles.pager}>{page>1 ? <a href={base+'&'+pager+'&page='+(page-1)+'#rendez-vous'}>← Précédent</a> : <span/>}
        <span>Page {page} / {pages}</span>
        {page<pages ? <a href={base+'&'+pager+'&page='+(page+1)+'#rendez-vous'}>Suivant →</a> : <span/>}</div>}
    </section>
    {admin && <AdminPanel data={admin} event={event} />}
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
      <Submit magnet pending="Connexion…">Se connecter <span>↗</span></Submit>
      <a className={styles.formLink} href="/events/mot-de-passe">Première connexion ou mot de passe oublié ?</a>
    </form>
  </section>;
}
