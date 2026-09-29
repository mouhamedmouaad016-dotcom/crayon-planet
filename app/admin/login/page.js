'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '../../../lib/supabaseClient';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLogin />
    </Suspense>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const denied = useSearchParams().get('denied');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const supabase = supabaseBrowser();
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (authErr) { setError('البريد أو كلمة المرور غير صحيحة.'); return; }
    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="py-10 max-w-sm mx-auto">
      <h2 className="mb-4 text-center">تسجيل دخول الإدارة</h2>
      {denied && <p className="text-red-600 text-sm mb-3 text-center">هذا الحساب غير مصرَّح له بدخول لوحة الإدارة.</p>}
      <form onSubmit={submit} className="border-2 border-brand-line rounded-2xl p-4">
        <label className="label">البريد الإلكتروني</label>
        <input className="field" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="label">كلمة المرور</label>
        <input className="field" type="password" dir="ltr" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        <button className="btn btn-yellow w-full mt-4" disabled={busy}>{busy ? 'جارٍ الدخول…' : 'دخول'}</button>
        <div className="text-center mt-3">
          <Link href="/admin/forgot-password" className="text-sm text-brand-blue font-bold">نسيت كلمة المرور؟</Link>
        </div>
      </form>
      <p className="text-sm text-gray-500 mt-3 text-center">
        الحساب يُنشأ من Supabase (راجع README)، وليس من هذه الصفحة.
      </p>
    </div>
  );
}
