'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function ShopifyDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const shop = searchParams.get('shop');
    if (shop) {
      router.replace(`/shopify/bookings?shop=${shop}`);
    }
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-600 text-lg">Chargement...</div>
    </div>
  );
}
