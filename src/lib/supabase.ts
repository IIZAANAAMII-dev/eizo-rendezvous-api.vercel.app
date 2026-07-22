import { createClient } from '@supabase/supabase-js';
import type { Appointment } from '@/types/appointment';
import type { Organizer, OrganizerInput, Availability, BookingSettings } from '@/types/admin';

export function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  return createClient(supabaseUrl, supabaseKey);
}

export async function createAppointment(data: Appointment, organizerId?: string): Promise<Appointment> {
  const supabase = getSupabaseClient();
  
  const { data: inserted, error } = await supabase
    .from('appointments')
    .insert({
      organizer_id: organizerId,
      customer_name: data.customer_name,
      customer_first_name: data.customer_first_name,
      customer_company: data.customer_company,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      appointment_date: data.appointment_date,
      start_time: data.start_time,
      end_time: data.end_time,
      product: data.product,
      message: data.message,
      status: data.status,
      confirmation_token: data.confirmation_token,
    })
    .select()
    .single();

  if (error) {
    console.error('[supabase] Failed to create appointment:', error);
    throw new Error('Failed to create appointment in Supabase');
  }

  return inserted;
}

export async function getAppointmentsByDate(date: string, organizerId?: string): Promise<Appointment[]> {
  const supabase = getSupabaseClient();
  
  const query = supabase
    .from('appointments')
    .select('*')
    .eq('appointment_date', date)
    .neq('status', 'Annulé')
    .neq('status', 'Refusé');
  
  if (organizerId) {
    query.eq('organizer_id', organizerId);
  }
  
  const { data, error } = await query;

  if (error) {
    console.error('[supabase] Failed to fetch appointments:', error);
    throw new Error('Failed to fetch appointments from Supabase');
  }

  return data || [];
}

export async function getAppointmentByToken(token: string, organizerId?: string): Promise<Appointment | null> {
  const supabase = getSupabaseClient();
  
  const query = supabase
    .from('appointments')
    .select('*')
    .eq('confirmation_token', token);
  
  if (organizerId) {
    query.eq('organizer_id', organizerId);
  }
  
  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('[supabase] Failed to fetch appointment by token:', error);
    throw new Error('Failed to fetch appointment from Supabase');
  }

  return data;
}

export async function updateAppointmentStatus(id: string, status: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('[supabase] Failed to update appointment status:', error);
    throw new Error('Failed to update appointment status in Supabase');
  }
}

// Organizer functions
export async function getOrganizerBySlug(slug: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('organizers')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[supabase] Failed to fetch organizer:', error);
    throw new Error('Failed to fetch organizer from Supabase');
  }

  return data;
}

// Availability functions
export async function getAvailabilityByDate(date: string, organizerId?: string) {
  const supabase = getSupabaseClient();
  const dayOfWeek = new Date(date).getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  const query = supabase
    .from('availability')
    .select('*')
    .eq('day_of_week', dayOfWeek);
  
  if (organizerId) {
    query.eq('organizer_id', organizerId);
  }
  
  const { data, error } = await query.single();

  if (error && error.code !== 'PGRST116') {
    console.error('[supabase] Failed to fetch availability:', error);
    throw new Error('Failed to fetch availability from Supabase');
  }

  return data;
}

export async function isDateBlocked(date: string, organizerId?: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const query = supabase
    .from('blocked_dates')
    .select('id')
    .eq('date', date);
  
  if (organizerId) {
    query.eq('organizer_id', organizerId);
  }
  
  const { data, error } = await query.single();

  if (error && error.code !== 'PGRST116') {
    console.error('[supabase] Failed to check blocked date:', error);
    throw new Error('Failed to check blocked date in Supabase');
  }

  return !!data;
}

export async function getBookingSettings(organizerId?: string) {
  const supabase = getSupabaseClient();
  
  const query = supabase
    .from('booking_settings')
    .select('*');
  
  if (organizerId) {
    query.eq('organizer_id', organizerId);
  }
  
  const { data, error } = await query.single();

  if (error && error.code !== 'PGRST116') {
    console.error('[supabase] Failed to fetch booking settings:', error);
    throw new Error('Failed to fetch booking settings from Supabase');
  }

  // Default settings if not configured
  return data || {
    duration_minutes: 60,
    max_morning_slots: 2,
    max_afternoon_slots: 2,
    morning_start: '09:30',
    morning_end: '13:00',
    afternoon_start: '14:00',
    afternoon_end: '17:30',
  };
}

// Admin functions for organizers
export async function getOrganizerBySlugForShop(slug: string, shopifyConnectionId: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('organizers')
    .select('*')
    .eq('slug', slug)
    .eq('shopify_connection_id', shopifyConnectionId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[supabase] Failed to fetch organizer for shop:', error);
    throw new Error('Failed to fetch organizer from Supabase');
  }

  return data;
}

export async function getOrganizersByShop(shopifyConnectionId: string): Promise<Organizer[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('organizers')
    .select('*')
    .eq('shopify_connection_id', shopifyConnectionId);

  if (error) {
    console.error('[supabase] Failed to fetch organizers for shop:', error);
    throw new Error('Failed to fetch organizers from Supabase');
  }

  return data || [];
}

export async function createOrganizer(data: OrganizerInput, shopifyConnectionId: string): Promise<Organizer> {
  const supabase = getSupabaseClient();
  
  const { data: inserted, error } = await supabase
    .from('organizers')
    .insert({
      ...data,
      shopify_connection_id: shopifyConnectionId,
    })
    .select()
    .single();

  if (error) {
    console.error('[supabase] Failed to create organizer:', error);
    throw new Error('Failed to create organizer in Supabase');
  }

  return inserted;
}

export async function updateOrganizer(id: string, data: Partial<OrganizerInput>, shopifyConnectionId: string): Promise<Organizer> {
  const supabase = getSupabaseClient();
  
  const { data: updated, error } = await supabase
    .from('organizers')
    .update(data)
    .eq('id', id)
    .eq('shopify_connection_id', shopifyConnectionId)
    .select()
    .single();

  if (error) {
    console.error('[supabase] Failed to update organizer:', error);
    throw new Error('Failed to update organizer in Supabase');
  }

  if (!updated) {
    throw new Error('Organizer not found or does not belong to this shop');
  }

  return updated;
}

export async function deleteOrganizer(id: string, shopifyConnectionId: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('organizers')
    .delete()
    .eq('id', id)
    .eq('shopify_connection_id', shopifyConnectionId);

  if (error) {
    console.error('[supabase] Failed to delete organizer:', error);
    throw new Error('Failed to delete organizer in Supabase');
  }
}

export async function upsertAvailability(data: Availability): Promise<Availability> {
  const supabase = getSupabaseClient();
  
  const { data: upserted, error } = await supabase
    .from('availability')
    .upsert(data, { onConflict: 'organizer_id,day_of_week' })
    .select()
    .single();

  if (error) {
    console.error('[supabase] Failed to upsert availability:', error);
    throw new Error('Failed to upsert availability in Supabase');
  }

  return upserted;
}

export async function upsertBookingSettings(data: BookingSettings): Promise<BookingSettings> {
  const supabase = getSupabaseClient();
  
  const { data: upserted, error } = await supabase
    .from('booking_settings')
    .upsert(data, { onConflict: 'organizer_id' })
    .select()
    .single();

  if (error) {
    console.error('[supabase] Failed to upsert booking settings:', error);
    throw new Error('Failed to upsert booking settings in Supabase');
  }

  return upserted;
}
