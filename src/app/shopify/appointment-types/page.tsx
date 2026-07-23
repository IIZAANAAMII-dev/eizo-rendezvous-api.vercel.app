'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Target, Clock, DollarSign, Plus, Edit, Trash2 } from 'lucide-react';
import gsap from 'gsap';

interface AppointmentType {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
}

export default function AppointmentTypesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newType, setNewType] = useState({ name: '', duration: 30, price: 0, description: '' });

  const cardsRef = useRef<HTMLDivElement[]>([]);

  const shop = searchParams.get('shop');

  useEffect(() => {
    // GSAP animation for cards
    gsap.fromTo(cardsRef.current, 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
    );
  }, [appointmentTypes]);

  const handleAddType = () => {
    if (!newType.name) return;
    
    setAppointmentTypes([...appointmentTypes, { ...newType, id: Date.now().toString() }]);
    setIsModalOpen(false);
    setNewType({ name: '', duration: 30, price: 0, description: '' });
  };

  const handleDeleteType = (id: string) => {
    setAppointmentTypes(appointmentTypes.filter(t => t.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto">
      <DashboardHeader
        title="Types de rendez-vous"
        description="Configurez les différents types de rendez-vous proposés"
        actionLabel="+ Ajouter un type"
        onAction={() => setIsModalOpen(true)}
      />

      {appointmentTypes.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Aucun type de rendez-vous"
          description="Créez des types de rendez-vous pour structurer vos offres."
          actionLabel="+ Ajouter un type"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appointmentTypes.map((type, index) => (
            <Card
              key={type.id}
              ref={(el) => { if (el) cardsRef.current[index] = el }}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{type.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-[#0066cc]">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-red-500"
                      onClick={() => handleDeleteType(type.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{type.duration} min</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    <span>{type.price > 0 ? `${type.price}€` : 'Gratuit'}</span>
                  </div>
                  {type.description && (
                    <p className="text-sm text-gray-600 mt-2">{type.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un type de rendez-vous</DialogTitle>
            <DialogDescription>Créez un nouveau type de rendez-vous</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
              <input
                type="text"
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                placeholder="Démonstration produit"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Durée (minutes)</label>
              <input
                type="number"
                value={newType.duration}
                onChange={(e) => setNewType({ ...newType, duration: parseInt(e.target.value) })}
                placeholder="30"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prix (€)</label>
              <input
                type="number"
                value={newType.price}
                onChange={(e) => setNewType({ ...newType, price: parseInt(e.target.value) })}
                placeholder="0"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={newType.description}
                onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                placeholder="Description du type de rendez-vous..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>
            <Button onClick={handleAddType} className="w-full bg-[#0066cc] hover:bg-[#0052a3] text-white font-medium">
              Ajouter
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
