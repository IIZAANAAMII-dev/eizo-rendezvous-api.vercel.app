'use client';

import { useState } from 'react';
import { Calendar, Clock, MoreVertical, Copy, Check } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface OrganizerCardProps {
  id: string;
  name: string;
  email: string;
  specialty?: string;
  avatar_url?: string;
  active: boolean;
  bookingCount?: number;
  nextAvailability?: string;
  onView?: () => void;
  onEdit?: () => void;
  onAvailability?: () => void;
  className?: string;
}

export function OrganizerCard({
  id,
  name,
  email,
  specialty,
  avatar_url,
  active,
  bookingCount = 0,
  nextAvailability,
  onView,
  onEdit,
  onAvailability,
  className,
}: OrganizerCardProps) {
  const [copied, setCopied] = useState(false);

  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleCopyLink = () => {
    const bookingUrl = `${window.location.origin}/booking/${id}`;
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className={cn('hover:shadow-lg transition-all duration-300 cursor-pointer', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <Avatar
              src={avatar_url}
              initials={initials}
              size="lg"
              status={active ? 'online' : 'offline'}
            />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
              <p className="text-sm text-gray-600">{specialty || 'Expert EIZO'}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{bookingCount} rendez-vous</span>
          </div>
          {nextAvailability && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Prochaine: {nextAvailability}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Badge variant={active ? 'success' : 'error'}>
            {active ? 'Actif' : 'Inactif'}
          </Badge>
          <div className="flex gap-2">
            <Button
              onClick={handleCopyLink}
              variant="outline"
              size="sm"
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
              title="Copier le lien du calendrier"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            {onAvailability && (
              <Button
                onClick={onAvailability}
                variant="outline"
                size="sm"
                className="text-[#0066cc] border-[#0066cc] hover:bg-blue-50"
              >
                Disponibilités
              </Button>
            )}
            {onView && (
              <Button
                onClick={onView}
                size="sm"
                className="bg-[#0066cc] hover:bg-[#0052a3] text-white"
              >
                Voir
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
