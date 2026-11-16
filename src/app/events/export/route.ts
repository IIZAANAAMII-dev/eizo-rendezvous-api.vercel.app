import { cookies } from 'next/headers';
import * as XLSX from 'xlsx';
import { eventAccess, scopeTo } from '@/lib/events-access';
import { bookings, csvCell, events, inWeek, isCounted, slotText, slug, totals, weekKey, type Booking } from '@/lib/rdv';

const headers = {'Cache-Control':'private, no-store'};

export async function GET(request: Request) {
  const access = await eventAccess((await cookies()).get('eizo-events')?.value);
  if (!access) return new Response('Accès refusé',{status:401,headers});
  const query = new URL(request.url).searchParams;
  const scope = slug.safeParse(query.get('event'));
  if (query.get('event') && !scope.success) return new Response('Événement invalide',{status:400,headers});
  const [allEvents, allRows] = await Promise.all([events(), bookings()]);
  const {events:list, rows} = scopeTo(access, allEvents, allRows.filter(isCounted));
  const scoped = scope.success ? rows.filter(row=>{
    const event = list.find(item=>item.slug===scope.data);
    return event && row.organizer_id===event.id;
  }) : rows;
  const eventName = new Map(list.map(item=>[item.id,item.name]));
  const report = query.get('type');
  const semaine = /^\d{4}-\d{2}-\d{2}$/.test(query.get('semaine') ?? '') ? query.get('semaine')! : null;
  const periodRows = semaine ? scoped.filter(row=>inWeek(row,semaine)) : scoped;
  const name = 'eizo-rdv'+(scope.success ? '-'+scope.data : '')+(semaine ? '-'+semaine : '');

  const stamp = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',dateStyle:'short',timeStyle:'short'});
  const bookingLine = (row:Booking) => [
    stamp.format(new Date(row.created_at)),eventName.get(row.organizer_id) ?? '',row.customer_name,row.company ?? '',row.job_title ?? '',
    row.customer_email,row.customer_phone ?? '',slotText(row),row.requested_product?.title ?? row.product_title ?? '',
    row.customer_need ?? '',row.customer_usage ?? '',row.customer_notes ?? '',
  ];
  const bookingHeader = ['Reçue le','Événement','Nom','Entreprise','Fonction','E-mail','Téléphone','Créneau','Produit','Besoin','Usage','Message'];

  if (query.get('format') === 'xlsx') {
    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([bookingHeader,...periodRows.map(bookingLine)]);
    sheet['!cols'] = [{wch:16},{wch:24},{wch:24},{wch:26},{wch:22},{wch:32},{wch:14},{wch:26},{wch:28},{wch:30},{wch:18},{wch:50}];
    XLSX.utils.book_append_sheet(book,sheet,'Rendez-vous');
    const weeks = new Map<string,number>();
    for (const row of scoped) {
      const key = weekKey(row.created_at);
      weeks.set(key,(weeks.get(key) ?? 0)+1);
    }
    XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([
      ['Semaine','Demandes'],
      ...[...weeks.entries()].sort(([a],[b])=>b.localeCompare(a)).map(([week,count])=>[week,count]),
    ]),'Par semaine');
    const buffer = XLSX.write(book,{type:'buffer',bookType:'xlsx'}) as Buffer;
    return new Response(new Uint8Array(buffer),{headers:{...headers,
      'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':'attachment; filename="'+name+'.xlsx"'}});
  }

  const daily = report === 'jour' || (report === 'semaine' && semaine);
  const lines = report === 'jour' || report === 'semaine'
    ? [['Période','Demandes'], ...totals(periodRows,daily ? false : true).map(([date,count])=>[date,String(count)])]
    : [bookingHeader, ...periodRows.map(bookingLine)];
  return new Response('﻿'+lines.map(line=>line.map(csvCell).join(';')).join('\r\n'),{
    headers:{...headers,'Content-Type':'text/csv; charset=utf-8',
      'Content-Disposition':'attachment; filename="'+name+'.csv"'},
  });
}
