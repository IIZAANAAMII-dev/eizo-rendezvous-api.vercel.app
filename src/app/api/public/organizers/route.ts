import { NextResponse } from 'next/server';
import { getAllOrganizers } from '@/config/organizers';

export async function GET() {
  try {
    const organizers = getAllOrganizers();
    return NextResponse.json(organizers);
  } catch (error) {
    console.error('[public organizers]', error);
    return NextResponse.json({ error: 'Failed to fetch organizers' }, { status: 500 });
  }
}
