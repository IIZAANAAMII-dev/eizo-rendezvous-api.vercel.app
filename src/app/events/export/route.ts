import { cookies } from 'next/headers';
import { eventRole } from '@/lib/events-access';
import { csvCell, participants, slug, totals } from '@/lib/events';

export async function GET(request: Request) {
  const headers = {'Cache-Control':'private, no-store'};
  if (!await eventRole((await cookies()).get('eizo-events')?.value))
    return new Response('Accès refusé',{status:401,headers});
  const query = new URL(request.url).searchParams;
  const event = slug.safeParse(query.get('event'));
  if (!event.success) return new Response('Événement invalide',{status:400,headers});
  const rows = await participants(event.data);
  const report = query.get('type');
  const lines = report === 'jour' || report === 'semaine'
    ? [['Période','Inscriptions'], ...totals(rows,report==='semaine').map(([date,count])=>[date,String(count)])]
    : [['Inscription','Nom','Email','Entreprise','Secteur','Statut'], ...rows.map(row =>
      [row.registered_at,row.name,row.email,row.company,row.sector,row.status])];
  return new Response('\uFEFF'+lines.map(line=>line.map(csvCell).join(';')).join('\r\n'),{
    headers:{...headers,'Content-Type':'text/csv; charset=utf-8',
      'Content-Disposition':'attachment; filename="eizo-'+event.data+'.csv"'},
  });
}
