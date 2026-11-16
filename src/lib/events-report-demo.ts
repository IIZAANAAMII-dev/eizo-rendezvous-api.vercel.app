import { report } from './events-report';
import { type Participant } from './events';

export function demoReport(origin: string) {
  const link = new URL('/events/demo',origin);
  const friday = new Date('2026-11-13T12:00:00+01:00');
  const rows: Participant[] = Array.from({length:12},(_,index)=>({
    id:String(index),source_id:String(index),registered_at:friday.toISOString(),name:'Démo',
    email:'demo@example.invalid',company:'',sector:'',notes:'',status:index<7?'Confirmé':'Nouveau',
  }));
  const event = {slug:'rencontre-2026',title:'Rencontres EIZO 2026 · Démonstration',starts_on:null};
  return report(event,rows,'semaine',new Date('2026-11-16T09:00:00+01:00'),link);
}
