function normalizeAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.API_BASE_URL || 'https://eizo-rendezvous-api-vercel-app.vercel.app';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

export const siteConfig = {
  brand: {
    name: 'ColorEdge',
    fullName: 'EIZO ColorEdge',
    color: '#0066CC',
  },
  showroom: {
    name: 'Prophot Paris',
    address: {
      street: '103 Boulevard Beaumarchais',
      city: 'Paris',
      postalCode: '75003',
      country: 'FRANCE',
    },
    get fullAddress() {
      return `${this.name}\n${this.address.street}\n${this.address.postalCode} ${this.address.city.toUpperCase()}\n${this.address.country}`;
    },
    get lines() {
      return [
        this.name,
        this.address.street,
        `${this.address.postalCode} ${this.address.city.toUpperCase()}`,
        this.address.country,
      ];
    },
    get googleMapsUrl() {
      const query = encodeURIComponent(
        `${this.name}, ${this.address.street}, ${this.address.postalCode} ${this.address.city}, France`
      );
      return `https://www.google.com/maps/search/?api=1&query=${query}`;
    },
  },
  contact: {
    phone: process.env.CONTACT_PHONE || '+33 6 34 41 69 76',
    email: process.env.CONTACT_EMAIL || 'fred@eizo.fr',
  },
  appUrl: normalizeAppUrl(),
  emailFrom: process.env.EMAIL_FROM || process.env.SMTP_USER || 'rendez-vous@eizo.fr',
  environment: (process.env.EIZO_ENV || process.env.NODE_ENV || 'development'),
  testExpertEmail: process.env.EIZO_EXPERT_TEST_EMAIL || 'klegarrec@feeder.fr',
};

export function getExpertEmail(organizerEmail?: string | null, notificationEmail?: string | null): string {
  if (siteConfig.environment !== 'production') {
    return siteConfig.testExpertEmail;
  }
  return notificationEmail || organizerEmail || siteConfig.testExpertEmail;
}
