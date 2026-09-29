'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseClient';
import Empty from '../../../components/Empty';

export default function AdminSubscribers() {
  const [rows, setRows] = useState(null);

  async function load() {
    const { data } = await supabaseBrowser().from('subscribers').select('*').order('created_at', { ascending: false });
    setRows(data || []);
  }
  useEffect(() => { load(); }, []);

  async function remove(s) {
    await supabaseBrowser().from('subscribers').delete().eq('id', s.id);
    load();
  }

  if (rows === null) return <p className="text-gray-400">جارٍ التحميل…</p>;
  if (!rows.length) return <Empty title="لا يوجد مشتركون بعد" sub="يظهر هنا كل من يشترك من نموذج النشرة البريدية في تذييل الموقع." />;

  return (
    <div>
      {rows.map((s) => (
        <div key={s.id} className="flex items-center gap-2 py-2 border-b border-brand-line">
          <span className="flex-1" dir="ltr">{s.email}</span>
          <button className="btn btn-pink" onClick={() => remove(s)}>حذف</button>
        </div>
      ))}
    </div>
  );
}
