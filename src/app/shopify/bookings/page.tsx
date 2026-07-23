'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Filter, Search, MoreVertical } from 'lucide-react';
import gsap from 'gsap';

interface Booking {
  id: string;
  client_name: string;
  client_email: string;
  organizer: { name: string; email: string };
  appointment_type: { name: string; duration: number; price: number };
  date: string;
  time: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

export default function BookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cardsRef = useRef<HTMLDivElement[]>([]);

  const shop = searchParams.get('shop');

  useEffect(() => {
    fetchBookings();
  }, [shop]);

  const fetchBookings = async () => {
    try {
      const response = await fetch(`/api/admin/bookings?shop=${shop}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      const data = await response.json();
      setBookings(data);
      setLoading(false);

      // GSAP animation for cards
      gsap.fromTo(cardsRef.current, 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
      );
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setError('Erreur lors du chargement des rendez-vous');
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success">Confirmé</Badge>;
      case 'pending':
        return <Badge variant="warning">En attente</Badge>;
      case 'cancelled':
        return <Badge variant="error">Annulé</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-600 text-lg">Chargement...</div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-red-600">{error}</div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <DashboardHeader
        title="Rendez-vous"
        description="Gérez tous vos rendez-vous"
      />

      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un rendez-vous..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
          />
        </div>
        <Button variant="outline" className="border-gray-200">
          <Filter className="w-4 h-4 mr-2" />
          Filtrer
        </Button>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Aucun rendez-vous"
          description="Les rendez-vous apparaîtront ici une fois que vos clients prendront rendez-vous."
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((booking, index) => (
            <Card
              key={booking.id}
              ref={(el) => { if (el) cardsRef.current[index] = el }}
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-[#0066cc]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{booking.client_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{booking.client_email}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(booking.date)} • {booking.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          <span>{booking.organizer?.name || 'Non assigné'}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {booking.appointment_type?.name || 'Type non défini'}
                        {booking.appointment_type?.duration && ` • ${booking.appointment_type.duration} min`}
                        {booking.appointment_type?.price && booking.appointment_type.price > 0 && ` • ${booking.appointment_type.price}€`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(booking.status)}
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
