import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { handleCors, withCors } from '@/lib/cors';

export async function GET(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('organizers')
      .select('id, name, slug, specialty')
      .eq('active', true);

    if (error) {
      console.error('[public organizers]', error);
      return withCors(NextResponse.json({ error: 'Failed to fetch organizers' }, { status: 500 }), request);
    }

    return withCors(NextResponse.json(data), request);
  } catch (error) {
    console.error('[public organizers]', error);
    return withCors(NextResponse.json({ error: 'Failed to fetch organizers' }, { status: 500 }), request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;
  return new NextResponse(null, { status: 204 });
}
