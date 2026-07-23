'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import gsap from 'gsap';

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  const [isOpen, setIsOpen] = React.useState(open || false);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setIsOpen(open || false);
  }, [open]);

  React.useEffect(() => {
    if (isOpen && overlayRef.current && contentRef.current) {
      // Animation d'ouverture
      gsap.fromTo(overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
      gsap.fromTo(contentRef.current,
        { opacity: 0, scale: 0.95, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'back.out(1.7)' }
      );
    }
  }, [isOpen]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && overlayRef.current && contentRef.current) {
      // Animation de fermeture
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          setIsOpen(false);
          onOpenChange?.(false);
        }
      });
      gsap.to(contentRef.current, {
        opacity: 0,
        scale: 0.95,
        y: 20,
        duration: 0.2,
        ease: 'power2.in'
      });
    } else {
      setIsOpen(newOpen);
      onOpenChange?.(newOpen);
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            ref={overlayRef}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => handleOpenChange(false)}
          />
          <div ref={contentRef} className="relative z-50 w-full max-w-lg">
            {React.Children.map(children, child => {
              if (React.isValidElement(child)) {
                return React.cloneElement(child, { 
                  onClose: () => handleOpenChange(false) 
                } as any);
              }
              return child;
            })}
          </div>
        </div>
      )}
    </>
  );
};

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }
>(({ className, children, onClose, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative bg-white rounded-xl shadow-lg p-6 border border-gray-200',
      className
    )}
    {...props}
  >
    <button
      onClick={onClose}
      className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </button>
    {children}
  </div>
));
DialogContent.displayName = 'DialogContent';

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-4', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn('text-2xl font-semibold tracking-tight', className)} {...props} />
);
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-gray-600', className)} {...props} />
);
DialogDescription.displayName = 'DialogDescription';

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription };
