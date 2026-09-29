'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '../../lib/supabaseClient';
import ProductCard from '../../components/ProductCard';
import Empty from '../../components/Empty';

const AGES = ['2–4', '4–6', '6–8', '8–12', 'كل الأعمار'];

export default function ShopInner() {
  const params = useSearchParams();
  const [all, setAll] = useState(null);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(params.get('cat') || '');
  const [age, setAge] = useState('');
  const [sort, setSort] = useState('');

  useEffect(() => {
    const supabase = supabaseBrowser();
    (async () => {
      const [{ data: products }, { data: categories }] = await Promise.all([
        supabase.from('products').select('*, categories(name, slug)').eq('published', true),
        supabase.from('categories').select('*').order('sort'),
      ]);
      setAll(products || []);
      setCats(categories || []);
    })();
  }, []);

  let list = all || [];
  if (cat) list = list.filter((p) => p.categories?.slug === cat);
  if (age) list = list.filter((p) => p.age_range === age);
  if (q) list = list.filter((p) => (p.name + p.description).includes(q));
  if (sort === 'a') list = [...list].sort((a, b) => a.price - b.price);
  if (sort === 'd') list = [...list].sort((a, b) => b.price - a.price);

  return (
    <div className="py-6">
      <h2 className="mb-3">المتجر</h2>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <input className="field col-span-2" type="search" placeholder="ابحث عن منتج" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">كل التصنيفات</option>
          {cats.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select className="field" value={age} onChange={(e) => setAge(e.target.value)}>
          <option value="">كل الأعمار</option>
          {AGES.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select className="field col-span-2" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="">الأحدث</option>
          <option value="a">السعر: الأقل</option>
          <option value="d">السعر: الأعلى</option>
        </select>
      </div>

      {all === null ? (
        <p className="text-gray-400">جارٍ التحميل…</p>
      ) : list.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-10">
          {list.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      ) : (
        <Empty title="لا توجد منتجات بعد" sub="نجهّز منتجاتنا الآن. ستظهر هنا فور نشرها." />
      )}
    </div>
  );
}
