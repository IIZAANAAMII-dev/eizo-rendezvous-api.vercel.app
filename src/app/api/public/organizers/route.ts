import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    
    // Récupérer tous les organisateurs actifs
    const { data: organizers, error } = await supabase
      .from('organizers')
      .select('*')
      .eq('active', true);
    
    if (error) {
      console.error('[public organizers]', error);
      return NextResponse.json({ error: 'Failed to fetch organizers' }, { status: 500 });
    }
    
    // Retourner uniquement les organisateurs actifs avec les informations publiques
    const publicOrganizers = organizers.map(o => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      email: o.email,
      specialty: o.specialty,
      avatar_url: o.avatar_url,
      active: o.active,
    }));
    
    return NextResponse.json(publicOrganizers);
  } catch (error) {
    console.error('[public organizers]', error);
    return NextResponse.json({ error: 'Failed to fetch organizers' }, { status: 500 });
  }
}
