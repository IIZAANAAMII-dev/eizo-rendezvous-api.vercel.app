'use client';

import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/ui/sidebar';

export default function ShopifyLayout({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop');

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar shop={shop || ''} />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
