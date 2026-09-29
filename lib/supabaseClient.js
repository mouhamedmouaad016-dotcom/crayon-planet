'use client';
import { createBrowserClient } from '@supabase/ssr';

// عميل يعمل في المتصفح: يُستخدم في صفحات الإدارة والمتجر التي تحتاج
// جلسة تسجيل الدخول (مثل صفحات لوحة الإدارة).
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
