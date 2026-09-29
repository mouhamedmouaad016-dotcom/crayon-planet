import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// عميل يعمل على الخادم فقط (Server Components / Route Handlers)، يقرأ
// جلسة تسجيل الدخول من الكوكيز. يُستخدم لعرض المنتجات المنشورة وفي
// صفحات الإدارة المحمية.
export function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try { cookieStore.set({ name, value, ...options }); } catch (_) {}
        },
        remove(name, options) {
          try { cookieStore.set({ name, value: '', ...options }); } catch (_) {}
        },
      },
    }
  );
}

// عميل بصلاحيات كاملة (service role) — لا يُستدعى إلا من داخل مسارات
// API على الخادم (مثل رفع الملفات الخاصة)، ولا يصل أبدًا إلى المتصفح.
import { createClient } from '@supabase/supabase-js';
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
