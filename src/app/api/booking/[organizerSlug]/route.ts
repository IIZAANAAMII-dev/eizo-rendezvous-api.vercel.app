import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerBySlug } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizerSlug: string }> }
) {
  try {
    const { organizerSlug } = await params;

    if (!organizerSlug) {
      return NextResponse.json(
        { error: 'Missing organizer slug' },
        { status: 400 }
      );
    }

    const organizer = await getOrganizerBySlug(organizerSlug);

    if (!organizer) {
      return NextResponse.json(
        { error: 'Organizer not found' },
        { status: 404 }
      );
    }

    // Return only public information
    return NextResponse.json({
      id: organizer.id,
      name: organizer.name,
      slug: organizer.slug,
      active: organizer.active,
    });
  } catch (error) {
    console.error('[booking organizer]', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizer' },
      { status: 500 }
    );
  }
}
