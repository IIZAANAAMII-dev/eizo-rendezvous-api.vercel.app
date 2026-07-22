'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OrganizersList() {
  const router = useRouter();
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const shop = new URLSearchParams(window.location.search).get('shop');
    if (!shop) {
      setError('Missing shop parameter');
      setLoading(false);
      return;
    }
    
    fetch(`/api/admin/organizers?shop=${shop}`)
      .then(res => res.json())
      .then(data => {
        setOrganizers(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch organizers');
        setLoading(false);
      });
  }, []);
  
  const handleCreate = () => {
    const name = prompt('Nom de l\'organisateur:');
    if (!name) return;
    
    const slug = prompt('Slug (ex: fred):');
    if (!slug) return;
    
    const shop = new URLSearchParams(window.location.search).get('shop');
    
    fetch(`/api/admin/organizers?shop=${shop}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, active: true }),
    })
      .then(res => res.json())
      .then(data => {
        setOrganizers([...organizers, data]);
      })
      .catch(err => {
        alert('Failed to create organizer');
      });
  };
  
  const handleDelete = (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet organisateur ?')) return;
    
    const shop = new URLSearchParams(window.location.search).get('shop');
    
    fetch(`/api/admin/organizers/${id}?shop=${shop}`, {
      method: 'DELETE',
    })
      .then(res => res.json())
      .then(() => {
        setOrganizers(organizers.filter(o => o.id !== id));
      })
      .catch(err => {
        alert('Failed to delete organizer');
      });
  };
  
  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;
  
  return (
    <div>
      <h1>Organisateurs</h1>
      <button onClick={handleCreate}>Créer un organisateur</button>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Slug</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {organizers.map(org => (
              <tr key={org.id}>
                <td>{org.name}</td>
                <td>{org.slug}</td>
                <td>{org.active ? 'Actif' : 'Inactif'}</td>
                <td>
                  <button onClick={() => router.push(`/shopify/organizers/${org.id}`)}>
                    Modifier
                  </button>
                  <button onClick={() => handleDelete(org.id)} style={{ marginLeft: '10px', background: '#d72c0d' }}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
