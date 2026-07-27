import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerConfig } from '@/config/organizers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const organizer = getOrganizerConfig(id);

    if (!organizer) {
      return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: organizer.id,
      name: organizer.name,
      email: organizer.email,
      slug: organizer.slug,
      specialty: organizer.specialty,
      description: organizer.description,
      avatar_url: organizer.avatarUrl,
      timezone: organizer.timezone,
    });
  } catch (error) {
    console.error('[public organizer]', error);
    return NextResponse.json({ error: 'Failed to fetch organizer' }, { status: 500 });
  }
}
