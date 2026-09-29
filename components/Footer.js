import Link from 'next/link';
import NewsletterForm from './NewsletterForm';

const POLICIES = [
  ['privacy', 'سياسة الخصوصية'],
  ['terms', 'الشروط والأحكام'],
  ['refund', 'سياسة الاسترجاع'],
  ['digital', 'سياسة المنتجات الرقمية'],
  ['payment', 'سياسة الدفع والتحميل'],
];

export default function Footer({ settings }) {
  const s = settings || {};
  const links = [
    s.whatsapp && ['https://wa.me/' + s.whatsapp.replace(/\D/g, ''), 'WhatsApp'],
    s.facebook && [s.facebook, 'Facebook'],
    s.instagram && [s.instagram, 'Instagram'],
    s.pinterest && [s.pinterest, 'Pinterest'],
    s.telegram && [s.telegram, 'Telegram'],
    s.x && [s.x, 'X'],
    s.linkedin && [s.linkedin, 'LinkedIn'],
  ].filter(Boolean);

  return (
    <footer className="bg-brand-ink text-white mt-10 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <b className="font-display text-lg">{s.store_name || 'CRAYON PLANET'}</b>
        <p className="opacity-80 my-2">منتجات رقمية تعليمية وإبداعية للأطفال والعائلة</p>
        <p className="opacity-90 text-sm mb-1">اشترك ليصلك كل جديد:</p>
        <NewsletterForm />
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
          {POLICIES.map(([slug, label]) => (
            <Link key={slug} href={`/policies/${slug}`} className="opacity-90">{label}</Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {links.map(([href, label]) => (
            <a key={label} href={href} target="_blank" rel="noopener" className="opacity-90">{label}</a>
          ))}
          {s.support_email && <a href={`mailto:${s.support_email}`} className="opacity-90">{s.support_email}</a>}
        </div>
        <p className="opacity-60 text-sm mt-4">© {s.store_name || 'CRAYON PLANET'} — الأسعار بالدينار الجزائري</p>
      </div>
    </footer>
  );
}
