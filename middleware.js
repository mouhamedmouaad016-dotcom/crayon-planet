import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// يمنع أي زائر غير مسجّل دخوله من فتح أي صفحة تبدأ بـ /admin
// (ما عدا صفحة تسجيل الدخول نفسها).
export async function middleware(req) {
  const res = NextResponse.next();
  if (!req.nextUrl.pathname.startsWith('/admin')) return res;
  // صفحتا الدخول واستعادة كلمة المرور يجب أن تبقيا قابلتين للوصول بدون جلسة
  // إدارية مسبقة — صفحة إعادة التعيين تعتمد على رمز الاسترجاع القادم من
  // بريد Supabase نفسه (يُعالَج من جهة المتصفح)، وليس على تسجيل دخول سابق.
  if (req.nextUrl.pathname === '/admin/login' || req.nextUrl.pathname === '/admin/forgot-password' || req.nextUrl.pathname === '/admin/reset-password') {
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => res.cookies.set({ name, value, ...options }),
        remove: (name, options) => res.cookies.set({ name, value: '', ...options }),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  // تحقق إضافي: هل هذا المستخدم مسجَّل فعليًا في جدول admins؟
  const { data: adminRow } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!adminRow) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('denied', '1');
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
