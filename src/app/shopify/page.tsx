'use client';

import { useRouter } from 'next/navigation';

export default function ShopifyDashboard() {
  const router = useRouter();
  
  return (
    <div>
      <h1>EIZO Booking Dashboard</h1>
      <div className="card">
        <h2>Gestion des Organisateurs</h2>
        <p>Configurez vos experts et leurs disponibilités.</p>
        <button onClick={() => router.push('/shopify/organizers')}>
          Gérer les organisateurs
        </button>
      </div>
    </div>
  );
}
