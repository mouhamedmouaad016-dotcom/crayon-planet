'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '../../lib/supabaseClient';
import { useCart } from '../../lib/cart';
import { fmt } from '../../components/ProductCard';
import Empty from '../../components/Empty';

export default function CartPage() {
  const { ids, remove } = useCart();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!ids.length) { setItems([]); return; }
    supabaseBrowser().from('products').select('*').in('id', ids).eq('published', true)
      .then(({ data }) => setItems(data || []));
  }, [ids]);

  const total = items.reduce((s, p) => s + Number(p.price), 0);

  return (
    <div className="py-6">
      <h2 className="mb-3">السلة</h2>
      {items.length ? (
        <div className="border-2 border-brand-line rounded-2xl p-3">
          {items.map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-2 border-b border-brand-line last:border-0">
              <img src={p.images?.[0]} className="w-14 h-14 rounded-lg object-cover bg-brand-soft" alt="" />
              <div className="flex-1"><b>{p.name}</b><div className="text-brand-blue font-bold">{fmt(p.price)}</div></div>
              <button className="btn btn-ghost" onClick={() => remove(p.id)}>حذف</button>
            </div>
          ))}
          <h3 className="my-3">الإجمالي: {fmt(total)}</h3>
          <Link href="/checkout" className="btn btn-yellow">متابعة إلى إتمام الطلب</Link>
        </div>
      ) : (
        <Empty title="السلة فارغة" sub="أضف منتجًا من المتجر للبدء." />
      )}
    </div>
  );
}
