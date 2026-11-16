export function GET(request: Request) {
  return Response.redirect(new URL('/events', request.url), 307);
}
