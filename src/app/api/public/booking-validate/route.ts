import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { sendBookingConfirmedEmail } from '@/lib/email';
import { handleCors, withCors } from '@/lib/cors';

function htmlResponse(title: string, message: string, success = true) {
  return new NextResponse(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f6f8fb; color: #0b1220; }
    .card { background: #fff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); text-align: center; max-width: 480px; }
    .icon { width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; font-size: 30px; }
    .success .icon { background: rgba(16,185,129,0.1); color: #10b981; }
    .error .icon { background: rgba(239,68,68,0.1); color: #ef4444; }
    h1 { font-size: 24px; margin: 0 0 12px; }
    p { color: #5e6a7e; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card ${success ? 'success' : 'error'}">
    <div class="icon">${success ? '✓' : '✕'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function GET(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const action = searchParams.get('action');

    if (!token || !['accept', 'decline'].includes(action || '')) {
      return withCors(NextResponse.json({ error: 'Invalid request' }, { status: 400 }), request);
    }

    const supabase = getSupabaseClient();

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('confirmation_token', token)
      .single();

    if (error || !booking) {
      console.error('[validate booking] find error:', error);
      return withCors(NextResponse.json({ error: 'Booking not found' }, { status: 404 }), request);
    }

    const { data: organizer } = await supabase
      .from('organizers')
      .select('name, email')
      .eq('id', booking.organizer_id)
      .single();

    if (booking.status === 'cancelled') {
      return htmlResponse('Rendez-vous déjà annulé', 'Ce rendez-vous a déjà été refusé.');
    }

    if (action === 'accept') {
      if (booking.status === 'confirmed') {
        return htmlResponse('Déjà confirmé', 'Ce rendez-vous est déjà accepté.');
      }

      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (updateError) {
        console.error('[validate booking] accept error:', updateError);
        return withCors(NextResponse.json({ error: 'Failed to confirm booking' }, { status: 500 }), request);
      }

      // Notifier le client
      try {
        await sendBookingConfirmedEmail({
          customerName: booking.customer_name,
          customerEmail: booking.customer_email,
          date: booking.date,
          time: booking.start_time.slice(0, 5),
          organizerName: organizer?.name || 'Expert EIZO',
          organizerEmail: organizer?.email || '',
          productTitle: booking.product_title || undefined,
        });
      } catch (emailError) {
        console.error('[validate booking] customer email error:', emailError);
      }

      return htmlResponse('Rendez-vous accepté', `Le rendez-vous avec ${booking.customer_name} est confirmé.`);
    }

    if (action === 'decline') {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (updateError) {
        console.error('[validate booking] decline error:', updateError);
        return withCors(NextResponse.json({ error: 'Failed to decline booking' }, { status: 500 }), request);
      }

      return htmlResponse('Rendez-vous refusé', 'Le créneau est de nouveau disponible.');
    }

    return withCors(NextResponse.json({ error: 'Invalid action' }, { status: 400 }), request);
  } catch (error) {
    console.error('[validate booking]', error);
    return withCors(NextResponse.json({ error: 'Failed to process request' }, { status: 500 }), request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;
  return new NextResponse(null, { status: 204 });
}
