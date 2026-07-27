import { OrganizerConfig } from '@/config/organizers';

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

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function generateSlotsForDate(
  date: string,
  organizer: OrganizerConfig,
  bookedStartTimes: string[]
): Slot[] {
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  const workingSlots = organizer.workingDays[dayOfWeek] || [];

  if (workingSlots.length === 0) {
    return [];
  }

  const slots: Slot[] = [];
  const duration = organizer.slotDurationMinutes;
  const buffer = organizer.bufferMinutes;
  const step = duration + buffer;

  for (const range of workingSlots) {
    const rangeStart = timeToMinutes(range.start);
    const rangeEnd = timeToMinutes(range.end);

    for (let current = rangeStart; current + duration <= rangeEnd; current += step) {
      const start = minutesToTime(current);
      const end = minutesToTime(current + duration);

      slots.push({
        time: start,
        start,
        end,
        available: !bookedStartTimes.includes(start),
      });
    }
  }

  return slots;
}

export function getWorkingRangesForDate(date: string, organizer: OrganizerConfig): string {
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  const workingSlots = organizer.workingDays[dayOfWeek] || [];

  if (workingSlots.length === 0) return 'Non disponible';

  return workingSlots
    .map(slot => `${slot.start} - ${slot.end}`)
    .join(', ');
}
