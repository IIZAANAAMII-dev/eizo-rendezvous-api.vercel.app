'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, ArrowRight, Search } from 'lucide-react';
import gsap from 'gsap';

interface Organizer {
  id: string;
  name: string;
  email: string;
  specialty: string;
  avatar_url?: string;
  active: boolean;
}

export default function BookingPage() {
  const router = useRouter();
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const cardsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      const response = await fetch('/api/public/organizers');
      const data = await response.json();
      setOrganizers(data.filter((o: Organizer) => o.active));
      setLoading(false);

      // GSAP animation
      gsap.fromTo(cardsRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
      );
    } catch (error) {
      console.error('Failed to fetch organizers:', error);
      setLoading(false);
    }
  };

  const filteredOrganizers = organizers.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-gray-600 text-lg">Chargement...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Réservez votre rendez-vous</h1>
          <p className="text-xl text-gray-600">Choisissez un expert EIZO pour votre projet</p>
        </div>

        <div className="mb-8 max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un expert..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0066cc] shadow-sm"
            />
          </div>
        </div>

        {filteredOrganizers.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Aucun expert trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrganizers.map((organizer, index) => (
              <Card
                key={organizer.id}
                ref={(el) => { if (el) cardsRef.current[index] = el }}
                className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-[#0066cc]"
                onClick={() => router.push(`/booking/${organizer.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar
                      src={organizer.avatar_url}
                      initials={getInitials(organizer.name)}
                      size="xl"
                      status="online"
                    />
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{organizer.name}</h3>
                      <p className="text-sm text-gray-600">{organizer.specialty || 'Expert EIZO'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <Clock className="w-4 h-4" />
                    <span>Disponible maintenant</span>
                  </div>
                  <Button className="w-full bg-[#0066cc] hover:bg-[#0052a3] text-white font-medium">
                    Voir le calendrier
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
