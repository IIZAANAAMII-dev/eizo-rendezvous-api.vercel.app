export interface Organizer {
  id: string;
  shopify_connection_id?: string;
  name: string;
  slug: string;
  active: boolean;
  created_at?: string;
}

export interface OrganizerInput {
  name: string;
  slug: string;
  active: boolean;
}

export interface Availability {
  id?: string;
  organizer_id: string;
  day_of_week: number;
  is_available: boolean;
  start_time?: string;
  end_time?: string;
}

export interface BookingSettings {
  id?: string;
  organizer_id: string;
  duration_minutes: number;
  max_morning_slots: number;
  max_afternoon_slots: number;
  morning_start: string;
  morning_end: string;
  afternoon_start: string;
  afternoon_end: string;
}
