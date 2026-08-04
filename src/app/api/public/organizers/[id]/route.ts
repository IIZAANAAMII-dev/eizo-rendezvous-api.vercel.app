import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { handleCors, withCors } from '@/lib/cors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const { id } = await params;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('organizers')
      .select('*')
      .eq('slug', id)
      .eq('active', true)
      .single();

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return withCors(NextResponse.json({ error: 'Organizer not found' }, { status: 404 }), request);
      }
      console.error('[public organizer]', error);
      return withCors(NextResponse.json({ error: 'Failed to fetch organizer' }, { status: 500 }), request);
    }

    return withCors(NextResponse.json({
      id: data.id,
      name: data.name,
      email: data.email,
      slug: data.slug,
      specialty: data.specialty,
      description: data.description,
      avatar_url: data.avatar_url,
      timezone: data.timezone,
      slot_duration_minutes: data.slot_duration_minutes,
      buffer_minutes: data.buffer_minutes,
      working_days: data.working_days,
      notification_email: data.notification_email,
      brand_color: data.brand_color,
      locale: data.locale,
    }), request);
  } catch (error) {
    console.error('[public organizer]', error);
    return withCors(NextResponse.json({ error: 'Failed to fetch organizer' }, { status: 500 }), request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;
  return new NextResponse(null, { status: 204 });
}
