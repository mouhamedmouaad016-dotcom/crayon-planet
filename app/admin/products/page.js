'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '../../../lib/supabaseClient';
import { fmt } from '../../../components/ProductCard';
import Empty from '../../../components/Empty';

export default function AdminProducts() {
  const [products, setProducts] = useState(null);

  async function load() {
    const { data } = await supabaseBrowser().from('products').select('*').order('created_at', { ascending: false });
    setProducts(data || []);
  }
  useEffect(() => { load(); }, []);

  async function togglePublish(p) {
    if (!p.published && !p.file_path) { alert('أرفق ملف المنتج قبل النشر.'); return; }
    await supabaseBrowser().from('products').update({ published: !p.published }).eq('id', p.id);
    load();
  }

  async function remove(p) {
    if (!confirm('حذف المنتج نهائيًا؟')) return;
    await supabaseBrowser().from('products').delete().eq('id', p.id);
    load();
  }

  return (
    <div>
      <Link href="/admin/products/new" className="btn btn-yellow mb-4">+ منتج جديد</Link>
      {products === null ? (
        <p className="text-gray-400">جارٍ التحميل…</p>
      ) : products.length ? (
        products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 py-2 border-b border-brand-line">
            <img src={p.images?.[0]} className="w-14 h-14 rounded-lg object-cover bg-brand-soft" alt="" />
            <div className="flex-1">
              <b>{p.name}</b>
              <div className="text-sm text-gray-500">{fmt(p.price)} • {p.published ? 'منشور' : 'مخفي'}</div>
            </div>
            <Link href={`/admin/products/${p.id}`} className="btn btn-ghost">تعديل</Link>
            <button className="btn btn-ghost" onClick={() => togglePublish(p)}>{p.published ? 'إخفاء' : 'نشر'}</button>
            <button className="btn btn-pink" onClick={() => remove(p)}>حذف</button>
          </div>
        ))
      ) : (
        <Empty title="لا توجد منتجات" sub="أضف أول منتج حقيقي لك." />
      )}
    </div>
  );
}
