'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Users, ChevronRight, Calendar } from 'lucide-react';
import gsap from 'gsap';

interface Organizer {
  id: string;
  name: string;
  email: string;
  specialty?: string;
  active: boolean;
}

interface DayAvailability {
  day_of_week: number;
  is_available: boolean;
  availability_slots?: { start_time: string; end_time: string }[];
}

interface OrganizerWithAvailability extends Organizer {
  availability?: DayAvailability[];
}

export default function AvailabilityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  const shop = searchParams.get('shop');

  useEffect(() => {
    fetchOrganizersWithAvailability();
  }, [shop]);

  useEffect(() => {
    // GSAP animation for cards
    gsap.fromTo(cardsRef.current, 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
    );
  }, [organizers]);

  const fetchOrganizersWithAvailability = async () => {
    try {
      const organizersRes = await fetch(`/api/admin/organizers?shop=${shop}`);
      const organizersData = await organizersRes.json();

      // Fetch availability for each organizer
      const organizersWithAvailability = await Promise.all(
        organizersData.map(async (org: Organizer) => {
          try {
            const availabilityRes = await fetch(`/api/admin/availability/${org.id}?shop=${shop}`);
            const availabilityData = await availabilityRes.json();
            return { ...org, availability: availabilityData || [] };
          } catch {
            return { ...org, availability: [] };
          }
        })
      );

      setOrganizers(organizersWithAvailability);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch organizers:', error);
      setLoading(false);
    }
  };

  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const getAvailabilitySummary = (availability: DayAvailability[]) => {
    const availableDays = availability.filter(a => a.is_available);
    if (availableDays.length === 0) return 'Non configuré';
    
    const dayNames = availableDays.map(a => days[a.day_of_week]).join(', ');
    return `${availableDays.length} jour(s): ${dayNames}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <DashboardHeader
        title="Disponibilités"
        description="Vue d'ensemble des disponibilités de vos experts"
      />

      {organizers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Configurez vos experts d'abord"
          description="Ajoutez des experts pour gérer leurs disponibilités individuelles."
          actionLabel="+ Ajouter un expert"
          onAction={() => router.push(`/shopify/organizers?shop=${shop}`)}
        />
      ) : (
        <div className="space-y-4">
          {organizers.map((organizer, index) => (
            <Card
              key={organizer.id}
              ref={(el) => { if (el) cardsRef.current[index] = el }}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/shopify/organizers/${organizer.id}/availability?shop=${shop}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#0066cc]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{organizer.name}</h3>
                      <p className="text-sm text-gray-600">{organizer.specialty || 'Expert EIZO'}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {getAvailabilitySummary(organizer.availability || [])}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
