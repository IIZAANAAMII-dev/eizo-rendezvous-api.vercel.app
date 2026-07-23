'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Target, Calendar, Settings, Edit, ChevronRight } from 'lucide-react';
import gsap from 'gsap';

export default function OrganizerDetails() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [organizer, setOrganizer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const cardsRef = useRef<HTMLDivElement[]>([]);

  const shop = searchParams.get('shop');

  useEffect(() => {
    fetch(`/api/admin/organizers/${params.id}?shop=${shop}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setOrganizer(data);
        setLoading(false);
        
        // GSAP animation for cards
        gsap.fromTo(cardsRef.current, 
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
        );
      })
      .catch(err => {
        console.error('Failed to fetch organizer:', err);
        setLoading(false);
      });
  }, [params.id, shop]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-600 text-lg">Chargement...</div>
    </div>
  );

  if (!organizer) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-red-600">Expert non trouvé</div>
    </div>
  );

  const initials = organizer.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <Avatar
              src={organizer.avatar_url}
              initials={initials}
              size="xl"
              status={organizer.active ? 'online' : 'offline'}
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{organizer.name}</h1>
              <p className="text-gray-600 mt-1">{organizer.specialty || 'Expert EIZO'}</p>
              <div className="flex items-center gap-3 mt-3">
                <Badge variant={organizer.active ? 'success' : 'error'}>
                  {organizer.active ? 'Actif' : 'Inactif'}
                </Badge>
                <span className="text-sm text-gray-500">{organizer.email}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(`/shopify/organizers/${params.id}/availability?shop=${shop}`)}
              variant="outline"
              className="border-[#0066cc] text-[#0066cc] hover:bg-blue-50"
            >
              <Clock className="w-4 h-4 mr-2" />
              Disponibilités
            </Button>
            <Button
              onClick={() => router.push(`/shopify/organizers/${params.id}/edit?shop=${shop}`)}
              className="bg-[#0066cc] hover:bg-[#0052a3] text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </Button>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disponibilités */}
        <Card ref={(el) => { if (el) cardsRef.current[0] = el }} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#0066cc]" />
                Disponibilités
              </CardTitle>
              <Button
                onClick={() => router.push(`/shopify/organizers/${params.id}/availability?shop=${shop}`)}
                variant="ghost"
                size="sm"
                className="text-[#0066cc]"
              >
                Configurer
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Lundi</span>
                <span className="text-sm text-gray-600">09:00 - 17:00</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Mardi</span>
                <span className="text-sm text-gray-600">09:00 - 17:00</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Mercredi</span>
                <span className="text-sm text-gray-600">09:00 - 17:00</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Jeudi</span>
                <span className="text-sm text-gray-600">09:00 - 17:00</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Vendredi</span>
                <span className="text-sm text-gray-600">09:00 - 17:00</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Types de rendez-vous */}
        <Card ref={(el) => { if (el) cardsRef.current[1] = el }} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#0066cc]" />
                Types de rendez-vous
              </CardTitle>
              <Button
                onClick={() => router.push(`/shopify/organizers/${params.id}/appointment-types?shop=${shop}`)}
                variant="ghost"
                size="sm"
                className="text-[#0066cc]"
              >
                Gérer
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 border border-gray-200 rounded-xl hover:border-[#0066cc] transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Démonstration produit</p>
                    <p className="text-sm text-gray-600 mt-1">30 min • Gratuit</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div className="p-4 border border-gray-200 rounded-xl hover:border-[#0066cc] transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Conseil technique</p>
                    <p className="text-sm text-gray-600 mt-1">60 min • 150€</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div className="p-4 border border-gray-200 rounded-xl hover:border-[#0066cc] transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Formation</p>
                    <p className="text-sm text-gray-600 mt-1">90 min • 250€</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rendez-vous à venir */}
        <Card ref={(el) => { if (el) cardsRef.current[2] = el }} className="lg:col-span-2 hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#0066cc]" />
                Rendez-vous à venir
              </CardTitle>
              <Button
                onClick={() => router.push(`/shopify/bookings?shop=${shop}&organizer=${params.id}`)}
                variant="ghost"
                size="sm"
                className="text-[#0066cc]"
              >
                Voir tout
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-[#0066cc] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[#0066cc]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">25 Juil • 14:00</p>
                    <p className="text-sm text-gray-600">Démonstration produit • Martin Dupont</p>
                  </div>
                </div>
                <Badge variant="success">Confirmé</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-[#0066cc] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[#0066cc]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">26 Juil • 10:00</p>
                    <p className="text-sm text-gray-600">Conseil technique • Sophie Martin</p>
                  </div>
                </div>
                <Badge variant="success">Confirmé</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-[#0066cc] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[#0066cc]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">27 Juil • 15:30</p>
                    <p className="text-sm text-gray-600">Formation • Pierre Bernard</p>
                  </div>
                </div>
                <Badge variant="warning">En attente</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
