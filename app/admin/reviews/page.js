'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseClient';
import Empty from '../../../components/Empty';

export default function AdminReviews() {
  const [rows, setRows] = useState(null);

  async function load() {
    const { data } = await supabaseBrowser()
      .from('reviews')
      .select('*, products(name)')
      .order('created_at', { ascending: false });
    setRows(data || []);
  }
  useEffect(() => { load(); }, []);

  async function approve(r) {
    await supabaseBrowser().from('reviews').update({ approved: true }).eq('id', r.id);
    load();
  }
  async function remove(r) {
    if (!confirm('حذف التقييم؟')) return;
    await supabaseBrowser().from('reviews').delete().eq('id', r.id);
    load();
  }

  if (rows === null) return <p className="text-gray-400">جارٍ التحميل…</p>;
  if (!rows.length) return <Empty title="لا توجد تقييمات بعد" sub="ستظهر هنا تقييمات العملاء الحقيقية فور إرسالها." />;

  return (
    <div>
      {rows.map((r) => (
        <div key={r.id} className="py-3 border-b border-brand-line">
          <div className="flex justify-between">
            <b>{r.name} — {'⭐'.repeat(r.rating || 0)}</b>
            <span className="text-sm text-gray-500">{r.products?.name}</span>
          </div>
          <p className="my-1">{r.text}</p>
          <div className="flex gap-2">
            {!r.approved && <button className="btn btn-yellow" onClick={() => approve(r)}>نشر</button>}
            {r.approved && <span className="chip">منشور</span>}
            <button className="btn btn-pink" onClick={() => remove(r)}>حذف</button>
          </div>
        </div>
      ))}
    </div>
  );
}
