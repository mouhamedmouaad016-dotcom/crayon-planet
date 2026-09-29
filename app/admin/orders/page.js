'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseClient';
import { fmt } from '../../../components/ProductCard';
import Empty from '../../../components/Empty';

const EDITABLE = ['Pending', 'Cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);

  async function load() {
    const { data } = await supabaseBrowser().from('orders').select('*').order('created_at', { ascending: false });
    setOrders(data || []);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(o, status) {
    await supabaseBrowser().from('orders').update({ status }).eq('id', o.id);
    load();
  }

  if (orders === null) return <p className="text-gray-400">جارٍ التحميل…</p>;
  if (!orders.length) return <Empty title="لا توجد طلبات" sub="ستظهر الطلبات هنا فور استلامها." />;

  return (
    <div>
      <div className="bg-yellow-50 text-yellow-900 rounded-xl p-3 text-sm mb-4">
        Paid وFailed وDelivered تُسجَّل تلقائيًا من بوابة الدفع (Webhook) في المرحلة الثالثة فقط.
      </div>
      {orders.map((o) => (
        <div key={o.id} className="flex flex-wrap items-center gap-2 py-3 border-b border-brand-line">
          <div className="flex-1 min-w-[200px]">
            <b>{o.customer_email}</b>{o.customer_name ? ' • ' + o.customer_name : ''}
            <div className="text-sm text-gray-500">
              {(o.items || []).map((i) => i.name).join('، ')} • {fmt(o.total)}
            </div>
          </div>
          {EDITABLE.includes(o.status) ? (
            <select className="field w-auto" value={o.status} onChange={(e) => setStatus(o, e.target.value)}>
              {EDITABLE.map((s) => <option key={s}>{s}</option>)}
            </select>
          ) : (
            <span className="chip">{o.status}</span>
          )}
        </div>
      ))}
    </div>
  );
}
