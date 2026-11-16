import { bookingReport } from './rdv-report';
import { type Booking, type Event } from './rdv';

export function demoReport(origin: string) {
  const link = new URL('/events/demo?vue=global',origin);
  const now = new Date('2026-11-16T09:00:00+01:00');
  const events: Event[] = [
    {id:'demo-1',slug:'rencontre-2026',name:'Les Rencontres EIZO 2026',specialty:'Événement',
     event_start_date:'2026-12-03',event_end_date:'2026-12-03',venue_name:'EIZO France · Bâtiment Synapses',
     venue_location:'Vélizy-Villacoublay',active:true},
  ];
  const rows: Booking[] = Array.from({length:14},(_,index)=>({
    id:'demo-'+index, organizer_id:'demo-1',
    date:'2026-12-03', start_time:'10:00:00', end_time:'10:45:00',
    customer_name:'Participant démo '+(index+1), customer_email:'demo'+index+'@exemple.fr',
    customer_phone:null, customer_notes:null, customer_need:'ColorEdge', customer_usage:null,
    requested_product:null, product_title:null,
    status: index<9 ? 'confirmed' : index<12 ? 'pending' : 'cancelled',
    created_at:new Date(now.getTime() - (index%7)*86_400_000 - index*3_600_000).toISOString(),
  }));
  return bookingReport(rows,events,'semaine',now,link);
}
