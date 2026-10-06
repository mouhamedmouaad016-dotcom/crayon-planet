'use client';
import { useState } from 'react';

export default function RecoverForm() {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderId.trim(), email: email.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      setOk(res.ok);
      setMsg(j.message || 'تعذّر تنفيذ الطلب الآن.');
    } catch (_) {
      setOk(false); setMsg('تعذّر الاتصال. حاول مرة أخرى.');
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="border-2 border-brand-line rounded-2xl p-4">
      <label className="label">رقم الطلب</label>
      <input className="field" dir="ltr" value={orderId} onChange={(e) => setOrderId(e.target.value)} required />
      <label className="label">البريد الإلكتروني</label>
      <input className="field" dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      {msg && <p className={`text-sm mt-2 ${ok ? 'text-green-700' : 'text-red-600'}`}>{msg}</p>}
      <button className="btn btn-yellow mt-3" disabled={busy}>{busy ? 'جارٍ الإرسال…' : 'أرسل لي الرابط'}</button>
    </form>
  );
}
