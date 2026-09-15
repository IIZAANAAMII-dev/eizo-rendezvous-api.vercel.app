import type { Organizer } from '@/types/admin';

export interface Slot {
  time: string;
  start: string;
  end: string;
  available: boolean;
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function todayString(timezone?: string | null): string {
  try {
    if (timezone) {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    }
  } catch {
    // timezone invalide : fallback sur la date locale du serveur
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function timeNowString(timezone?: string | null): string {
  try {
    if (timezone) {
      const formatted = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date());
      return formatted.startsWith('24:') ? `00:${formatted.slice(3)}` : formatted;
    }
  } catch {
    // timezone invalide : fallback sur l'heure locale du serveur
  }
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function generateSlotsForDate(
  date: string,
  organizer: Organizer,
  bookedStartTimes: string[],
  unavailableDates?: string[]
): Slot[] {
  if (unavailableDates?.includes(date)) {
    return [];
  }

  const dateObj = new Date(`${date}T12:00:00`);
  const dayOfWeek = dateObj.getDay();
  const workingSlots = organizer.working_days?.[dayOfWeek] || [];

  if (workingSlots.length === 0) {
    return [];
  }

  const slots: Slot[] = [];

  for (const range of workingSlots) {
    const start = range.start;
    const end = range.end;
    slots.push({
      time: start,
      start,
      end,
      available: !bookedStartTimes.includes(start),
    });
  }

  return slots;
}

export function getWorkingRangesForDate(date: string, organizer: Organizer): string {
  const dateObj = new Date(`${date}T12:00:00`);
  const dayOfWeek = dateObj.getDay();
  const workingSlots = organizer.working_days?.[dayOfWeek] || [];

  if (workingSlots.length === 0) return 'Non disponible';

  return workingSlots
    .map(slot => `${slot.start} - ${slot.end}`)
    .join(', ');
}
