import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getOrganizerBySlug,
  getAvailabilityByDate,
  isDateBlocked,
  getBookingSettings,
  getAppointmentsByDate,
} from '@/lib/supabase';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

function generateTimeSlots(
  start: string,
  end: string,
  durationMinutes: number
): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);
  
  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  while (currentMinutes + durationMinutes <= endMinutes) {
    const hour = Math.floor(currentMinutes / 60);
    const min = currentMinutes % 60;
    slots.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    currentMinutes += durationMinutes;
  }
  
  return slots;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizerSlug: string }> }
) {
  try {
    const { organizerSlug } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    const validation = schema.safeParse({ date });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Get organizer
    const organizer = await getOrganizerBySlug(organizerSlug);
    if (!organizer) {
      return NextResponse.json(
        { error: 'Organizer not found' },
        { status: 404 }
      );
    }

    if (!organizer.active) {
      return NextResponse.json(
        { error: 'Organizer is not active' },
        { status: 404 }
      );
    }

    // Check if date is blocked
    const blocked = await isDateBlocked(date, organizer.id);
    if (blocked) {
      return NextResponse.json({
        date,
        availableSlots: [],
        isBlocked: true,
      });
    }

    // Check if organizer works on this day
    const availability = await getAvailabilityByDate(date, organizer.id);
    if (!availability || !availability.is_available) {
      return NextResponse.json({
        date,
        availableSlots: [],
        isAvailable: false,
      });
    }

    // Get booking settings
    const settings = await getBookingSettings(organizer.id);

    // Get existing appointments
    const appointments = await getAppointmentsByDate(date, organizer.id);
    const busySlots = new Set(appointments.map((a) => a.start_time));

    // Generate morning slots
    const morningSlots = generateTimeSlots(
      settings.morning_start,
      settings.morning_end,
      settings.duration_minutes
    );

    // Generate afternoon slots
    const afternoonSlots = generateTimeSlots(
      settings.afternoon_start,
      settings.afternoon_end,
      settings.duration_minutes
    );

    // Filter and limit slots
    const availableMorningSlots: string[] = [];
    const availableAfternoonSlots: string[] = [];

    for (const slot of morningSlots) {
      if (!busySlots.has(slot) && availableMorningSlots.length < settings.max_morning_slots) {
        availableMorningSlots.push(slot);
      }
    }

    for (const slot of afternoonSlots) {
      if (!busySlots.has(slot) && availableAfternoonSlots.length < settings.max_afternoon_slots) {
        availableAfternoonSlots.push(slot);
      }
    }

    const availableSlots = [...availableMorningSlots, ...availableAfternoonSlots];

    return NextResponse.json({
      date,
      availableSlots,
      isBlocked: false,
      isAvailable: true,
      settings: {
        durationMinutes: settings.duration_minutes,
        maxMorningSlots: settings.max_morning_slots,
        maxAfternoonSlots: settings.max_afternoon_slots,
      },
    });
  } catch (error) {
    console.error('[booking availability] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}
