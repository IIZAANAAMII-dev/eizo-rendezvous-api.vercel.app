import { cookies } from 'next/headers';
import * as XLSX from 'xlsx';
import { eventRole } from '@/lib/events-access';
import { bookings, csvCell, events, inWeek, slug, totals, weekKey, type Booking } from '@/lib/rdv';

const headers = {'Cache-Control':'private, no-store'};

export async function GET(request: Request) {
  if (!await eventRole((await cookies()).get('eizo-events')?.value))
    return new Response('Accès refusé',{status:401,headers});
  const query = new URL(request.url).searchParams;
  const scope = slug.safeParse(query.get('event'));
  if (query.get('event') && !scope.success) return new Response('Événement invalide',{status:400,headers});
  const [list, rows] = await Promise.all([events(), bookings()]);
  const scoped = scope.success ? rows.filter(row=>{
    const event = list.find(item=>item.slug===scope.data);
    return event && row.organizer_id===event.id;
  }) : rows;
  const eventName = new Map(list.map(item=>[item.id,item.name]));
  const report = query.get('type');
  const semaine = /^\d{4}-\d{2}-\d{2}$/.test(query.get('semaine') ?? '') ? query.get('semaine')! : null;
  const periodRows = semaine ? scoped.filter(row=>inWeek(row,semaine)) : scoped;
  const name = 'eizo-rdv'+(scope.success ? '-'+scope.data : '')+(semaine ? '-'+semaine : '');

  const bookingLine = (row:Booking) => [
    row.created_at,row.date,row.start_time,row.end_time,row.customer_name,row.customer_email,
    row.customer_phone ?? '',row.customer_need ?? '',row.customer_usage ?? '',
    row.requested_product?.title ?? row.product_title ?? '',row.status,eventName.get(row.organizer_id) ?? '',row.customer_notes ?? '',
  ];
  const bookingHeader = ['Demande le','Date RDV','Début','Fin','Nom','Email','Téléphone','Besoin','Usage','Produit','Statut','Événement','Message'];

  if (query.get('format') === 'xlsx') {
    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([bookingHeader,...periodRows.map(bookingLine)]);
    sheet['!cols'] = [{wch:20},{wch:11},{wch:6},{wch:6},{wch:24},{wch:32},{wch:14},{wch:30},{wch:18},{wch:30},{wch:12},{wch:24},{wch:40}];
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
