'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function AvailabilitySettings() {
  const router = useRouter();
  const params = useParams();
  const [availability, setAvailability] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const shop = new URLSearchParams(window.location.search).get('shop');
    fetch(`/api/admin/availability/${params.id}?shop=${shop}`)
      .then(res => res.json())
      .then(data => {
        setAvailability(data);
        setLoading(false);
      });
  }, [params.id]);
  
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  
  const handleToggle = (dayIndex: number) => {
    const updated = [...availability];
    const existingIndex = updated.findIndex(a => a.day_of_week === dayIndex);
    if (existingIndex >= 0) {
      updated[existingIndex] = { ...updated[existingIndex], is_available: !updated[existingIndex].is_available };
    } else {
      updated.push({ day_of_week: dayIndex, is_available: true });
    }
    setAvailability(updated);
  };
  
  const handleSave = async () => {
    const shop = new URLSearchParams(window.location.search).get('shop');
    
    for (const day of availability) {
      await fetch(`/api/admin/availability/${params.id}?shop=${shop}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(day),
      });
    }
    
    alert('Disponibilité sauvegardée');
  };
  
  if (loading) return <div>Chargement...</div>;
  
  return (
    <div>
      <h1>Disponibilité</h1>
      <div className="card">
        <h2>Jours ouverts</h2>
        {days.map((day, index) => {
          const dayData = availability.find(a => a.day_of_week === index) || { is_available: false };
          return (
            <div key={index} style={{ marginBottom: '10px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={dayData.is_available}
                  onChange={() => handleToggle(index)}
                />
                {day}
              </label>
            </div>
          );
        })}
        <button onClick={handleSave}>Sauvegarder</button>
        <button onClick={() => router.back()} style={{ marginLeft: '10px', background: '#6b7280' }}>
          Retour
        </button>
      </div>
    </div>
  );
}
