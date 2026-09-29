'use client';
import { useState } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseClient';

export default function ReviewForm({ productId }) {
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !text.trim()) { setError('الاسم والتعليق مطلوبان.'); return; }
    setBusy(true);
    // approved يبقى false دائمًا من هنا — سياسة RLS نفسها ترفض أي محاولة
    // لإرساله true من المتصفح، والتقييم لا يظهر للعامة إلا بعد موافقة
    // الإدارة يدويًا من لوحة التحكم.
    const { error: err } = await supabaseBrowser().from('reviews').insert({
      product_id: productId,
      name: name.trim(),
      rating: Number(rating),
      text: text.trim(),
      approved: false,
    });
    setBusy(false);
    if (err) { setError('تعذّر إرسال التقييم، حاول مجددًا.'); return; }
    setDone(true);
  }

  if (done) {
    return <p className="text-green-700 bg-green-50 rounded-xl p-3 text-sm">شكرًا لك! سيظهر تقييمك بعد مراجعته من الإدارة.</p>;
  }

  return (
    <form onSubmit={submit} className="border-2 border-brand-line rounded-2xl p-4 mt-3">
      <h3 className="mb-2 text-base">أضف تقييمك</h3>
      <label className="label">الاسم</label>
      <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      <label className="label">التقييم</label>
      <select className="field" value={rating} onChange={(e) => setRating(e.target.value)}>
        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'⭐'.repeat(n)}</option>)}
      </select>
      <label className="label">تعليقك</label>
      <textarea className="field" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      <button className="btn btn-yellow mt-3" disabled={busy}>{busy ? 'جارٍ الإرسال…' : 'إرسال التقييم'}</button>
    </form>
  );
}
