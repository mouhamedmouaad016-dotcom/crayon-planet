import Link from 'next/link';
import { supabaseServer } from '../lib/supabaseServer';
import ProductCard from '../components/ProductCard';
import Empty from '../components/Empty';

export const revalidate = 0;

export default async function Home() {
  const supabase = supabaseServer();
  const [{ data: products }, { data: categories }, { data: featured }] = await Promise.all([
    supabase.from('products').select('*, categories(name)').eq('published', true).order('created_at', { ascending: false }).limit(8),
    supabase.from('categories').select('*').order('sort'),
    supabase.from('products').select('*, categories(name)').eq('published', true).eq('featured', true).limit(4),
  ]);const { data: { user } } = await supabase.auth.getUser();

let isAdmin = false;

if (user) {
  const { data: admin } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
isAdmin = !!admin;
}
  return (
    <div className="py-6">
      <section className="rounded-2xl overflow-hidden border-2 border-brand-line">
        <img src="/hero.jpg" alt="CRAYON PLANET منتجات رقمية للأطفال" className="w-full h-auto" />
      </section>
      <div className="flex gap-3 flex-wrap mt-4">
        <Link href="/shop" className="btn btn-yellow">تصفّح المتجر</Link>
        <Link href="/shop" className="btn btn-ghost">التصنيفات</Link>
    {isAdmin && (
  <Link href="/admin" className="btn btn-ghost">
    ⚙️ إدارة المتجر
  </Link>
)}  </div>

      <section className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-bold">
        <div className="bg-brand-soft rounded-2xl p-4">📥<br />تحميل سهل</div>
        <div className="bg-brand-soft rounded-2xl p-4">🖨️<br />طباعة بسهولة</div>
        <div className="bg-brand-soft rounded-2xl p-4">🛡️<br />محتوى آمن</div>
        <div className="bg-brand-soft rounded-2xl p-4">💡<br />محتوى هادف</div>
      </section>

      {featured?.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3">المنتجات المميزة</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {featured.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3">التصنيفات</h2>
        <div className="flex flex-wrap gap-2">
          {(categories || []).map((c) => (
            <Link key={c.id} href={`/shop?cat=${c.slug}`} className="chip">{c.name}</Link>
          ))}
        </div>
      </section>

      <section className="mt-10 mb-10">
        <h2 className="mb-3">أحدث المنتجات</h2>
        {products?.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        ) : (
          <Empty title="لا توجد منتجات بعد" sub="نجهّز منتجاتنا الآن. ستظهر هنا فور نشرها من لوحة الإدارة." />
        )}
      </section>
    </div>
  );
}
