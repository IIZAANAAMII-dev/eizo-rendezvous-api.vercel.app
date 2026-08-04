export interface WorkingDaySlot {
  start: string; // HH:mm
  end: string;   // HH:mm
}

export type WorkingDays = Record<number, WorkingDaySlot[]>; // 0 = Sunday

export interface Organizer {
  id: string;
  shopify_connection_id?: string;
  name: string;
  slug: string;
  email?: string;
  specialty?: string;
  description?: string;
  timezone?: string;
  phone?: string;
  active: boolean;
  avatar_url?: string;
  slot_duration_minutes: number;
  buffer_minutes: number;
  working_days: WorkingDays;
  notification_email?: string;
  brand_color?: string;
  locale?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizerInput {
  name: string;
  slug: string;
  email?: string;
  specialty?: string;
  description?: string;
  timezone?: string;
  phone?: string;
  active: boolean;
  slot_duration_minutes?: number;
  buffer_minutes?: number;
  working_days?: WorkingDays;
  notification_email?: string;
  brand_color?: string;
  locale?: string;
}

export interface Availability {
  id?: string;
  organizer_id: string;
  day_of_week: number;
  is_available: boolean;
  availability_slots?: AvailabilitySlot[];
}

export interface AvailabilitySlot {
  id?: string;
  availability_id?: string;
  start_time: string;
  end_time: string;
  created_at?: string;
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

export interface AppointmentType {
  id?: string;
  organizer_id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  color?: string;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentTypeInput {
  name: string;
  description?: string;
  duration_minutes: number;
  color?: string;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  active?: boolean;
}

export interface AvailabilityException {
  id?: string;
  organizer_id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  type: 'unavailable' | 'override';
  reason?: string;
  created_at?: string;
}

export interface AvailabilityExceptionInput {
  date: string;
  start_time?: string;
  end_time?: string;
  type: 'unavailable' | 'override';
  reason?: string;
}
