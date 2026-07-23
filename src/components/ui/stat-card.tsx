'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  className?: string;
}

export function StatCard({ icon: Icon, title, value, change, changeType = 'neutral', className }: StatCardProps) {
  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <div className={cn('bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={cn('text-sm mt-2', changeColors[changeType])}>{change}</p>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
          <Icon className="w-6 h-6 text-[#0066cc]" />
        </div>
      </div>
    </div>
  );
}
