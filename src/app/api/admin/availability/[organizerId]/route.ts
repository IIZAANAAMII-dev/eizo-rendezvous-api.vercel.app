import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getShopifyConnectionId, toErrorResponse } from '@/lib/shopify-session';
import { getSupabaseClient, upsertAvailability } from '@/lib/supabase';
import type { Availability, AvailabilitySlot } from '@/types/admin';

const availabilitySlotSchema = z.object({
  id: z.string().optional(),
  start_time: z.string(),
  end_time: z.string(),
});

const availabilitySchema = z.object({
  day_of_week: z.number().min(0).max(6),
  is_available: z.boolean(),
  availability_slots: z.array(availabilitySlotSchema).optional(),
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

    const shopifyConnectionId = await getShopifyConnectionId(request, shop);

    const supabase = getSupabaseClient();

    // Récupérer toutes les disponibilités avec leurs slots
    const { data, error } = await supabase
      .from('availability')
      .select(`
        *,
        availability_slots (*)
      `)
      .eq('organizer_id', organizerId);

    if (error) {
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error) {
    return toErrorResponse(error, 'Failed to fetch availability');
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
    const parsed = availabilitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error }, { status: 400 });
    }

    const { availability_slots, ...availabilityData } = parsed.data;

    const supabase = getSupabaseClient();

    // Upsert availability
    const { data: upsertedAvailability, error: availabilityError } = await supabase
      .from('availability')
      .upsert({
        ...availabilityData,
        organizer_id: organizerId,
      }, { onConflict: 'organizer_id,day_of_week' })
      .select()
      .single();

    if (availabilityError) {
      throw availabilityError;
    }

    // Delete existing slots for this availability
    await supabase
      .from('availability_slots')
      .delete()
      .eq('availability_id', upsertedAvailability.id);

    // Insert new slots
    if (availability_slots && availability_slots.length > 0) {
      const slotsToInsert = availability_slots.map(slot => ({
        availability_id: upsertedAvailability.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
      }));

      const { error: slotsError } = await supabase
        .from('availability_slots')
        .insert(slotsToInsert);

      if (slotsError) {
        throw slotsError;
      }
    }

    // Fetch updated availability with slots
    const { data: finalData, error: fetchError } = await supabase
      .from('availability')
      .select(`
        *,
        availability_slots (*)
      `)
      .eq('id', upsertedAvailability.id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    return NextResponse.json(finalData);
  } catch (error) {
    return toErrorResponse(error, 'Failed to update availability');
  }
}
