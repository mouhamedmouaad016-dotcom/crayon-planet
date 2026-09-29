import { Suspense } from 'react';
import ShopInner from './ShopInner';

export const metadata = {
  title: 'المتجر | CRAYON PLANET',
  description: 'تصفّح منتجات CRAYON PLANET الرقمية التعليمية والإبداعية للأطفال.',
};

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="py-6 text-gray-400">جارٍ التحميل…</div>}>
      <ShopInner />
    </Suspense>
  );
}
