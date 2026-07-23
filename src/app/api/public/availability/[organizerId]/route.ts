import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizerId: string }> }
) {
  try {
    const { organizerId } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const supabase = getSupabaseClient();

    if (!date) {
      return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    // Récupérer les disponibilités pour ce jour de la semaine
    const dayOfWeek = new Date(date).getDay();

    const { data: availability, error } = await supabase
      .from('availability')
      .select('*, availability_slots(*)')
      .eq('organizer_id', organizerId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)
      .single();

    if (error || !availability) {
      return NextResponse.json({ slots: [] });
    }

    // Vérifier les exceptions pour cette date
    const { data: exceptions } = await supabase
      .from('availability_exceptions')
      .select('*')
      .eq('organizer_id', organizerId)
      .eq('date', date);

    // Générer les créneaux horaires
    const slots: { time: string; available: boolean }[] = [];
    
    if (availability.availability_slots && availability.availability_slots.length > 0) {
      availability.availability_slots.forEach((slot: any) => {
        const [startHour, startMin] = slot.start_time.split(':').map(Number);
        const [endHour, endMin] = slot.end_time.split(':').map(Number);
        
        // Générer des créneaux de 30 min
        let currentHour = startHour;
        let currentMin = startMin;
        
        while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
          const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
          
          // Vérifier si ce créneau est bloqué par une exception
          const isBlocked = exceptions?.some((ex: any) => {
            if (ex.type === 'unavailable') {
              return true; // Toute la journée est bloquée
            }
            return false;
          });

          slots.push({
            time: timeStr,
            available: !isBlocked
          });

          // Avancer de 30 min
          currentMin += 30;
          if (currentMin >= 60) {
            currentMin = 0;
            currentHour++;
          }
        }
      });
    }

    return NextResponse.json({ slots });
  } catch (error) {
    console.error('[public availability]', error);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}
