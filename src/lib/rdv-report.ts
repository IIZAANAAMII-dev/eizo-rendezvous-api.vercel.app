import { type Booking, type Event, dayKey, weekKey } from './rdv';

function escape(value: string) {
  return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

const statusLabels: Record<string,string> = {
  pending:'En attente', confirmed:'Confirmé', refused:'Refusé',
  cancelled:'Annulé', completed:'Terminé', no_show:'No-show',
};
const activeStatuses = new Set(['pending','confirmed']);

export function bookingReport(rows: Booking[], events: Event[], mode: 'jour'|'semaine', now: Date, link: URL) {
  const currentWeek = weekKey(now);
  const currentDay = dayKey(now);
  const end = mode === 'semaine' ? currentWeek : currentDay;
  const startDate = new Date(end+'T12:00:00Z');
  startDate.setUTCDate(startDate.getUTCDate()-(mode==='semaine'?7:1));
  const start = startDate.toISOString().slice(0,10);
  const last = new Date(end+'T12:00:00Z'); last.setUTCDate(last.getUTCDate()-1);
  const previousStart = new Date(start+'T12:00:00Z');
  previousStart.setUTCDate(previousStart.getUTCDate()-(mode==='semaine'?7:1));
  const previousKey = previousStart.toISOString().slice(0,10);
  const inPeriod = (row:Booking, from:string, to:string) => {
    const key = mode==='semaine' ? weekKey(row.created_at) : dayKey(row.created_at);
    // Pour la comparaison, on compare les buckets hebdo/jour
    return key >= from && key < to;
  };
  const subset = rows.filter(row=>inPeriod(row,start,end));
  const previous = rows.filter(row=>inPeriod(row,previousKey,start));
  const diff = subset.length - previous.length;
  const delta = diff===0 ? 'Stable par rapport à la période précédente' :
    (diff>0?'+':'−')+Math.abs(diff)+' par rapport à la période précédente';
  const confirmed = subset.filter(row=>row.status==='confirmed').length;
  const pending = subset.filter(row=>row.status==='pending').length;
  const refused = subset.filter(row=>['refused','cancelled','no_show'].includes(row.status)).length;
  const totalActive = rows.filter(row=>activeStatuses.has(row.status)).length;
  const byEvent = new Map<string,number>();
  for (const row of subset) byEvent.set(row.organizer_id,(byEvent.get(row.organizer_id)??0)+1);
  const eventName = new Map(events.map(event=>[event.id,event.name]));
  const eventRows = [...byEvent.entries()].sort((a,b)=>b[1]-a[1]);
  const format = (value:string) => value.split('-').reverse().join('/');
  const dates = mode==='jour' ? 'le '+format(start) : 'du '+format(start)+' au '+format(last.toISOString().slice(0,10));
  const subject = 'EIZO Events · '+(mode==='jour'?'Synthèse quotidienne':'Synthèse hebdomadaire des rendez-vous')+' · '+dates;
  const counts: [string,number][] = [
    ['Confirmés',confirmed],['En attente',pending],['Refusés / annulés',refused],
  ];
  const eventSlug = new Map(events.map(event=>[event.id,event.slug]));
  const totalByEvent = new Map<string,number>();
  for (const row of rows) if (activeStatuses.has(row.status)) totalByEvent.set(row.organizer_id,(totalByEvent.get(row.organizer_id)??0)+1);
  const url = (params: Record<string,string>) => {
    const target = new URL(link.href);
    for (const [key,value] of Object.entries(params)) target.searchParams.set(key,value);
    return escape(target.href);
  };
  const overview = url({vue:'global'});
  const weekly = url({vue:'global',semaine:start});
  const exportLink = (() => { const target = new URL('/events/export',link); target.searchParams.set('format','xlsx'); return escape(target.href); })();
  const stamp = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  const shown = subset.slice(0,25);
  const cell = 'padding:8px 6px;border-top:1px solid #e6e8ef;font-size:13px;vertical-align:top';
  const newRows = shown.map(row=>`<tr><td style="${cell}"><strong>${escape(row.customer_name)}</strong>${row.customer_need?`<br><span style="color:#514982">${escape(row.customer_need)}</span>`:''}</td><td style="${cell}">${escape(eventName.get(row.organizer_id) ?? '')}${row.customer_usage?`<br><span style="color:#514982">${escape(row.customer_usage)}</span>`:''}</td><td style="${cell};white-space:nowrap">${stamp.format(new Date(row.created_at))}<br>${escape(statusLabels[row.status] ?? row.status)}</td></tr>`).join('');
  const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><body style="margin:0;background:#eef0f6;font-family:Arial,sans-serif;color:#182139"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef0f6"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:white">
<tr><td style="background:#151934;color:white;padding:30px"><p style="color:#ffb3bd;font-size:13px;letter-spacing:.08em;margin:0">EIZO / EVENTS</p><h1 style="font-size:28px;line-height:1.1;margin:12px 0">Synthèse des rendez-vous et inscriptions</h1><p style="margin:0;color:#c9c8ff">${dates}</p></td></tr>
<tr><td style="padding:28px 30px">
<h2 style="margin:0 0 10px;font-size:16px">Résumé</h2>
<p style="margin:0;color:#c40025;font-size:56px;font-weight:bold;letter-spacing:-3px">${subset.length}</p><p style="margin:4px 0 6px;font-size:17px;font-weight:bold">Nouvelles demandes sur la période</p><p style="margin:0 0 6px;color:#514982;font-size:14px">${delta}</p><p style="margin:0 0 20px;color:#514982;font-size:13px">${totalActive} demande(s) active(s) au total, tous événements confondus</p>
<table width="100%" cellpadding="10" cellspacing="0" style="background:#f8f9fb">${counts.map(([name,count])=>`<tr><th align="left" scope="row" style="font-weight:normal">${name} (période)</th><td align="right" style="font-weight:bold">${count}</td></tr>`).join('')}</table>
${eventRows.length || totalByEvent.size ? `<h3 style="margin:24px 0 8px;font-size:14px">Par événement</h3><table width="100%" cellpadding="8" cellspacing="0"><tr><th align="left" style="font-size:12px;color:#555975">Événement</th><th align="right" style="font-size:12px;color:#555975">Cette période</th><th align="right" style="font-size:12px;color:#555975">Total actifs</th></tr>${[...new Set([...eventRows.map(([id])=>id),...totalByEvent.keys()])].map(id=>`<tr><td style="border-top:1px solid #e6e8ef"><a href="${url({event:eventSlug.get(id) ?? ''})}" style="color:#182139">${escape(eventName.get(id) ?? id)}</a></td><td align="right" style="border-top:1px solid #e6e8ef;font-weight:bold">${byEvent.get(id) ?? 0}</td><td align="right" style="border-top:1px solid #e6e8ef">${totalByEvent.get(id) ?? 0}</td></tr>`).join('')}</table>` : ''}
${shown.length ? `<h3 style="margin:24px 0 8px;font-size:14px">Nouvelles demandes${subset.length>shown.length?` (25 premières sur ${subset.length})`:''}</h3><table width="100%" cellspacing="0" cellpadding="0">${newRows}</table>` : ''}
<h3 style="margin:28px 0 10px;font-size:14px">Back-office</h3>
<p style="margin:0 0 10px"><a href="${overview}" style="display:inline-block;padding:13px 19px;background:#c40025;color:white;font-weight:bold;text-decoration:none;border-radius:6px">Statistiques et tableau de bord</a></p>
<p style="margin:0;font-size:13px;line-height:1.8"><a href="${weekly}" style="color:#c40025">Synthèse détaillée de la semaine</a> · <a href="${exportLink}" style="color:#c40025">Export Excel</a></p>
</td></tr>
<tr><td style="padding:14px 30px;background:#f4f4ff;color:#555975;font-size:12px">EIZO France · Synthèse interne, ne pas transférer · Europe/Paris</td></tr></table></td></tr></table></body></html>`;
  return {key:start, subject, count:subset.length, html};
}
