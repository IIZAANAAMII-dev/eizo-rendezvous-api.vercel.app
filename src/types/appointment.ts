export interface Appointment {
  id?: string;
  organizer_id?: string;
  customer_name: string;
  customer_first_name: string;
  customer_company: string;
  customer_email: string;
  customer_phone: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  product: string;
  message: string;
  status: 'En attente' | 'Confirmé' | 'Annulé' | 'Refusé';
  confirmation_token: string;
  created_at?: string;
}

export interface AppointmentInput {
  nom: string;
  prenom: string;
  societe: string;
  email: string;
  telephone: string;
  date: string;
  heure: string;
  produit: string;
  message: string;
}
