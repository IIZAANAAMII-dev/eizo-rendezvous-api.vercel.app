import { Dashboard, Shell } from '../view';
import { type Participant, type Query, singleValues, statuses } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const metadata = { title:'Démonstration · EIZO Events', robots:{index:false,follow:false} };
const events = [
  {slug:'rencontre-2026',title:'Les Rencontres EIZO 2026',starts_on:null,registrations:48},
  {slug:'atelier-coloredge',title:'Atelier ColorEdge',starts_on:null,registrations:18},
];
export default async function Demo({searchParams}: {searchParams:Promise<Query>}) {
  const query = singleValues(await searchParams);
  const event = events.find(item=>item.slug===query.event) ?? events[0];
  const rows: Participant[] = Array.from({length:event.registrations},(_,index)=>({
    id:String(index),source_id:String(index),name:'Participant démo '+(index+1),email:'demo'+(index+1)+'@example.invalid',
    company:['Studio Exemple','Clinique Démo','Atelier Fictif','Groupe Illustration'][index%4],
    sector:['Graphisme','Médical','Industrie','Bureautique'][index%4],
    registered_at:new Date(Date.now()-Math.floor(index*index/34)*86_400_000).toISOString(),
    status:statuses[index%4],notes:'',
  }));
  return <Shell><Dashboard demo query={query} events={events} event={event} rows={rows}/></Shell>;
}
