import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllReservationsByDate } from '@/lib/shopify';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

export async function GET(request: NextRequest) {
  try {
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

    const reservations = await getAllReservationsByDate(date);
    const busySlots = reservations.map((r) => r.heure);

    return NextResponse.json({
      date,
      busySlots,
    });
  } catch (error) {
    console.error('[availability] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}
