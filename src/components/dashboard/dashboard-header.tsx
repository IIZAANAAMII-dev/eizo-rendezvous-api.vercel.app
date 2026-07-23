'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import gsap from 'gsap';

interface DashboardHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function DashboardHeader({ title, description, actionLabel, onAction }: DashboardHeaderProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Animation d'apparition des éléments
    gsap.fromTo(titleRef.current,
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    );
    
    if (descriptionRef.current) {
      gsap.fromTo(descriptionRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.5, delay: 0.1, ease: 'power2.out' }
      );
    }
    
    if (buttonRef.current) {
      gsap.fromTo(buttonRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.3, delay: 0.2, ease: 'back.out(1.7)' }
      );
    }
  }, [title, description]);

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 ref={titleRef} className="text-4xl font-bold text-gray-900 tracking-tight">{title}</h1>
        {description && <p ref={descriptionRef} className="text-gray-600 mt-2 text-lg">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button
          ref={buttonRef}
          onClick={onAction}
          className="bg-[#0066cc] hover:bg-[#0052a3] text-white font-medium px-6"
        >
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
