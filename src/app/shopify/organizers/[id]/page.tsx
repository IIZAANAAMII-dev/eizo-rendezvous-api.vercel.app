'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function OrganizerDetails() {
  const router = useRouter();
  const params = useParams();
  const [organizer, setOrganizer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const shop = new URLSearchParams(window.location.search).get('shop');
    fetch(`/api/admin/organizers/${params.id}?shop=${shop}`)
      .then(res => res.json())
      .then(data => {
        setOrganizer(data);
        setLoading(false);
      });
  }, [params.id]);
  
  const handleUpdate = async () => {
    const shop = new URLSearchParams(window.location.search).get('shop');
    await fetch(`/api/admin/organizers/${params.id}?shop=${shop}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(organizer),
    });
    router.push('/shopify/organizers');
  };
  
  if (loading) return <div>Chargement...</div>;
  if (!organizer) return <div>Organisateur non trouvé</div>;
  
  return (
    <div>
      <h1>{organizer.name}</h1>
      <div className="card">
        <label>
          Nom
          <input
            type="text"
            value={organizer.name}
            onChange={(e) => setOrganizer({ ...organizer, name: e.target.value })}
          />
        </label>
        <label>
          Slug
          <input
            type="text"
            value={organizer.slug}
            onChange={(e) => setOrganizer({ ...organizer, slug: e.target.value })}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={organizer.active}
            onChange={(e) => setOrganizer({ ...organizer, active: e.target.checked })}
          />
          Actif
        </label>
        <button onClick={handleUpdate}>Sauvegarder</button>
        <button onClick={() => router.back()} style={{ marginLeft: '10px', background: '#6b7280' }}>
          Annuler
        </button>
      </div>
      <div className="card">
        <h2>Actions rapides</h2>
        <button onClick={() => router.push(`/shopify/organizers/${params.id}/availability`)}>
          Gérer la disponibilité
        </button>
        <button onClick={() => router.push(`/shopify/organizers/${params.id}/settings`)} style={{ marginLeft: '10px' }}>
          Paramètres de réservation
        </button>
      </div>
    </div>
  );
}
