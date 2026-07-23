import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EIZO Rendez-vous API',
  description: 'API backend pour la prise de rendez-vous EIZO ColorEdge',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
