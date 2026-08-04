import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getShopifyConnectionId, toErrorResponse } from '@/lib/shopify-session';
import { getBookingSettings, upsertBookingSettings } from '@/lib/supabase';
import type { BookingSettings } from '@/types/admin';

const settingsSchema = z.object({
  duration_minutes: z.number().min(15).max(180).optional(),
  max_morning_slots: z.number().min(1).max(10).optional(),
  max_afternoon_slots: z.number().min(1).max(10).optional(),
  morning_start: z.string().optional(),
  morning_end: z.string().optional(),
  afternoon_start: z.string().optional(),
  afternoon_end: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizerId: string }> }
) {
  try {
    const { organizerId } = await params;
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    
    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }
    
    await getShopifyConnectionId(request, shop);
    
    const settings = await getBookingSettings(organizerId);
    
    return NextResponse.json(settings);
  } catch (error) {
    return toErrorResponse(error, 'Failed to fetch settings');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ organizerId: string }> }
) {
  try {
    const { organizerId } = await params;
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    
    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }
    
    await getShopifyConnectionId(request, shop);
    
    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error }, { status: 400 });
    }
    
    const settings: BookingSettings = {
      duration_minutes: parsed.data.duration_minutes ?? 60,
      max_morning_slots: parsed.data.max_morning_slots ?? 2,
      max_afternoon_slots: parsed.data.max_afternoon_slots ?? 2,
      morning_start: parsed.data.morning_start ?? '09:30',
      morning_end: parsed.data.morning_end ?? '13:00',
      afternoon_start: parsed.data.afternoon_start ?? '14:00',
      afternoon_end: parsed.data.afternoon_end ?? '17:30',
      organizer_id: organizerId,
    };
    
    const upserted = await upsertBookingSettings(settings);
    
    return NextResponse.json(upserted);
  } catch (error) {
    return toErrorResponse(error, 'Failed to update settings');
  }
}
