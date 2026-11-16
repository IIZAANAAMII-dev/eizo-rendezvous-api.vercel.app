import { redirect } from 'next/navigation';

// Plus de démonstration à données fictives : le back-office n'affiche que les vraies données.
export default function Demo() {
  redirect('/events');
}
