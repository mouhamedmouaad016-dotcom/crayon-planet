import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseServer } from '../../../lib/supabaseServer';
import { fmt } from '../../../components/ProductCard';
import ProductCard from '../../../components/ProductCard';
import BuyButtons from './BuyButtons';
import { cleanText } from '../../../lib/text';
import ReviewForm from './ReviewForm';
import AdminProductActions from './AdminProductActions';

export const revalidate = 0;

// يُعرَّف المنتج بمعرّفه الفريد (id) بدل الرابط النصي العربي (slug)، لأن
// بعض أسماء المنتجات العربية تحتوي تشكيلًا (مثل الشدّة "ّ") قد يتعرّض لتعارض
// في تطبيع الترميز (Unicode normalization) بين وقت إنشاء الرابط ووقت
// مطابقته في قاعدة البيانات، فيفشل البحث ويظهر 404 رغم أن الرابط يبدو سليمًا.
async function getProduct(id) {
  const supabase = supabaseServer();
  const { data: p } = await supabase
    .from('products')
    .select('*, categories(name, id, slug)')
    .eq('id', id)
    .eq('published', true)
    .maybeSingle();
  return p;
}

// تحقّق حقيقي من جهة الخادم — يُستعلم مباشرة من جدول admins في Supabase،
// وليس مجرد إخفاء بصري. النتيجة تقرر هل تُرسَل أزرار الإدارة إلى المتصفح
// أصلًا أم لا؛ الزائر العادي لا يستقبل هذا الجزء من HTML إطلاقًا.
async function checkIsAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: admin } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  return !!admin;
}

export async function generateMetadata({ params }) {
  const p = await getProduct(params.id);
  if (!p) return { title: 'منتج غير موجود | CRAYON PLANET' };
  const desc = cleanText(p.description).replace(/\s+/g, ' ').slice(0, 155);
  return {
    title: `${p.name} | CRAYON PLANET`,
    description: desc,
    alternates: { canonical: `/product/${p.id}` },
    openGraph: {
      title: p.name,
      description: desc,
      images: p.images?.[0] ? [{ url: p.images[0] }] : undefined,
      type: 'website',
    },
  };
}

export default async function ProductPage({ params }) {
  const supabase = supabaseServer();
  const isAdmin = await checkIsAdmin(supabase);

  // المدير يستطيع فتح صفحة منتج مخفي (لإعادة نشره من هنا)؛ الزائر العادي
  // يحصل على 404 لأي منتج غير منشور، كما كان الحال دائمًا.
  let p;
  if (isAdmin) {
    const { data } = await supabase.from('products').select('*, categories(name, id, slug)').eq('id', params.id).maybeSingle();
    p = data;
  } else {
    p = await getProduct(params.id);
  }
  if (!p) return notFound();

  const [{ data: reviews }, { data: related }] = await Promise.all([
    supabase.from('reviews').select('*').eq('product_id', p.id).eq('approved', true).order('created_at', { ascending: false }),
    p.category_id
      ? supabase.from('products').select('*, categories(name)').eq('category_id', p.category_id).eq('published', true).neq('id', p.id).limit(4)
      : Promise.resolve({ data: [] }),
  ]);

  const avg = reviews?.length ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : null;

  return (
    <div className="py-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="aspect-[4/3] bg-brand-soft rounded-2xl overflow-hidden grid place-items-center">
            {p.images?.[0] ? (
              <img src={p.images[0]} alt={p.name} className="w-full h-full object-contain" />
            ) : <span className="text-5xl">🎨</span>}
          </div>
          {p.images?.length > 1 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {p.images.map((src, i) => (
                <img key={i} src={src} className="w-14 h-14 object-cover rounded-lg border-2 border-brand-line" alt="" />
              ))}
            </div>
          )}
        </div>
        <div>
          <h1>{p.name}</h1>
          {avg && <div className="text-sm text-gray-500 mt-1">⭐ {avg} ({reviews.length} تقييم)</div>}
          {isAdmin && !p.published && (
            <span className="inline-block mt-1 text-xs font-bold bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5">مخفي عن الزوار حاليًا</span>
          )}
          <div className="text-2xl font-extrabold text-brand-blue my-2">
            {fmt(p.price)}
            {p.compare_at_price > p.price && <s className="text-gray-400 text-base font-normal ms-2">{fmt(p.compare_at_price)}</s>}
          </div>
          <p className="whitespace-pre-line my-3">{cleanText(p.description)}</p>
          <table className="w-full text-sm mb-4">
            <tbody>
              <tr className="border-b border-brand-line">
                <td className="py-2 text-gray-500">التصنيف</td>
                <td>
                  {p.categories?.slug ? (
                    <Link href={`/shop?cat=${p.categories.slug}`} className="text-brand-blue font-bold underline">
                      {p.categories.name}
                    </Link>
                  ) : (p.categories?.name || '-')}
                </td>
              </tr>
              <tr className="border-b border-brand-line"><td className="py-2 text-gray-500">العمر</td><td>{p.age_range || '-'}</td></tr>
              <tr className="border-b border-brand-line"><td className="py-2 text-gray-500">عدد الصفحات</td><td>{p.pages || '-'}</td></tr>
              <tr><td className="py-2 text-gray-500">نوع الملف</td><td>{p.file_type || '-'}</td></tr>
            </tbody>
          </table>
          <BuyButtons product={p} />
          <div className="bg-brand-soft rounded-xl p-3 text-sm mt-3">
            🔒 منتج رقمي: يُسلَّم عبر رابط تحميل يصل إلى بريدك الإلكتروني تلقائيًا بعد تأكيد الدفع مباشرة.
          </div>
          {isAdmin && <AdminProductActions product={p} />}
        </div>
      </div>

      <section className="mt-10 max-w-xl">
        <h2 className="mb-3">التقييمات</h2>
        {reviews?.length ? (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="border-2 border-brand-line rounded-xl p-3">
                <b>{r.name}</b> <span>{'⭐'.repeat(r.rating || 0)}</span>
                <p className="mt-1">{r.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">لا توجد تقييمات بعد. كن أول من يقيّم هذا المنتج.</p>
        )}
        <ReviewForm productId={p.id} />
      </section>

      {related?.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3">منتجات مقترحة</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {related.map((rp) => <ProductCard key={rp.id} p={rp} />)}
          </div>
        </section>
      )}
    </div>
  );
    }
