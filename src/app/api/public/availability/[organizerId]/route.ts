import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { generateSlotsForDate } from '@/lib/availability';
import { handleCors, withCors } from '@/lib/cors';

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizerId: string }> }
) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const { organizerId } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    if (!date && !month) {
      return withCors(NextResponse.json({ error: 'Missing date or month parameter' }, { status: 400 }), request);
    }

    const supabase = getSupabaseClient();

    const { data: organizer, error: organizerError } = await supabase
      .from('organizers')
      .select('*')
      .eq('slug', organizerId)
      .eq('active', true)
      .single();

    if (organizerError || !organizer) {
      if (organizerError?.code === 'PGRST116') {
        return withCors(NextResponse.json({ error: 'Organizer not found' }, { status: 404 }), request);
      }
      console.error('[public availability] organizer fetch error:', organizerError);
      return withCors(NextResponse.json({ error: 'Failed to fetch organizer' }, { status: 500 }), request);
    }

    // Préparation des working_days pour chaque jour de la semaine
    const { data: availabilities, error: availabilityError } = await supabase
      .from('availability')
      .select(`
        *,
        availability_slots (*)
      `)
      .eq('organizer_id', organizer.id)
      .eq('is_available', true);

    if (availabilityError) {
      console.error('[public availability] availability fetch error:', availabilityError);
    }

    // Construire les plages horaires pour chaque jour de la semaine
    const workingDays: Record<number, { start: string; end: string }[]> = {};
    for (const av of (availabilities || [])) {
      if (av.is_available === false) continue;
      const slotsForDay = (av.availability_slots || []).map((s: any) => ({
        start: s.start_time,
        end: s.end_time,
      }));
      workingDays[av.day_of_week] = slotsForDay;
    }

    const enrichedOrganizer = {
      ...organizer,
      working_days: workingDays,
    };

    // Récupérer les dates indisponibles (congés, exceptions)
    let unavailableDates: string[] = [];
    try {
      const { data: exceptions, error: exceptionsError } = await supabase
        .from('availability_exceptions')
        .select('date')
        .eq('organizer_id', organizer.id);

      if (exceptionsError) {
        console.error('[public availability] exceptions fetch error:', exceptionsError);
      } else {
        unavailableDates = (exceptions || []).map((e: any) => e.date);
      }
    } catch (err) {
      console.error('[public availability] exceptions unavailable, ignoring:', err);
    }

    // Si un mois complet est demandé
    if (month) {
      const [y, m] = month.split('-').map(Number);
      const firstDay = new Date(y, m - 1, 1);
      const lastDay = new Date(y, m, 0);
      const startDate = `${y}-${pad(m)}-${pad(1)}`;
      const endDate = `${y}-${pad(m)}-${pad(lastDay.getDate())}`;

      let allBookings: any[] = [];
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('date, start_time')
          .eq('organizer_id', organizer.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .not('status', 'in', ['cancelled', 'refused']);
        if (error) {
          console.error('[public availability month] bookings fetch error:', error);
        } else {
          allBookings = data || [];
        }
      } catch (err) {
        console.error('[public availability month] bookings error:', err);
      }

      const bookingsByDate: Record<string, string[]> = {};
      for (const b of allBookings) {
        if (!bookingsByDate[b.date]) bookingsByDate[b.date] = [];
        bookingsByDate[b.date].push(b.start_time.slice(0, 8));
      }

      const dates: Record<string, any[]> = {};
      for (let d = 1; d <= lastDay.getDate(); d++) {
        const ds = `${y}-${pad(m)}-${pad(d)}`;
        const bookedStartTimes = bookingsByDate[ds] || [];
        dates[ds] = generateSlotsForDate(ds, enrichedOrganizer, bookedStartTimes, unavailableDates);
      }

      return withCors(NextResponse.json({ dates, month, workingDays: Object.keys(workingDays) }), request);
    }

    // Sinon, un seul jour
    const dayOfWeek = new Date(date!).getDay();
    const daySlots = workingDays[dayOfWeek] || [];

    // Récupérer les créneaux déjà réservés pour cette date
    let bookings: any[] = [];
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('start_time')
        .eq('organizer_id', organizer.id)
        .eq('date', date)
        .not('status', 'in', ['cancelled', 'refused']);
      if (error) {
        console.error('[public availability] bookings fetch error:', error);
      } else {
        bookings = data || [];
      }
    } catch (err) {
      console.error('[public availability] supabase unavailable, returning all slots:', err);
    }

    const bookedStartTimes = bookings.map((b: any) => b.start_time.slice(0, 8));
    const slots = generateSlotsForDate(date!, enrichedOrganizer, bookedStartTimes, unavailableDates);

    return withCors(NextResponse.json({ slots }), request);
  } catch (error) {
    console.error('[public availability]', error);
    return withCors(NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 }), request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;
  return new NextResponse(null, { status: 204 });
}
