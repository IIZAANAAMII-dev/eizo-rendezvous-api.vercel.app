import { Suspense } from 'react';
import ShopifyLayoutClient from './ShopifyLayoutClient';

export default function ShopifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8">Chargement...</div>}>
      <ShopifyLayoutClient>{children}</ShopifyLayoutClient>
    </Suspense>
  );
}
