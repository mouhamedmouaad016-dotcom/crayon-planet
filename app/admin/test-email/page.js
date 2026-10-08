'use client';
import { useState } from 'react';

// صفحة اختبار مؤقتة: تحميها middleware (مسار /admin) والـ API يتحقق من الأدمن أيضًا. احذفها بعد الاختبار.
export default function TestEmail() {
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function send() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.ok) setResult({ ok: true, text: 'تم الإرسال. Resend ID: ' + j.id });
      else setResult({ ok: false, text: 'فشل: ' + (j.error || res.status) });
    } catch (_) {
      setResult({ ok: false, text: 'تعذّر الاتصال.' });
    }
    setBusy(false);
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-bold mb-2">اختبار البريد (مؤقت)</h1>
      <p className="text-sm text-gray-500 mb-4">
        يرسل رسالة نصية بسيطة بلا روابط من عنوان المتجر إلى Gmail الذي تدخله.
      </p>
      <input
        className="field w-full mb-3"
        type="email"
        dir="ltr"
        placeholder="name@gmail.com"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      <button className="btn btn-yellow" onClick={send} disabled={busy || !to}>
        {busy ? 'جارٍ الإرسال…' : 'إرسال اختبار البريد'}
      </button>
      {result && (
        <div className={'mt-4 text-sm ' + (result.ok ? 'text-green-700' : 'text-red-600')}>
          {result.text}
        </div>
      )}
    </div>
  );
    }
