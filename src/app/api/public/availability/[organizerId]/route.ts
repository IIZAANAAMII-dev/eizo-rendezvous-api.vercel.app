import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { generateSlotsForDate } from '@/lib/availability';
import { handleCors, withCors } from '@/lib/cors';

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

    if (!date) {
      return withCors(NextResponse.json({ error: 'Missing date parameter' }, { status: 400 }), request);
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

    const dayOfWeek = new Date(date).getDay();
    const { data: availability, error: availabilityError } = await supabase
      .from('availability')
      .select(`
        *,
        availability_slots (*)
      `)
      .eq('organizer_id', organizer.id)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (availabilityError) {
      console.error('[public availability] availability fetch error:', availabilityError);
    }

    const daySlots = availability && availability.is_available !== false
      ? (availability.availability_slots || []).map((s: any) => ({ start: s.start_time, end: s.end_time }))
      : [];

    const enrichedOrganizer = {
      ...organizer,
      working_days: {
        ...organizer.working_days,
        [dayOfWeek]: daySlots,
      },
    };

    // Récupérer les dates indisponibles (congés, exceptions)
    const { data: exceptions, error: exceptionsError } = await supabase
      .from('availability_exceptions')
      .select('date')
      .eq('organizer_id', organizer.id)
      .eq('type', 'unavailable');

    if (exceptionsError) {
      console.error('[public availability] exceptions fetch error:', exceptionsError);
    }

    const unavailableDates = (exceptions || []).map((e: any) => e.date);

    // Récupérer les créneaux déjà réservés
    let bookings: any[] = [];
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('start_time')
        .eq('organizer_id', organizer.id)
        .eq('date', date)
        .neq('status', 'cancelled');
      if (error) {
        console.error('[public availability] bookings fetch error:', error);
      } else {
        bookings = data || [];
      }
    } catch (err) {
      console.error('[public availability] supabase unavailable, returning all slots:', err);
    }

    const bookedStartTimes = bookings.map((b: any) => b.start_time.slice(0, 5));
    const slots = generateSlotsForDate(date, enrichedOrganizer, bookedStartTimes, unavailableDates);

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
