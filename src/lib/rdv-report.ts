import { type Booking, type Event, dayKey, isCounted, slotText } from './rdv';

function escape(value: string) {
  return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}
function shiftDay(day: string, delta: number) {
  const date = new Date(day+'T12:00:00Z');
  date.setUTCDate(date.getUTCDate()+delta);
  return date.toISOString().slice(0,10);
}
const frDay = (day: string) => day.split('-').reverse().join('/');

/**
 * Synthèse des `days` derniers jours complets (heure de Paris), terminée la veille de `now`.
 * Contient le résumé chiffré et la fiche détaillée de chaque nouvelle demande.
 */
export function bookingReport(rows: Booking[], events: Event[], days: number, now: Date, link: URL) {
  const end = dayKey(now);                 // exclu
  const start = shiftDay(end, -days);      // inclus
  const previousStart = shiftDay(start, -days);
  const counted = rows.filter(isCounted);
  const inRange = (row: Booking, from: string, to: string) => { const key = dayKey(row.created_at); return key >= from && key < to; };
  const subset = counted.filter(row => inRange(row, start, end)).sort((a,b)=>b.created_at.localeCompare(a.created_at));
  const previous = counted.filter(row => inRange(row, previousStart, start));
  const diff = subset.length - previous.length;
  const label = days === 1 ? 'la veille' : `les ${days} jours précédents`;
  const delta = diff === 0 ? `Autant que ${label}` : `${diff > 0 ? '+' : '−'}${Math.abs(diff)} par rapport ${days === 1 ? 'à' : 'aux'} ${label.replace(/^les /,'')}`;
  const eventName = new Map(events.map(event => [event.id, event.name]));
  const eventSlug = new Map(events.map(event => [event.id, event.slug]));
  const total = new Map<string, number>();
  const recent = new Map<string, number>();
  for (const row of counted) total.set(row.organizer_id, (total.get(row.organizer_id) ?? 0) + 1);
  for (const row of subset) recent.set(row.organizer_id, (recent.get(row.organizer_id) ?? 0) + 1);
  const lastDay = shiftDay(end, -1);
  const dates = days === 1 ? 'le ' + frDay(start) : 'du ' + frDay(start) + ' au ' + frDay(lastDay);
  const title = days === 1 ? 'Synthèse quotidienne' : days === 7 ? 'Synthèse hebdomadaire' : `Synthèse des ${days} derniers jours`;
  const subject = `EIZO Events · ${title} · ${dates} · ${subset.length} nouvelle${subset.length > 1 ? 's' : ''} demande${subset.length > 1 ? 's' : ''}`;

  const url = (params: Record<string,string>, path = '/events') => {
    const target = new URL(path, link);
    for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
    return escape(target.href);
  };
  const stamp = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  const line = (name: string, value: string | null | undefined) => value
    ? `<tr><td style="padding:3px 12px 3px 0;color:#567895;font-size:12px;white-space:nowrap;vertical-align:top">${name}</td><td style="padding:3px 0;font-size:13px;color:#072446">${value}</td></tr>` : '';
  const card = (row: Booking) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border:1px solid #d3e3ef;border-radius:10px"><tr><td style="padding:16px 18px">
<p style="margin:0 0 2px;font:800 16px/1.3 Arial,sans-serif;color:#071c35;letter-spacing:-.3px">${escape(row.customer_name)}</p>
<p style="margin:0 0 10px;font-size:12px;color:#0877e6;font-weight:bold">${escape(eventName.get(row.organizer_id) ?? '')} · reçue ${escape(stamp.format(new Date(row.created_at)))}</p>
<table role="presentation" cellpadding="0" cellspacing="0">
${line('Entreprise', row.company ? escape(row.company) : null)}
${line('Fonction', row.job_title ? escape(row.job_title) : null)}
${line('E-mail', `<a href="mailto:${escape(row.customer_email)}" style="color:#0877e6">${escape(row.customer_email)}</a>`)}
${line('Téléphone', row.customer_phone ? `<a href="tel:${escape(row.customer_phone)}" style="color:#0877e6">${escape(row.customer_phone)}</a>` : null)}
${line('Créneau', escape(slotText(row)))}
${line('Produit', row.requested_product?.title || row.product_title ? escape(row.requested_product?.title || row.product_title || '') : null)}
${line('Besoin', row.customer_need ? escape(row.customer_need) : null)}
${line('Usage', row.customer_usage ? escape(row.customer_usage) : null)}
${line('Message', row.customer_notes ? `<em>« ${escape(row.customer_notes)} »</em>` : null)}
</table></td></tr></table>`;

  const ids = [...new Set([...recent.keys(), ...total.keys()])];
  const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><body style="margin:0;background:#f4faff;font-family:Arial,sans-serif;color:#072446"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4faff"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #d3e3ef;border-radius:14px;overflow:hidden">
<tr><td style="background:#052c5d;background-image:linear-gradient(150deg,#052c5d,#003a74);color:white;padding:30px 30px 28px">
<p style="margin:0;color:#7fc0ff;font:bold 10px/1.5 Arial,sans-serif;letter-spacing:3px">EIZO FRANCE / EVENTS</p>
<h1 style="margin:12px 0 6px;font:800 30px/1.1 Arial,sans-serif;letter-spacing:-1.2px">${title}<span style="color:#7fc0ff">.</span></h1>
<p style="margin:0;color:#b6d3ef;font-size:14px">${dates}</p></td></tr>
<tr><td style="padding:28px 30px 8px">
<p style="margin:0;color:#0877e6;font:bold 10px/1.5 Arial,sans-serif;letter-spacing:3px">RÉSUMÉ</p>
<p style="margin:6px 0 0;font:800 64px/1 Arial,sans-serif;letter-spacing:-3px;color:#071c35">${subset.length}</p>
<p style="margin:6px 0 4px;font-size:16px;font-weight:bold">nouvelle${subset.length>1?'s':''} demande${subset.length>1?'s':''}</p>
<p style="margin:0 0 18px;color:#567895;font-size:13px">${delta}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #d3e3ef">
<tr><td style="padding:10px 0;font-size:11px;color:#567895;font-weight:bold;letter-spacing:1px">ÉVÉNEMENT</td><td align="right" style="padding:10px 0;font-size:11px;color:#567895;font-weight:bold;letter-spacing:1px">PÉRIODE</td><td align="right" style="padding:10px 0;font-size:11px;color:#567895;font-weight:bold;letter-spacing:1px">TOTAL</td></tr>
${ids.map(id=>`<tr><td style="padding:10px 0;border-top:1px solid #d3e3ef"><a href="${url({event:eventSlug.get(id) ?? ''})}" style="color:#071c35;font-weight:bold;text-decoration:none">${escape(eventName.get(id) ?? id)}</a></td><td align="right" style="padding:10px 0;border-top:1px solid #d3e3ef;font-weight:bold;color:#0877e6">${recent.get(id) ?? 0}</td><td align="right" style="padding:10px 0;border-top:1px solid #d3e3ef">${total.get(id) ?? 0}</td></tr>`).join('')}
</table></td></tr>
<tr><td style="padding:22px 30px 6px">
<p style="margin:0 0 12px;color:#0877e6;font:bold 10px/1.5 Arial,sans-serif;letter-spacing:3px">LES NOUVELLES DEMANDES EN DÉTAIL</p>
${subset.length ? subset.slice(0,40).map(card).join('') : '<p style="margin:0 0 12px;color:#567895">Aucune nouvelle demande sur la période.</p>'}
${subset.length > 40 ? `<p style="color:#567895;font-size:13px">… et ${subset.length-40} autres dans le back-office.</p>` : ''}
</td></tr>
<tr><td style="padding:10px 30px 30px">
<a href="${url({vue:'global'})}" style="display:inline-block;padding:14px 22px;background:#0877e6;color:white;font:bold 13px Arial,sans-serif;text-decoration:none;border-radius:999px">Ouvrir le back-office ↗</a>
<p style="margin:14px 0 0;font-size:13px"><a href="${url({format:'xlsx'},'/events/export')}" style="color:#0877e6">Télécharger l'export Excel</a></p>
</td></tr>
<tr><td style="padding:14px 30px;background:#f4faff;border-top:1px solid #d3e3ef;color:#567895;font-size:11px">EIZO France · Synthèse interne, ne pas transférer · heure de Paris</td></tr></table></td></tr></table></body></html>`;
  return { key: start, subject, count: subset.length, html };
}
