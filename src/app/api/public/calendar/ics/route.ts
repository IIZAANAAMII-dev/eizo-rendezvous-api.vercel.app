import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { buildIcsCalendar } from '@/lib/calendar';
import { siteConfig } from '@/lib/config';
import { handleCors, withCors } from '@/lib/cors';

export async function GET(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const role = searchParams.get('role') || 'client';

    if (!token) {
      return withCors(NextResponse.json({ error: 'Token manquant' }, { status: 400 }), request);
    }

    const supabase = getSupabaseClient();

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('management_token', token)
      .single();

    if (error || !booking) {
      return withCors(NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 }), request);
    }

    const requestedProduct = booking.requested_product?.title || booking.product_title || 'ColorEdge';
    const startTime = booking.start_time.slice(0, 5);
    const endTime = booking.end_time ? booking.end_time.slice(0, 5) : startTime;

    let title: string;
    let description: string;

    if (role === 'expert') {
      title = `Démonstration EIZO ColorEdge — ${booking.customer_name}`;
      description = [
        `Client : ${booking.customer_name}`,
        `Téléphone : ${booking.customer_phone || ''}`,
        `Email : ${booking.customer_email}`,
        `Démonstration : ${requestedProduct}`,
        booking.customer_usage && `Utilisation : ${booking.customer_usage}`,
        booking.customer_notes && `Message : ${booking.customer_notes}`,
        `Lieu : ${siteConfig.showroom.fullAddress}`,
      ].filter(Boolean).join('\n');
    } else {
      title = `Démonstration EIZO ColorEdge — ${siteConfig.showroom.name}`;
      description = [
        `Démonstration : ${requestedProduct}`,
        booking.customer_usage && `Utilisation : ${booking.customer_usage}`,
        `Lieu : ${siteConfig.showroom.fullAddress}`,
        siteConfig.showroom.googleMapsUrl,
      ].filter(Boolean).join('\n');
    }

    const ics = buildIcsCalendar({
      title,
      startDate: booking.date,
      startTime,
      endDate: booking.date,
      endTime,
      location: siteConfig.showroom.fullAddress,
      description,
      uid: booking.management_token || booking.id,
    });

    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="eizo-coloredge.ics"',
      },
    });
  } catch (error) {
    console.error('[calendar ics]', error);
    return withCors(NextResponse.json({ error: 'Erreur lors de la génération du calendrier' }, { status: 500 }), request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;
  return new NextResponse(null, { status: 204 });
}
