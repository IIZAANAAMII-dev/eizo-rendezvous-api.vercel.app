import { type Event, type Participant, period } from './events';
import { statuses } from './events';

function escape(value: string) {
  return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}
export function report(event: Event, rows: Participant[], mode: 'jour'|'semaine', now: Date, link: URL) {
  const end = mode === 'semaine' ? period(now,true) : period(now,false);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate()-(mode==='semaine'?7:1));
  const key = start.toISOString().slice(0,10);
  const last = new Date(end);
  last.setUTCDate(last.getUTCDate()-1);
  const format = (value:string) => value.split('-').reverse().join('/');
  const dates = mode==='jour' ? format(key) : format(key)+' – '+format(last.toISOString().slice(0,10));
  const subset = rows.filter(row=>{
    const day = period(new Date(row.registered_at),false);
    return day>=key && day<end;
  });
  const counts = statuses.map(status=>[status,subset.filter(row=>row.status===status).length] as const);
  const subject = 'EIZO Events · '+(mode==='jour'?'Synthèse quotidienne':'Synthèse hebdomadaire')+' · '+dates;
  return {key, subject, count:subset.length, html:`<!doctype html><html lang="fr"><meta charset="utf-8"><body style="margin:0;background:#eef0f6;font-family:Arial,sans-serif;color:#182139"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef0f6"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:white">
<tr><td style="background:#151934;color:white;padding:30px"><p style="color:#ccc9ff;font-size:13px">EIZO / EVENTS</p><h1 style="font-size:32px;line-height:1.1;margin:12px 0">${escape(event.title)}</h1><p style="margin:0;color:#e0dfff">${dates}</p></td></tr>
<tr><td style="padding:28px 30px"><p style="margin:0;color:#433bad;font-size:50px;font-weight:bold">${subset.length}</p><h2 style="margin:4px 0 22px;font-size:20px">Inscriptions sur la période</h2><table width="100%" cellpadding="10" cellspacing="0" style="background:#f4f4ff">${counts.map(([name,count])=>`<tr><th align="left" scope="row">${name}</th><td align="right">${count}</td></tr>`).join('')}</table>
<p style="margin:28px 0 8px"><a href="${escape(link.href)}" style="display:inline-block;padding:13px 19px;background:#4038a1;color:white;font-weight:bold;text-decoration:none;border-radius:5px">Ouvrir le tableau de bord</a></p></td></tr>
<tr><td style="padding:14px 30px;background:#f4f4ff;color:#555975;font-size:12px">EIZO France · Synthèse interne · Europe/Paris</td></tr></table></td></tr></table></body></html>`};
}
