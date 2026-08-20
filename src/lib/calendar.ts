import { siteConfig } from './config';

export interface CalendarEvent {
  title: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm or HH:mm:ss
  endDate: string;   // YYYY-MM-DD
  endTime: string;   // HH:mm or HH:mm:ss
  location: string;
  description: string;
  uid?: string;
}

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function toIcsDateTime(date: string, time: string): string {
  const [hh, mm] = time.split(':').map(Number);
  const [y, m, d] = date.split('-').map(Number);
  const h = pad2(hh || 0);
  const min = pad2(mm || 0);
  return `${y}${pad2(m)}${pad2(d)}T${h}${min}00`;
}

function nowUtcIcs(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}Z`;
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const start = toIcsDateTime(event.startDate, event.startTime);
  const end = toIcsDateTime(event.endDate, event.endTime);
  const base = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description,
    location: event.location,
    ctz: 'Europe/Paris',
    sf: 'true',
    output: 'xml',
  });
  return `${base}?${params.toString()}`;
}

export function buildIcsCalendar(event: CalendarEvent): string {
  const start = toIcsDateTime(event.startDate, event.startTime);
  const end = toIcsDateTime(event.endDate, event.endTime);
  const uid = event.uid || `${Date.now()}-${Math.random().toString(36).slice(2)}@eizo-coloredge`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EIZO//ColorEdge//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Paris',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowUtcIcs()}`,
    `DTSTART;TZID=Europe/Paris:${start}`,
    `DTEND;TZID=Europe/Paris:${end}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `LOCATION:${escapeIcs(event.location)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function buildCustomerCalendarEvent(customerName: string, demo: string, notes = ''): CalendarEvent {
  return {
    title: `Démonstration EIZO ColorEdge — ${siteConfig.showroom.name}`,
    location: siteConfig.showroom.fullAddress,
    description: [
      `Démonstration : ${demo}`,
      notes,
      `Lieu : ${siteConfig.showroom.fullAddress}`,
      `Adresse : ${siteConfig.showroom.lines.join(', ')}`,
      siteConfig.showroom.googleMapsUrl,
    ].filter(Boolean).join('\n'),
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
  };
}

export function buildExpertCalendarEvent(customerName: string, customerPhone: string, customerEmail: string, demo: string, usage = '', message = ''): CalendarEvent {
  return {
    title: `Démonstration EIZO ColorEdge — ${customerName}`,
    location: siteConfig.showroom.fullAddress,
    description: [
      `Client : ${customerName}`,
      `Téléphone : ${customerPhone}`,
      `Email : ${customerEmail}`,
      `Démonstration : ${demo}`,
      usage && `Utilisation : ${usage}`,
      message && `Message : ${message}`,
      `Lieu : ${siteConfig.showroom.fullAddress}`,
    ].filter(Boolean).join('\n'),
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
  };
}
