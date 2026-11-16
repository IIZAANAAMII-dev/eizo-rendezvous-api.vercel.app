import { Dashboard, Shell } from '../view';
import { type Booking, type Event, type Query, singleValues } from '@/lib/rdv';

export const dynamic = 'force-dynamic';
export const metadata = { title:'Démonstration · EIZO Events', robots:{index:false,follow:false} };

const events: Event[] = [
  {id:'demo-1',slug:'rencontre-2026',name:'Les Rencontres EIZO 2026',specialty:'Événement',
   event_start_date:'2026-12-03',event_end_date:'2026-12-03',venue_name:'EIZO France · Bâtiment Synapses',
   venue_location:'12 rue Paul Dautier · Vélizy-Villacoublay',active:true},
  {id:'demo-2',slug:'euronaval-2026',name:'Équipe EIZO',specialty:'EURONAVAL 2026',
   event_start_date:'2026-11-03',event_end_date:'2026-11-06',venue_name:'Paris Nord Villepinte',
   venue_location:'Paris, France · Hall 6',active:false},
];
const names = ['Camille Rousseau','Karim Benali','Claire Fontaine','Antoine Mercier','Léa Garnier','Hugo Petit','Inès Lambert','Marc Dubois','Sarah Cohen','Julien Faure'];
const statuses: Booking['status'][] = ['confirmed','pending','confirmed','refused','confirmed','pending','cancelled','confirmed','no_show','pending'];
const needs = ['ColorEdge pour retouche photo','RadiForce pour imagerie','DuraVision pour supervision','ColorEdge CG série'];

export default async function Demo({searchParams}: {searchParams:Promise<Query>}) {
  const query = singleValues(await searchParams);
  const event = events.find(item=>item.slug===query.event);
  const now = Date.now();
  const rows: Booking[] = Array.from({length:64},(_,index)=>{
    const created = new Date(now - Math.floor(index*index/22)*3_600_000 - (index%7)*86_400_000);
    const day = new Date(created.getTime() + 12*86_400_000);
    const slot = 9 + (index*3)%6;
    return {
      id:'demo-'+index, organizer_id: index%5===0 ? 'demo-2' : 'demo-1',
      date: day.toISOString().slice(0,10),
      start_time:String(slot).padStart(2,'0')+':00:00', end_time:String(slot+1).padStart(2,'0')+':00:00',
      customer_name:names[index%names.length]+' '+index,
      customer_email:'contact'+index+'@exemple.fr', customer_phone:'06 12 34 56 '+String(index).padStart(2,'0'),
      customer_notes:'', customer_need:needs[index%needs.length], customer_usage:index%2?'Graphisme':'Imagerie médicale',
      requested_product:{title:'ColorEdge CG319X'}, product_title:null,
      status:statuses[index%statuses.length], created_at:created.toISOString(),
    };
  });
  return <Shell><Dashboard demo query={query} events={events} event={event} rows={rows}/></Shell>;
}
