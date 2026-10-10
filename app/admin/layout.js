'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseBrowser } from '../../lib/supabaseClient';

const TABS = [
  ['/admin/products', 'المنتجات'],
  ['/admin/categories', 'التصنيفات'],
  ['/admin/orders', 'الطلبات'],
  ['/admin/customers', 'العملاء'], 
  ['/admin/inquiries', 'استفسارات العملاء'],
  ['/admin/reviews', 'التقييمات'],
  ['/admin/subscribers', 'المشتركون'],
  ['/admin/coupons', 'الكوبونات'],
  ['/admin/settings', 'الإعدادات'],
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const BARE = ['/admin/login', '/admin/forgot-password', '/admin/reset-password'];
  if (BARE.includes(pathname)) return children;

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push('/admin/login');
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-4">
        <h2>لوحة الإدارة</h2>
        <button className="btn btn-ghost" onClick={signOut}>تسجيل الخروج</button>
      </div>
      <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
        {TABS.map(([href, label]) => (
          <Link key={href} href={href} className={`btn whitespace-nowrap ${pathname.startsWith(href) ? 'btn-primary' : 'btn-ghost'}`}>{label}</Link>
        ))}
      </div>
      {children}
    </div>
  );
}
