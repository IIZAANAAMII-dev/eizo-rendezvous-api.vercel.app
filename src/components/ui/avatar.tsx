'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  initials?: string;
  status?: 'online' | 'offline' | 'away';
}

export function Avatar({ src, alt, size = 'md', className, initials, status }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
  };

  return (
    <div className="relative inline-block">
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-medium text-white bg-[#0066cc]',
          sizeClasses[size],
          className
        )}
      >
        {src ? (
          <img src={src} alt={alt} className="w-full h-full rounded-full object-cover" />
        ) : (
          <span>{initials || '?'}</span>
        )}
      </div>
      {status && (
        <div
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}
