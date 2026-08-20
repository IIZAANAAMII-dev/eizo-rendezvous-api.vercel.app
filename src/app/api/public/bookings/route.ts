import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseClient } from '@/lib/supabase';
import { timeToMinutes, minutesToTime } from '@/lib/availability';
import { sendConfirmationEmail, sendOrganizerNotification } from '@/lib/email';
import { getExpertEmail, siteConfig } from '@/lib/config';
import { handleCors, withCors } from '@/lib/cors';

interface ViewedProduct {
  productId?: string;
  title?: string;
  handle?: string;
  url?: string;
  viewedAt?: number;
}

interface RequestedProduct {
  productId?: string;
  title?: string;
  handle?: string;
  url?: string;
}

function sanitizeString(value: unknown, maxLength = 2000): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length > maxLength) return trimmed.slice(0, maxLength);
  return trimmed || null;
}

function sanitizePhone(value: unknown): string | null {
  const raw = sanitizeString(value, 40);
  if (!raw) return null;
  // Garde chiffres, espaces, +, -, parenthèses et points. Refuse si vide.
  const cleaned = raw.replace(/[^\d\s\+\-\(\)\.]/g, '');
  return cleaned || null;
}

function sanitizeRequestedProduct(value: unknown): RequestedProduct | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const allowed: RequestedProduct = {};
  const productId = sanitizeString(v.productId, 120);
  const title = sanitizeString(v.title, 300);
  const handle = sanitizeString(v.handle, 120);
  const url = sanitizeString(v.url, 2000);
  if (productId) allowed.productId = productId;
  if (title) allowed.title = title;
  if (handle) allowed.handle = handle;
  if (url) allowed.url = url;
  return Object.keys(allowed).length ? allowed : null;
}

function sanitizeProductsViewed(value: unknown): ViewedProduct[] | null {
  if (!Array.isArray(value)) return null;
  const items: ViewedProduct[] = [];
  for (const raw of value.slice(0, 20)) {
    if (!raw || typeof raw !== 'object') continue;
    const v = raw as Record<string, unknown>;
    const item: ViewedProduct = {};
    const productId = sanitizeString(v.productId, 120);
    const title = sanitizeString(v.title, 300);
    const handle = sanitizeString(v.handle, 120);
    const url = sanitizeString(v.url, 2000);
    const viewedAt = typeof v.viewedAt === 'number' ? v.viewedAt : undefined;
    if (productId) item.productId = productId;
    if (title) item.title = title;
    if (handle) item.handle = handle;
    if (url) item.url = url;
    if (viewedAt !== undefined && Number.isFinite(viewedAt)) item.viewedAt = viewedAt;
    if (Object.keys(item).length) items.push(item);
  }
  return items.length ? items : null;
}

export async function POST(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const body = await request.json();

    // Accepte customer* ou client* pour la compatibilité
    const customerName = sanitizeString(body.customerName ?? body.clientName, 120);
    const customerEmail = sanitizeString(body.customerEmail ?? body.clientEmail, 120);
    const customerPhone = sanitizePhone(body.customerPhone ?? body.clientPhone);
    const notes = sanitizeString(body.notes ?? body.customerNotes, 2000);
    const customerNeed = sanitizeString(body.customerNeed, 2000);
    const customerUsage = sanitizeString(body.customerUsage, 120);
    const productTitle = sanitizeString(body.productTitle, 300);
    const productHandle = sanitizeString(body.productHandle, 120);
    const productId = sanitizeString(body.productId, 120);
    const shopDomain = sanitizeString(body.shopDomain, 255);
    const requestedProduct = sanitizeRequestedProduct(body.requestedProduct);
    const productsViewed = sanitizeProductsViewed(body.productsViewed);

    const organizerId = body.organizerId;
    const date = sanitizeString(body.date, 20);
    const time = sanitizeString(body.time, 10);

    if (!organizerId || !date || !time || !customerName || !customerEmail || !customerPhone) {
      return withCors(
        NextResponse.json({ error: 'Tous les champs obligatoires doivent être renseignés (nom, email, téléphone).' }, { status: 400 }),
        request
      );
    }

    const normalizedTime = time.slice(0, 5);
    const supabase = getSupabaseClient();

    const { data: organizer, error: organizerError } = await supabase
      .from('organizers')
      .select('*')
      .eq('slug', organizerId)
      .eq('active', true)
      .single();

    if (organizerError || !organizer) {
      if (organizerError?.code === 'PGRST116') {
        return withCors(NextResponse.json({ error: 'Organizer not found' }, { status: 404 }), request);
      }
      console.error('[public booking] organizer fetch error:', organizerError);
      return withCors(NextResponse.json({ error: 'Failed to fetch organizer' }, { status: 500 }), request);
    }

    const { data: existingBooking, error: checkError } = await supabase
      .from('bookings')
      .select('id')
      .eq('organizer_id', organizer.id)
      .eq('date', date)
      .eq('start_time', `${normalizedTime}:00`)
      .in('status', ['pending', 'confirmed'])
      .single();

    if (existingBooking) {
      return withCors(NextResponse.json({ error: 'Ce créneau n\'est plus disponible' }, { status: 409 }), request);
    }

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[public booking] check error:', checkError);
      return withCors(NextResponse.json({ error: 'Failed to check availability' }, { status: 500 }), request);
    }

    const endMinutes = timeToMinutes(normalizedTime) + (organizer.slot_duration_minutes || 60);
    const endTime = minutesToTime(endMinutes);

    const confirmationToken = randomUUID();
    const managementToken = randomUUID();
    const acceptUrl = `${siteConfig.appUrl}/api/public/booking-validate?token=${confirmationToken}&action=accept`;
    const declineUrl = `${siteConfig.appUrl}/api/public/booking-validate?token=${confirmationToken}&action=decline`;

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        organizer_id: organizer.id,
        date,
        start_time: `${normalizedTime}:00`,
        end_time: `${endTime}:00`,
        slot_duration_minutes: organizer.slot_duration_minutes || 60,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_notes: notes,
        product_title: productTitle,
        product_handle: productHandle,
        product_id: productId,
        shop_domain: shopDomain,
        requested_product: requestedProduct,
        products_viewed: productsViewed,
        customer_need: customerNeed,
        customer_usage: customerUsage,
        status: 'pending',
        confirmation_token: confirmationToken,
        management_token: managementToken,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('[public booking] insert error:', bookingError);
      return withCors(NextResponse.json({ error: 'Failed to create booking' }, { status: 500 }), request);
    }

    try {
      const emailData = {
        customerName,
        customerEmail,
        customerPhone,
        date,
        time: `${normalizedTime}:00`,
        endTime: `${endTime}:00`,
        organizerName: organizer.name,
        organizerEmail: getExpertEmail(organizer.email, organizer.notification_email),
        productTitle: productTitle || undefined,
        productHandle: productHandle || undefined,
        shopDomain: shopDomain || undefined,
        notes: notes || undefined,
        requestedProduct,
        productsViewed,
        customerNeed,
        customerUsage,
        confirmationUrl: acceptUrl,
        declineUrl,
        managementToken,
      };

      await Promise.all([
        sendConfirmationEmail(emailData),
        sendOrganizerNotification(emailData),
      ]);
    } catch (emailError) {
      console.error('[public booking] email error:', emailError);
    }

    return withCors(NextResponse.json(booking), request);
  } catch (error) {
    console.error('[public booking]', error);
    return withCors(NextResponse.json({ error: 'Failed to create booking' }, { status: 500 }), request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;
  return new NextResponse(null, { status: 204 });
}
