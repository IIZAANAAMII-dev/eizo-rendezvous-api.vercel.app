'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { KPICards } from '@/components/dashboard/kpi-cards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Clock, Plus, ArrowRight } from 'lucide-react';
import gsap from 'gsap';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, available: 0, total: 0, fillRate: 0 });

  const shop = searchParams.get('shop');

  useEffect(() => {
    fetchDashboardData();
  }, [shop]);

  useEffect(() => {
    // GSAP animation for cards
    gsap.fromTo(cardsRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
    );
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [bookingsRes, organizersRes] = await Promise.all([
        fetch(`/api/admin/bookings?shop=${shop}`),
        fetch(`/api/admin/organizers?shop=${shop}`)
      ]);

      const bookings = await bookingsRes.json();
      const organizers = await organizersRes.json();

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const todayBookings = bookings.filter((b: any) => b.appointment_date === today).length;
      const activeOrganizers = organizers.filter((o: any) => o.active).length;
      const fillRate = bookings.length > 0 ? Math.round((bookings.length / (activeOrganizers * 20)) * 100) : 0;

      setStats({
        today: todayBookings,
        available: activeOrganizers,
        total: bookings.length,
        fillRate: Math.min(fillRate, 100)
      });

      // Get recent bookings (last 5)
      setRecentBookings(bookings.slice(0, 5).map((b: any) => ({
        id: b.id,
        client: b.customer_name,
        expert: b.organizer?.name || 'Non assigné',
        date: new Date(b.appointment_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        time: b.start_time,
        type: 'Rendez-vous'
      })));

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
    }
  };

  const quickActions = [
    { icon: Calendar, label: 'Nouveau rendez-vous', href: '/shopify/bookings/new' },
    { icon: Users, label: 'Ajouter un expert', href: '/shopify/organizers' },
    { icon: Clock, label: 'Configurer disponibilités', href: '/shopify/availability' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="max-w-7xl mx-auto">
      <DashboardHeader
        title="Tableau de bord"
        description="Vue d'ensemble de vos réservations et activités"
      />

      <KPICards className="mb-8" stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <Card ref={(el) => { if (el) cardsRef.current[0] = el }}>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => router.push(`${action.href}?shop=${shop}`)}
                      className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-[#0066cc] hover:bg-blue-50 transition-all duration-200 group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-[#0066cc] transition-colors">
                        <Icon className="w-5 h-5 text-[#0066cc] group-hover:text-white transition-colors" />
                      </div>
                      <span className="font-medium text-gray-900 group-hover:text-[#0066cc] transition-colors">
                        {action.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card ref={(el) => { if (el) cardsRef.current[1] = el }}>
          <CardHeader>
            <CardTitle>Statistiques rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Rendez-vous aujourd'hui</span>
                <span className="font-semibold text-gray-900">{stats.today}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Experts disponibles</span>
                <span className="font-semibold text-gray-900">{stats.available}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total rendez-vous</span>
                <span className="font-semibold text-gray-900">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Taux de remplissage</span>
                <span className="font-semibold text-gray-900">{stats.fillRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card ref={(el) => { if (el) cardsRef.current[2] = el }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rendez-vous récents</CardTitle>
            <Button variant="ghost" size="sm" className="text-[#0066cc]" onClick={() => router.push(`/shopify/bookings?shop=${shop}`)}>
              Voir tout
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun rendez-vous récent
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-[#0066cc] hover:bg-blue-50 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-[#0066cc]" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{booking.client}</p>
                      <p className="text-sm text-gray-600">{booking.expert} • {booking.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{booking.date}</p>
                    <p className="text-sm text-gray-600">{booking.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
