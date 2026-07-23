import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseClient();

    const { data: organizer, error } = await supabase
      .from('organizers')
      .select('*')
      .eq('id', id)
      .eq('active', true)
      .single();

    if (error || !organizer) {
      return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });
    }

    return NextResponse.json(organizer);
  } catch (error) {
    console.error('[public organizer]', error);
    return NextResponse.json({ error: 'Failed to fetch organizer' }, { status: 500 });
  }
}
