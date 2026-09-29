'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '../../../lib/supabaseClient';

// رابط الاسترجاع القادم من بريد Supabase يصل بإحدى صيغتين حسب إعداد
// المشروع: رموز في الجزء الهاشي من الرابط (#access_token=...&type=recovery)
// يعالجها supabase-js تلقائيًا عند تحميل الصفحة، أو معامل ?code=... يحتاج
// استبداله صراحة بجلسة عبر exchangeCodeForSession. نتعامل مع الحالتين معًا
// حتى يعمل التدفق بغض النظر عن إعداد المشروع، بدل افتراض واحدة منهما فقط.
export default function ResetPassword() {
  const router = useRouter();
  const [status, setStatus] = useState('checking'); // checking | ready | invalid
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const settled = useRef(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    const params = new URLSearchParams(window.location.search);
    const errorDesc = params.get('error_description') || params.get('error');
    const code = params.get('code');

    function markReady() {
      if (settled.current) return;
      settled.current = true;
      setStatus('ready');
    }
    function markInvalid(msg) {
      if (settled.current) return;
      settled.current = true;
      setStatus('invalid');
      if (msg) setError(msg);
    }

    // حالة 1: Supabase نفسه أعاد توجيه المستخدم مع خطأ صريح (رابط منتهي
    // الصلاحية أو مُستخدم من قبل).
    if (errorDesc) {
      markInvalid(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') markReady();
    });

    (async () => {
      // حالة 2: تدفق PKCE بمعامل code في الرابط — يجب استبداله صراحة بجلسة.
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) { markInvalid('رابط إعادة التعيين غير صالح أو منتهي الصلاحية.'); return; }
        markReady();
        return;
      }
      // حالة 3: تدفق الرموز الهاشية — supabase-js يعالجه تلقائيًا عند تحميل
      // الصفحة (detectSessionInUrl)؛ إن كانت هناك جلسة بالفعل فهي جاهزة.
      const { data } = await supabase.auth.getSession();
      if (data.session) markReady();
    })();

    // مهلة أمان: إن لم تصل أي إشارة جلسة خلال 6 ثوانٍ، اعتبر الرابط غير
    // صالح بدل ترك المستخدم أمام دوّارة تحميل إلى الأبد.
    const timeout = setTimeout(() => {
      markInvalid('تعذّر التحقق من رابط إعادة التعيين. قد يكون منتهي الصلاحية أو استُخدم من قبل.');
    }, 6000);

    return () => { sub.subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('كلمة المرور يجب أن تكون 8 خانات على الأقل.'); return; }
    if (password !== confirm) { setError('كلمتا المرور غير متطابقتين.'); return; }
    setBusy(true);
    const { error: err } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (err) { setError('تعذّر تحديث كلمة المرور. الرابط قد يكون منتهي الصلاحية، اطلب رابطًا جديدًا.'); return; }
    setDone(true);
    setTimeout(() => router.push('/admin/login'), 2000);
  }

  if (status === 'checking') {
    return <div className="py-10 max-w-sm mx-auto text-center text-gray-500">جارٍ التحقق من رابط الاسترجاع…</div>;
  }

  if (status === 'invalid') {
    return (
      <div className="py-10 max-w-sm mx-auto text-center">
        <h2 className="mb-3">الرابط غير صالح</h2>
        <p className="text-red-600 text-sm mb-4">{error || 'رابط إعادة التعيين منتهي الصلاحية أو غير صحيح.'}</p>
        <Link href="/admin/forgot-password" className="btn btn-primary">طلب رابط جديد</Link>
      </div>
    );
  }

  return (
    <div className="py-10 max-w-sm mx-auto">
      <h2 className="mb-4 text-center">تعيين كلمة مرور جديدة</h2>
      {done ? (
        <p className="text-green-700 text-center">تم تحديث كلمة المرور ✓ جارٍ تحويلك لصفحة الدخول…</p>
      ) : (
        <form onSubmit={submit} className="border-2 border-brand-line rounded-2xl p-4">
          <label className="label">كلمة المرور الجديدة</label>
          <input className="field" type="password" dir="ltr" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <label className="label">تأكيد كلمة المرور</label>
          <input className="field" type="password" dir="ltr" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          <button className="btn btn-yellow w-full mt-4" disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور'}</button>
        </form>
      )}
    </div>
  );
}
