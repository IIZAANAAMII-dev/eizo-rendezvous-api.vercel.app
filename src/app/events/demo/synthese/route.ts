import { demoReport } from '@/lib/events-report-demo';

export function GET(request: Request) {
  return new Response(demoReport(request.url).html,{
    headers:{'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex, nofollow'},
  });
}
