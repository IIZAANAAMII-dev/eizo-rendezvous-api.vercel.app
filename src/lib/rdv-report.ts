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
const longDay = new Intl.DateTimeFormat('fr-FR',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'});
const stamp = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const shortStamp = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});

const BLUE = '#0877e6', INK = '#071c35', MUTED = '#567895', LINE = '#d3e3ef', SKY = '#f4faff';
const kicker = (text: string) => `<p style="margin:0 0 12px;color:${BLUE};font:bold 10px/1.5 Arial,sans-serif;letter-spacing:3px">${text}</p>`;
const organisation = (row: Booking) => row.company || row.customer_email.split('@')[1] || '';

function detailCard(row: Booking) {
  const line = (name: string, value: string | null | undefined) => value
    ? `<tr><td style="padding:3px 14px 3px 0;color:${MUTED};font-size:12px;white-space:nowrap;vertical-align:top">${name}</td><td style="padding:3px 0;font-size:13px;color:#072446">${value}</td></tr>` : '';
  const product = row.requested_product?.title || row.product_title;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border:1px solid ${LINE};border-left:4px solid ${BLUE};border-radius:10px"><tr><td style="padding:16px 18px">
<p style="margin:0;font:800 17px/1.3 Arial,sans-serif;color:${INK};letter-spacing:-.3px">${escape(row.customer_name)}</p>
<p style="margin:2px 0 12px;font-size:13px;color:${MUTED}">${escape([row.job_title, row.company].filter(Boolean).join(' · ') || 'Fonction et entreprise non renseignées')}</p>
<table role="presentation" cellpadding="0" cellspacing="0">
${line('Créneau', `<strong>${escape(slotText(row))}</strong>`)}
${line('E-mail', `<a href="mailto:${escape(row.customer_email)}" style="color:${BLUE}">${escape(row.customer_email)}</a>`)}
${line('Téléphone', row.customer_phone ? `<a href="tel:${escape(row.customer_phone)}" style="color:${BLUE}">${escape(row.customer_phone)}</a>` : null)}
${line('Produit', product ? escape(product) : null)}
${line('Besoin', row.customer_need ? escape(row.customer_need) : null)}
${line('Usage', row.customer_usage ? escape(row.customer_usage) : null)}
${line('Inscrit le', escape(stamp.format(new Date(row.created_at))))}
</table>
${row.customer_notes ? `<p style="margin:12px 0 0;padding:10px 14px;background:${SKY};border-radius:8px;font-size:13px;font-style:italic;color:#0b2d53">« ${escape(row.customer_notes)} »</p>` : ''}
</td></tr></table>`;
}

/** Section complète pour un événement : chiffres, courbe, créneaux, nouveaux inscrits, liste intégrale. */
function eventSection(event: Event, rows: Booking[], start: string, end: string, previousStart: string, link: URL, today: string) {
  const all = rows.filter(row => row.organizer_id === event.id).sort((a,b)=>b.created_at.localeCompare(a.created_at));
  const inRange = (row: Booking, from: string, to: string) => { const key = dayKey(row.created_at); return key >= from && key < to; };
  const fresh = all.filter(row => inRange(row, start, end));
  const previous = all.filter(row => inRange(row, previousStart, start));
  const freshIds = new Set(fresh.map(row => row.id));
  const diff = fresh.length - previous.length;
  const companies = new Set(all.map(row => organisation(row).toLowerCase()).filter(Boolean)).size;

  // Compte à rebours.
  let countdown = '';
  if (event.event_start_date) {
    const days = Math.round((Date.parse(event.event_start_date+'T12:00:00Z') - Date.parse(today+'T12:00:00Z')) / 86_400_000);
    countdown = days > 0 ? `J-${days}` : days === 0 ? 'Aujourd’hui' : 'Terminé';
  }
  const place = [event.venue_name, event.venue_location].filter(Boolean).join(', ');
  const when = event.event_start_date ? longDay.format(new Date(event.event_start_date+'T12:00:00Z')) : '';

  // Courbe des 14 derniers jours.
  const days = Array.from({length:14},(_,index)=>shiftDay(end,index-14));
  const perDay = days.map(day => [day, all.filter(row => dayKey(row.created_at) === day).length] as const);
  const max = Math.max(1, ...perDay.map(([,count]) => count));
  const chart = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${perDay.map(([day,count])=>`<td valign="bottom" align="center" style="padding:0 2px">
<p style="margin:0 0 4px;font:bold 11px Arial;color:${count ? INK : '#b8cbdb'}">${count}</p>
<div style="height:${Math.max(3, Math.round(count/max*90))}px;background:${day >= start ? BLUE : '#9cc9f5'};border-radius:4px 4px 0 0"></div>
<p style="margin:4px 0 0;font:10px Arial;color:${MUTED}">${day.slice(8)}/${day.slice(5,7)}</p></td>`).join('')}</tr></table>
<p style="margin:8px 0 0;font-size:11px;color:${MUTED}"><span style="display:inline-block;width:9px;height:9px;background:${BLUE};border-radius:2px"></span> période de la synthèse &nbsp; <span style="display:inline-block;width:9px;height:9px;background:#9cc9f5;border-radius:2px"></span> jours précédents</p>`;

  // Créneaux avec les noms.
  const slots = new Map<string, Booking[]>();
  for (const row of all) slots.set(slotText(row), [...(slots.get(slotText(row)) ?? []), row]);
  const slotList = [...slots.entries()].sort((a,b)=>a[0].localeCompare(b[0],'fr',{numeric:true}));
  const slotMax = Math.max(1, ...slotList.map(([,list]) => list.length));
  const slotTable = slotList.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${slotList.map(([slot,list])=>`<tr><td style="padding:10px 0;border-top:1px solid ${LINE};vertical-align:top;width:34%"><strong style="font-size:13px;color:${INK}">${escape(slot)}</strong>
<div style="margin-top:6px;height:4px;width:${Math.round(list.length/slotMax*100)}%;background:${BLUE};border-radius:2px"></div></td>
<td style="padding:10px 0 10px 12px;border-top:1px solid ${LINE};vertical-align:top;width:8%;font:800 18px Arial;color:${BLUE}">${list.length}</td>
<td style="padding:10px 0;border-top:1px solid ${LINE};vertical-align:top;font-size:12px;color:#0b2d53;line-height:1.6">${list.map(row=>escape(row.customer_name)+(row.company?` <span style="color:${MUTED}">(${escape(row.company)})</span>`:'')).join('<br>')}</td></tr>`).join('')}</table>` : `<p style="color:${MUTED}">Aucune inscription.</p>`;

  // Liste intégrale.
  const cell = `padding:9px 8px 9px 0;border-top:1px solid ${LINE};font-size:12px;vertical-align:top;color:#072446`;
  const fullList = all.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:0 8px 8px 0;font:bold 10px Arial;color:${MUTED};letter-spacing:1px">PARTICIPANT</td><td style="padding:0 8px 8px 0;font:bold 10px Arial;color:${MUTED};letter-spacing:1px">CRÉNEAU</td><td style="padding:0 8px 8px 0;font:bold 10px Arial;color:${MUTED};letter-spacing:1px">CONTACT</td><td style="padding:0 0 8px;font:bold 10px Arial;color:${MUTED};letter-spacing:1px">INSCRIT LE</td></tr>
${all.map(row=>`<tr${freshIds.has(row.id)?` style="background:${SKY}"`:''}><td style="${cell}"><strong>${escape(row.customer_name)}</strong>${freshIds.has(row.id)?` <span style="font:bold 9px Arial;color:white;background:${BLUE};padding:2px 6px;border-radius:9px">NOUVEAU</span>`:''}<br><span style="color:${MUTED}">${escape([row.job_title, row.company].filter(Boolean).join(' · ') || organisation(row))}</span></td>
<td style="${cell}">${escape(slotText(row))}</td>
<td style="${cell}"><a href="mailto:${escape(row.customer_email)}" style="color:${BLUE}">${escape(row.customer_email)}</a>${row.customer_phone?`<br>${escape(row.customer_phone)}`:''}</td>
<td style="${cell};white-space:nowrap;padding-right:0">${escape(shortStamp.format(new Date(row.created_at)))}</td></tr>`).join('')}</table>` : `<p style="color:${MUTED}">Aucune inscription pour le moment.</p>`;

  const eventLink = new URL('/events',link); eventLink.searchParams.set('event',event.slug);
  const stat = (value: string|number, label: string, color = INK) => `<td width="25%" style="padding:14px 10px 14px 0;border-top:2px solid ${BLUE};vertical-align:top"><p style="margin:0;font:800 34px/1 Arial;letter-spacing:-1.5px;color:${color}">${value}</p><p style="margin:6px 0 0;font-size:11px;color:${MUTED};line-height:1.4">${label}</p></td>`;

  const body = `
<tr><td style="padding:28px 30px 4px">
${kicker('CHIFFRES CLÉS')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
${stat(all.length, 'inscrits au total')}
${stat(fresh.length, 'nouveaux sur la période', BLUE)}
${stat((diff>0?'+':'')+diff, `vs période précédente (${previous.length})`, diff>0 ? '#12a26b' : diff<0 ? '#d9324a' : INK)}
${stat(companies, 'organisations')}
</tr></table></td></tr>
<tr><td style="padding:22px 30px 4px">${kicker('ÉVOLUTION · 14 DERNIERS JOURS')}${chart}</td></tr>
<tr><td style="padding:24px 30px 4px">${kicker('CRÉNEAUX DEMANDÉS')}${slotTable}</td></tr>
<tr><td style="padding:24px 30px 4px">${kicker(`NOUVEAUX INSCRITS · ${fresh.length}`)}
${fresh.length ? fresh.map(detailCard).join('') : `<p style="margin:0;color:${MUTED};font-size:14px">Aucune nouvelle inscription sur la période.</p>`}</td></tr>
<tr><td style="padding:24px 30px 4px">${kicker(`LISTE COMPLÈTE DES INSCRITS · ${all.length}`)}${fullList}</td></tr>
<tr><td style="padding:24px 30px 30px">
<a href="${escape(eventLink.href)}" style="display:inline-block;padding:14px 22px;background:${BLUE};color:white;font:bold 13px Arial;text-decoration:none;border-radius:999px">Ouvrir le back-office ↗</a>
<p style="margin:14px 0 0;font-size:13px"><a href="${escape(new URL('/events/export?event='+event.slug+'&format=xlsx',link).href)}" style="color:${BLUE}">Télécharger la liste Excel complète</a></p>
</td></tr>`;
  return { title: escape(event.name), when, place: escape(place), countdown, body };
}

/**
 * Synthèse des `days` derniers jours complets (heure de Paris), terminée la veille de `now`,
 * avec une section détaillée par événement (en pratique : les Rencontres EIZO).
 */
export function bookingReport(rows: Booking[], events: Event[], days: number, now: Date, link: URL) {
  const today = dayKey(now);
  const end = today;                        // exclu
  const start = shiftDay(end, -days);       // inclus
  const previousStart = shiftDay(start, -days);
  const counted = rows.filter(isCounted);
  const dates = days === 1 ? 'le ' + frDay(start) : 'du ' + frDay(start) + ' au ' + frDay(shiftDay(end, -1));
  const fresh = counted.filter(row => { const key = dayKey(row.created_at); return key >= start && key < end; }).length;
  const main = events[0];
  const name = events.length === 1 && main ? main.name : 'EIZO Events';
  const subject = `${name} · Synthèse ${dates} · ${fresh} ${fresh > 1 ? 'nouveaux inscrits' : 'nouvel inscrit'} · ${counted.length} au total`;

  const sections = events.map(event => {
    const {title, when, place, countdown, body} = eventSection(event, counted, start, end, previousStart, link, today);
    const header = `<tr><td style="background:#052c5d;background-image:linear-gradient(150deg,#052c5d,#003a74);color:white;padding:30px 30px 26px">
<p style="margin:0;color:#7fc0ff;font:bold 10px/1.5 Arial,sans-serif;letter-spacing:3px">EIZO FRANCE · SYNTHÈSE DES INSCRIPTIONS</p>
<h1 style="margin:12px 0 8px;font:800 30px/1.1 Arial,sans-serif;letter-spacing:-1.2px">${title}<span style="color:#7fc0ff">.</span></h1>
<p style="margin:0;color:#b6d3ef;font-size:14px;line-height:1.6">${when ? when.charAt(0).toUpperCase()+when.slice(1) : ''}${place ? ' · '+place : ''}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px"><tr>
${countdown ? `<td style="padding:6px 12px;background:#0877e6;border-radius:99px;font:bold 12px Arial;color:white">${countdown}</td><td width="10"></td>` : ''}
<td style="padding:6px 12px;border:1px solid #3d6a9c;border-radius:99px;font:bold 12px Arial;color:#cfe6ff">Synthèse ${dates}</td></tr></table>
</td></tr>`;
    return header + body;
  }).join('<tr><td style="height:18px;background:#f4faff"></td></tr>');

  const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><body style="margin:0;background:${SKY};font-family:Arial,sans-serif;color:#072446"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${SKY}"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid ${LINE};border-radius:14px;overflow:hidden">
${sections || `<tr><td style="padding:30px">Aucun événement en cours.</td></tr>`}
<tr><td style="padding:14px 30px;background:${SKY};border-top:1px solid ${LINE};color:${MUTED};font-size:11px">EIZO France · Synthèse interne envoyée tous les deux jours jusqu’à la fin de l’événement · ne pas transférer · heure de Paris</td></tr></table></td></tr></table></body></html>`;
  return { key: start, subject, count: fresh, html };
}
