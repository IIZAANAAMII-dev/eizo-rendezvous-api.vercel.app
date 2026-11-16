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
  const last = new Date(startDate); last.setUTCDate(last.getUTCDate()-1);
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
  return {key:start, subject, count:subset.length, html:`<!doctype html><html lang="fr"><meta charset="utf-8"><body style="margin:0;background:#eef0f6;font-family:Arial,sans-serif;color:#182139"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef0f6"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:white">
<tr><td style="background:#151934;color:white;padding:30px"><p style="color:#ffb3bd;font-size:13px;letter-spacing:.08em">EIZO / EVENTS</p><h1 style="font-size:30px;line-height:1.1;margin:12px 0">Synthèse des rendez-vous</h1><p style="margin:0;color:#c9c8ff">${dates}</p></td></tr>
<tr><td style="padding:28px 30px"><p style="margin:0;color:#c40025;font-size:60px;font-weight:bold;letter-spacing:-3px">${subset.length}</p><h2 style="margin:4px 0 8px;font-size:19px">Nouvelles demandes sur la période</h2><p style="margin:0 0 6px;color:#514982;font-size:14px">${delta}</p><p style="margin:0 0 24px;color:#514982;font-size:13px">${totalActive} rendez-vous actifs au total · ${confirmed} confirmé(s) sur la période</p><table width="100%" cellpadding="10" cellspacing="0" style="background:#f8f9fb">${counts.map(([name,count])=>`<tr><th align="left" scope="row" style="font-weight:normal">${name}</th><td align="right" style="font-weight:bold">${count}</td></tr>`).join('')}</table>
${eventRows.length ? `<h3 style="margin:24px 0 8px;font-size:14px">Par événement</h3><table width="100%" cellpadding="8" cellspacing="0">${eventRows.map(([id,count])=>`<tr><td>${escape(eventName.get(id) ?? id)}</td><td align="right" style="font-weight:bold">${count}</td></tr>`).join('')}</table>` : ''}
<p style="margin:28px 0 8px"><a href="${escape(link.href)}" style="display:inline-block;padding:13px 19px;background:#c40025;color:white;font-weight:bold;text-decoration:none;border-radius:6px">Ouvrir le tableau de bord</a></p></td></tr>
<tr><td style="padding:14px 30px;background:#f4f4ff;color:#555975;font-size:12px">EIZO France · Synthèse interne · Europe/Paris</td></tr></table></td></tr></table></body></html>`};
}
