'use client';
import { useRouter } from 'next/navigation';
import { useCart } from '../../../lib/cart';

export default function BuyButtons({ product }) {
  const { add } = useCart();
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2">
      <button className="btn btn-yellow" onClick={() => { add(product.id); router.push('/checkout'); }}>اشترِ الآن</button>
      <button className="btn btn-ghost" onClick={() => add(product.id)}>أضف إلى السلة</button>
    </div>
  );
}
