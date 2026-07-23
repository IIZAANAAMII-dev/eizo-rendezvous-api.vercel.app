'use client';

import { useEffect, useRef } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Clock, Globe, Bell, Shield } from 'lucide-react';
import gsap from 'gsap';

export default function SettingsPage() {
  const cardsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    // GSAP animation for cards
    gsap.fromTo(cardsRef.current, 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
    );
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <DashboardHeader
        title="Paramètres"
        description="Configurez les paramètres globaux de votre application"
      />

      <div className="space-y-6">
        <Card ref={(el) => { if (el) cardsRef.current[0] = el }} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0066cc]" />
              Fuseau horaire par défaut
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fuseau horaire</label>
                <select className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]">
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                </select>
              </div>
              <Button className="bg-[#0066cc] hover:bg-[#0052a3] text-white">
                Sauvegarder
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card ref={(el) => { if (el) cardsRef.current[1] = el }} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#0066cc]" />
              Langue et région
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Langue</label>
                <select className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066cc]">
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
              <Button className="bg-[#0066cc] hover:bg-[#0052a3] text-white">
                Sauvegarder
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card ref={(el) => { if (el) cardsRef.current[2] = el }} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#0066cc]" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Notifications par email</p>
                  <p className="text-sm text-gray-600">Recevoir les notifications de rendez-vous par email</p>
                </div>
                <div className="w-12 h-6 bg-[#0066cc] rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Rappels de rendez-vous</p>
                  <p className="text-sm text-gray-600">Envoyer des rappels avant les rendez-vous</p>
                </div>
                <div className="w-12 h-6 bg-[#0066cc] rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
              <Button className="bg-[#0066cc] hover:bg-[#0052a3] text-white">
                Sauvegarder
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
