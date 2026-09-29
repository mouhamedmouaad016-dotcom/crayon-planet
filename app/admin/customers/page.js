'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseClient';
import Empty from '../../../components/Empty';

export default function AdminCustomers() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    supabaseBrowser().from('customers').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setRows(data || []));
  }, []);

  if (rows === null) return <p className="text-gray-400">جارٍ التحميل…</p>;
  if (!rows.length) return <Empty title="لا يوجد عملاء بعد" sub="يُضاف العميل تلقائيًا عند إتمام أول طلب له." />;

  return (
    <div>
      {rows.map((c) => (
        <div key={c.id} className="flex items-center gap-3 py-2 border-b border-brand-line">
          <div className="flex-1">
            <b>{c.name || 'بدون اسم'}</b>
            <div className="text-sm text-gray-500" dir="ltr">{c.email}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
