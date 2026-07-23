'use client';

import { LayoutDashboard, Calendar, Users, Clock, Target, Settings, LucideIcon } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Tableau de bord', href: '/shopify/dashboard' },
  { icon: Calendar, label: 'Rendez-vous', href: '/shopify/bookings' },
  { icon: Users, label: 'Experts', href: '/shopify/organizers' },
  { icon: Clock, label: 'Disponibilités', href: '/shopify/availability' },
  { icon: Target, label: 'Types de rendez-vous', href: '/shopify/appointment-types' },
  { icon: Settings, label: 'Paramètres', href: '/shopify/settings' },
];

interface SidebarProps {
  shop?: string;
}

export function Sidebar({ shop }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">EIZO Rendez-vous</h1>
        <p className="text-sm text-gray-600 mt-1">Gestion de réservations</p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <button
              key={item.href}
              onClick={() => router.push(`${item.href}?shop=${shop}`)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-[#0066cc] text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
