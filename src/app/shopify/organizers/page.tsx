'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { EmptyState } from '@/components/ui/empty-state';
import { OrganizerCard } from '@/components/organizer/organizer-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import gsap from 'gsap';

export default function OrganizersList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrganizer, setNewOrganizer] = useState({ name: '', email: '', specialty: '', description: '', timezone: 'Europe/Paris' });

  const cardsRef = useRef<HTMLDivElement[]>([]);

  const shop = searchParams.get('shop');

  useEffect(() => {
    if (!shop) {
      setLoading(false);
      return;
    }

    fetch(`/api/admin/organizers?shop=${shop}`)
      .then(res => res.json())
      .then(data => {
        setOrganizers(data);
        setLoading(false);
        
        // GSAP animation for cards
        gsap.fromTo(cardsRef.current, 
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
        );
      })
      .catch(err => {
        console.error('Failed to fetch organizers:', err);
        setLoading(false);
      });
  }, [shop]);

  const handleAddOrganizer = async () => {
    if (!newOrganizer.name || !newOrganizer.email) {
      alert('Veuillez remplir le nom et l\'email');
      return;
    }

    const slug = newOrganizer.name.toLowerCase().replace(/\s+/g, '-');

    try {
      const response = await fetch(`/api/admin/organizers?shop=${shop}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newOrganizer, slug, active: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create organizer');
      }

      // Append the created organizer directly instead of refetching the
      // whole list, saving a redundant round-trip on every creation.
      const created = await response.json();
      setOrganizers((prev) => [...prev, created]);
      setIsModalOpen(false);
      setNewOrganizer({ name: '', email: '', specialty: '', description: '', timezone: 'Europe/Paris' });
    } catch (error) {
      console.error('Failed to create organizer:', error);
      alert('Erreur lors de la création de l\'expert');
    }
  };

  const handleDeleteOrganizer = async (id: string) => {
    if (!confirm('Supprimer cet expert ?')) return;

    await fetch(`/api/admin/organizers/${id}?shop=${shop}`, {
      method: 'DELETE',
    });

    setOrganizers(organizers.filter(o => o.id !== id));
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-600 text-lg">Chargement...</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <DashboardHeader
        title="Experts"
        description="Gérez vos experts EIZO et leurs disponibilités"
      />

      {organizers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Ajoutez votre premier expert EIZO"
          description="Configurez les experts qui pourront accompagner vos clients dans leurs projets."
          actionLabel="+ Ajouter un expert"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <>
          <div className="mb-6">
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#0066cc] hover:bg-[#0052a3] text-white font-medium"
            >
              + Ajouter un expert
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizers.map((organizer, index) => (
              <div
                key={organizer.id}
                ref={(el) => { if (el) cardsRef.current[index] = el }}
              >
                <OrganizerCard
                  id={organizer.id}
                  name={organizer.name}
                  email={organizer.email}
                  specialty={organizer.specialty}
                  avatar_url={organizer.avatar_url}
                  active={organizer.active}
                  onView={() => router.push(`/shopify/organizers/${organizer.id}?shop=${shop}`)}
                  onEdit={() => router.push(`/shopify/organizers/${organizer.id}/edit?shop=${shop}`)}
                  onAvailability={() => router.push(`/shopify/organizers/${organizer.id}/availability?shop=${shop}`)}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un expert</DialogTitle>
            <DialogDescription>Configurez un nouvel expert EIZO</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
              <input
                type="text"
                value={newOrganizer.name}
                onChange={(e) => setNewOrganizer({ ...newOrganizer, name: e.target.value })}
                placeholder="Jean Dupont"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={newOrganizer.email}
                onChange={(e) => setNewOrganizer({ ...newOrganizer, email: e.target.value })}
                placeholder="jean.dupont@eizo.fr"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Spécialité</label>
              <input
                type="text"
                value={newOrganizer.specialty}
                onChange={(e) => setNewOrganizer({ ...newOrganizer, specialty: e.target.value })}
                placeholder="Expert technique"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={newOrganizer.description}
                onChange={(e) => setNewOrganizer({ ...newOrganizer, description: e.target.value })}
                placeholder="Description de l'expert..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fuseau horaire</label>
              <select
                value={newOrganizer.timezone}
                onChange={(e) => setNewOrganizer({ ...newOrganizer, timezone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              >
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </div>
            <Button onClick={handleAddOrganizer} className="w-full bg-[#0066cc] hover:bg-[#0052a3] text-white font-medium">
              Ajouter
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
