import { NextRequest, NextResponse } from 'next/server';
import { getAllOrganizers } from '@/config/organizers';
import { handleCors, withCors } from '@/lib/cors';

export async function GET(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const organizers = getAllOrganizers();
    return withCors(NextResponse.json(organizers), request);
  } catch (error) {
    console.error('[public organizers]', error);
    return withCors(NextResponse.json({ error: 'Failed to fetch organizers' }, { status: 500 }), request);
  }
}
