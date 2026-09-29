import Link from 'next/link';

export function fmt(n) {
  return n ? Number(n).toLocaleString('ar-DZ') + ' د.ج' : 'مجاني';
}

export default function ProductCard({ p }) {
  return (
    <div className="card">
      <Link href={`/product/${p.slug}`} className="relative aspect-[4/3] bg-brand-soft grid place-items-center overflow-hidden">
        {p.featured && <span className="absolute top-2 start-2 bg-brand-yellow text-brand-ink text-xs font-bold rounded-full px-2 py-0.5">⭐ مميز</span>}
        {p.images?.[0] ? (
          <img src={p.images[0]} alt={p.name} loading="lazy" className="w-full h-full object-contain" />
        ) : (
          <span className="text-4xl">🎨</span>
        )}
      </Link>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <span className="text-sm text-gray-500">{p.categories?.name || ''}{p.age_range ? ' • ' + p.age_range : ''}</span>
        <h3 className="font-bold"><Link href={`/product/${p.slug}`}>{p.name}</Link></h3>
        <div className="font-extrabold text-brand-blue">
          {fmt(p.price)}
          {p.compare_at_price > p.price && (
            <s className="text-gray-400 font-normal text-sm ms-2">{fmt(p.compare_at_price)}</s>
          )}
        </div>
      </div>
    </div>
  );
}
