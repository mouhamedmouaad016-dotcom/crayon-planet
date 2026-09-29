'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '../../../lib/supabaseClient';

// يجب أن يكون رابط الموقع المنشور الحقيقي، وليس localhost. يُضبط في
// Vercel → Environment Variables → NEXT_PUBLIC_SITE_URL.
const SITE_URL = typeof window !== 'undefined' ? window.location.origin : '';
const SITE_URL_INVALID = !SITE_URL || /localhost|127\.0\.0\.1/.test(SITE_URL);

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (SITE_URL_INVALID) {
      setError('NEXT_PUBLIC_SITE_URL غير مضبوط بشكل صحيح في إعدادات الموقع (لا يجوز أن يكون فارغًا أو localhost). أضفه في Vercel أولًا.');
      return;
    }
    setBusy(true);
    // يجب أن يطابق هذا بالضبط أحد Redirect URLs المسجَّلة في
    // Supabase → Authentication → URL Configuration، وإلا سيرفض Supabase
    // إعادة التوجيه ويعيد المستخدم لصفحة خطأ عامة بدل صفحة إعادة التعيين.
    const redirectTo = `${SITE_URL}/admin/reset-password`;
    const { error: err } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setBusy(false);
    if (err) { setError('تعذّر إرسال البريد. تحقق من العنوان وحاول مجددًا.'); return; }
    setSent(true);
  }

  return (
    <div className="py-10 max-w-sm mx-auto">
      <h2 className="mb-4 text-center">نسيت كلمة المرور؟</h2>
      {SITE_URL_INVALID && (
        <p className="text-red-600 text-sm text-center mb-3">
          تنبيه للمدير: NEXT_PUBLIC_SITE_URL غير مضبوط بعد على رابط حقيقي، فرابط الاسترجاع لن يعمل حتى يُضبط في Vercel.
        </p>
      )}
      {sent ? (
        <div className="text-center">
          <p className="mb-3">أرسلنا رابط إعادة التعيين إلى بريدك إن كان مسجَّلًا كمدير. تحقق من صندوق الوارد (وصندوق الرسائل غير المرغوبة).</p>
          <Link href="/admin/login" className="btn btn-primary">العودة لتسجيل الدخول</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="border-2 border-brand-line rounded-2xl p-4">
          <label className="label">البريد الإلكتروني</label>
          <input className="field" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          <button className="btn btn-yellow w-full mt-4" disabled={busy}>{busy ? 'جارٍ الإرسال…' : 'إرسال رابط إعادة التعيين'}</button>
          <div className="text-center mt-3">
            <Link href="/admin/login" className="text-sm text-brand-blue font-bold">العودة لتسجيل الدخول</Link>
          </div>
        </form>
      )}
    </div>
  );
}
