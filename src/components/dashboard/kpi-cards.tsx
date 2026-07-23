'use client';

import { StatCard } from '@/components/ui/stat-card';
import { Calendar, Users, Clock, TrendingUp } from 'lucide-react';

interface KPICardsProps {
  className?: string;
  stats?: {
    today: number;
    available: number;
    total: number;
    fillRate: number;
  };
}

export function KPICards({ className, stats }: KPICardsProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Calendar}
          title="Rendez-vous ce mois"
          value={stats?.total.toString() || '0'}
          change="vs mois dernier"
          changeType="neutral"
        />
        <StatCard
          icon={Users}
          title="Experts actifs"
          value={stats?.available.toString() || '0'}
          change="Disponibles"
          changeType="neutral"
        />
        <StatCard
          icon={Clock}
          title="Rendez-vous aujourd'hui"
          value={stats?.today.toString() || '0'}
          change="Aujourd'hui"
          changeType="neutral"
        />
        <StatCard
          icon={TrendingUp}
          title="Taux de remplissage"
          value={`${stats?.fillRate || 0}%`}
          change="Capacité utilisée"
          changeType="neutral"
        />
      </div>
    </div>
  );
}
