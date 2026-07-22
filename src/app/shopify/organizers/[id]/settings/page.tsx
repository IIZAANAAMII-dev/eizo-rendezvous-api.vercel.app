'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function BookingSettings() {
  const router = useRouter();
  const params = useParams();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const shop = new URLSearchParams(window.location.search).get('shop');
    fetch(`/api/admin/settings/${params.id}?shop=${shop}`)
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      });
  }, [params.id]);
  
  const handleSave = async () => {
    const shop = new URLSearchParams(window.location.search).get('shop');
    
    await fetch(`/api/admin/settings/${params.id}?shop=${shop}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    
    alert('Paramètres sauvegardés');
  };
  
  if (loading) return <div>Chargement...</div>;
  if (!settings) return <div>Paramètres non trouvés</div>;
  
  return (
    <div>
      <h1>Paramètres de réservation</h1>
      <div className="card">
        <label>
          Durée du rendez-vous (minutes)
          <input
            type="number"
            value={settings.duration_minutes}
            onChange={(e) => setSettings({ ...settings, duration_minutes: parseInt(e.target.value) })}
          />
        </label>
        <label>
          Max créneaux matin
          <input
            type="number"
            value={settings.max_morning_slots}
            onChange={(e) => setSettings({ ...settings, max_morning_slots: parseInt(e.target.value) })}
          />
        </label>
        <label>
          Max créneaux après-midi
          <input
            type="number"
            value={settings.max_afternoon_slots}
            onChange={(e) => setSettings({ ...settings, max_afternoon_slots: parseInt(e.target.value) })}
          />
        </label>
        <label>
          Début matin
          <input
            type="time"
            value={settings.morning_start}
            onChange={(e) => setSettings({ ...settings, morning_start: e.target.value })}
          />
        </label>
        <label>
          Fin matin
          <input
            type="time"
            value={settings.morning_end}
            onChange={(e) => setSettings({ ...settings, morning_end: e.target.value })}
          />
        </label>
        <label>
          Début après-midi
          <input
            type="time"
            value={settings.afternoon_start}
            onChange={(e) => setSettings({ ...settings, afternoon_start: e.target.value })}
          />
        </label>
        <label>
          Fin après-midi
          <input
            type="time"
            value={settings.afternoon_end}
            onChange={(e) => setSettings({ ...settings, afternoon_end: e.target.value })}
          />
        </label>
        <button onClick={handleSave}>Sauvegarder</button>
        <button onClick={() => router.back()} style={{ marginLeft: '10px', background: '#6b7280' }}>
          Retour
        </button>
      </div>
    </div>
  );
}
