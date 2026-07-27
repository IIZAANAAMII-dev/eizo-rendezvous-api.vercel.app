import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { getOrganizerConfig } from '@/config/organizers';
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

    const organizer = getOrganizerConfig(organizerId);
    if (!organizer) {
      return withCors(NextResponse.json({ error: 'Organizer not found' }, { status: 404 }), request);
    }

    // Récupérer les créneaux déjà réservés (fallback si Supabase n'est pas prêt)
    let bookings: any[] = [];
    try {
      const supabase = getSupabaseClient();
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
    const slots = generateSlotsForDate(date, organizer, bookedStartTimes);

    return withCors(NextResponse.json({ slots }), request);
  } catch (error) {
    console.error('[public availability]', error);
    return withCors(NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 }), request);
  }
}
