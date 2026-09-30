'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '../lib/cart';
import { supabaseBrowser } from '../lib/supabaseClient';
const NAV = [
  ['/', 'الرئيسية'],
  ['/shop', 'المتجر'],
  ['/shop', 'التصنيفات'],
  ['/about', 'من نحن'],
  ['/faq', 'الأسئلة الشائعة'],
  ['/contact', 'تواصل معنا'],
];

export default function Header({ settings }) {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabaseBrowser().auth.getUser();

      if (!user) return;

      const { data: admin } = await supabaseBrowser()
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      setIsAdmin(!!admin);
    })();
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white border-b-4 border-brand-yellow">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 font-display font-extrabold text-xl me-auto">
          <img src="/logo.webp" alt="CRAYON PLANET" className="w-11 h-11 rounded-full" />
          CRAYON PLANET
        </Link>
        <nav className="hidden md:flex gap-4 font-bold">
          {NAV.map(([href, label]) => (
            <Link
              key={label}
              href={href}
              className="py-2 border-b border-brand-line"
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}

          {isAdmin && (
            <Link
              href="/admin"
              className="py-2 border-b border-brand-line"
              onClick={() => setOpen(false)}
            >
              ⚙️ إدارة المتجر
            </Link>
          )}
        </nav>
        <Link href="/cart" className="relative w-11 h-11 grid place-items-center rounded-xl bg-brand-soft" aria-label="السلة">
          🛒
          {count > 0 && (
            <span className="absolute -top-1 -start-1 bg-brand-pink text-white text-xs rounded-full px-1.5">{count}</span>
          )}
        </Link>
        <button className="md:hidden w-11 h-11 rounded-xl bg-brand-soft" onClick={() => setOpen(!open)} aria-label="القائمة">☰</button>
      </div>
      {open && (
        <nav className="md:hidden px-4 pb-3 border-b-4 border-brand-pink font-bold flex flex-col">
          {NAV.map(([href, label]) => (
            <Link
              key={label}
              href={href}
              className="py-2 border-b border-brand-line"
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}

          {isAdmin && (
            <Link
              href="/admin"
              className="py-2 border-b border-brand-line"
              onClick={() => setOpen(false)}
            >
              ⚙️ إدارة المتجر
            </Link>
          )}
        </nav>
      )}
    </header>
  );
    }
        
