import { NextRequest, NextResponse } from 'next/server';

// Toggle CORS mode:
// - true  => Access-Control-Allow-Origin: *
// - false => whitelist below (recommended for production)
const ALLOW_ALL = false;

const ALLOWED_ORIGINS = [
  'https://eizo-rendezvous-test.myshopify.com',
  'https://eizo-rendez-vous-test.myshopify.com',
  'https://eizo.fr',
];

export function getAllowedOrigin(origin: string | null): string | null {
  if (ALLOW_ALL) return '*';
  if (!origin) return null;
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

export function corsHeaders(request: NextRequest): Record<string, string> {
  const allowedOrigin = getAllowedOrigin(request.headers.get('origin'));
  if (!allowedOrigin) return {};

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };
}

// Respond to preflight OPTIONS requests
export function handleCors(request: NextRequest): NextResponse | null {
  if (request.method !== 'OPTIONS') return null;
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

// Attach CORS headers to any existing NextResponse
export function withCors(response: NextResponse, request: NextRequest): NextResponse {
  const headers = corsHeaders(request);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
