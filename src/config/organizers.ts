export interface TimeSlot {
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface OrganizerConfig {
  id: string;
  name: string;
  email: string;
  slug: string;
  specialty: string;
  description?: string;
  avatarUrl?: string;
  timezone: string;
  locale: string;
  slotDurationMinutes: number;
  workingDays: Record<number, TimeSlot[]>; // 0 = Sunday, 1 = Monday, ...
  bufferMinutes: number;
  notificationEmail?: string;
  brandColor?: string;
}

// V1: Single organizer Fred
export const FRED_CONFIG: OrganizerConfig = {
  id: 'fred-eizo-001',
  name: 'Fred Martin',
  email: 'fred.martin@eizo.fr',
  slug: 'fred',
  specialty: 'Consultant Color & Calibration',
  description: 'Expert EIZO depuis 12 ans. Spécialisé en calibration de moniteurs ColorEdge et conseil personnalisé.',
  avatarUrl: '',
  timezone: 'Europe/Paris',
  locale: 'fr-FR',
  slotDurationMinutes: 30,
  bufferMinutes: 0,
  notificationEmail: 'fred.martin@eizo.fr',
  brandColor: '#0066CC',
  workingDays: {
    1: [ // Monday
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '17:00' },
    ],
    2: [ // Tuesday
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '17:00' },
    ],
    3: [ // Wednesday
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '17:00' },
    ],
    4: [ // Thursday
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '17:00' },
    ],
    5: [ // Friday
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '16:00' },
    ],
    6: [], // Saturday
    0: [], // Sunday
  },
};

// Registry ready for multi-organizer expansion
export const ORGANIZERS_CONFIG: Record<string, OrganizerConfig> = {
  [FRED_CONFIG.slug]: FRED_CONFIG,
};

export function getOrganizerConfig(slug: string = 'fred'): OrganizerConfig | null {
  return ORGANIZERS_CONFIG[slug] || null;
}

export function getDefaultOrganizerConfig(): OrganizerConfig {
  return FRED_CONFIG;
}

export function getAllOrganizers(): Pick<OrganizerConfig, 'id' | 'name' | 'slug' | 'specialty'>[] {
  return Object.values(ORGANIZERS_CONFIG).map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    specialty: org.specialty,
  }));
}
