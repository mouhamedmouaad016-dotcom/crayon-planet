'use client';
import { useState } from 'react';
import { supabaseBrowser } from '../lib/supabaseClient';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setMsg('أدخل بريدًا إلكترونيًا صحيحًا.'); return; }
    setBusy(true);
    const { error } = await supabaseBrowser().from('subscribers').insert({ email: email.trim().toLowerCase() });
    setBusy(false);
    if (error) {
      // خطأ تفرّد unique constraint = هذا البريد مشترك أصلًا، وهذا ليس عطلًا.
      setMsg(error.code === '23505' ? 'أنت مشترك بالفعل ✓' : 'تعذّر الاشتراك، حاول مجددًا.');
      return;
    }
    setEmail('');
    setMsg('تم الاشتراك بنجاح ✓');
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2 mt-3 max-w-sm">
      <input
        type="email"
        required
        placeholder="بريدك الإلكتروني"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        dir="ltr"
        className="flex-1 min-w-[180px] rounded-xl px-3 py-2 text-brand-ink"
      />
      <button className="btn btn-yellow" disabled={busy}>{busy ? '…' : 'اشترك'}</button>
      {msg && <p className="w-full text-sm opacity-90">{msg}</p>}
    </form>
  );
}
