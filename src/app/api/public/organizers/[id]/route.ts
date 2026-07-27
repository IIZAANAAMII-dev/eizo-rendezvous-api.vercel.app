import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerConfig } from '@/config/organizers';
import { handleCors, withCors } from '@/lib/cors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const { id } = await params;
    const organizer = getOrganizerConfig(id);

    if (!organizer) {
      return withCors(NextResponse.json({ error: 'Organizer not found' }, { status: 404 }), request);
    }

    return withCors(NextResponse.json({
      id: organizer.id,
      name: organizer.name,
      email: organizer.email,
      slug: organizer.slug,
      specialty: organizer.specialty,
      description: organizer.description,
      avatar_url: organizer.avatarUrl,
      timezone: organizer.timezone,
    }), request);
  } catch (error) {
    console.error('[public organizer]', error);
    return withCors(NextResponse.json({ error: 'Failed to fetch organizer' }, { status: 500 }), request);
  }
}
