'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/ui/sidebar';

interface ShopifyLayoutClientProps {
  children: React.ReactNode;
}

export default function ShopifyLayoutClient({ children }: ShopifyLayoutClientProps) {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop') || '';

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (response.status === 401) {
        const redirectUrl = shop
          ? `/api/auth/session?shop=${encodeURIComponent(shop)}`
          : '/';
        window.location.href = redirectUrl;
        throw new Error('Session expired. Redirecting to login.');
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [shop]);

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar shop={shop} />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
