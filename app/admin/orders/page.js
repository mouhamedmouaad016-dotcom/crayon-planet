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

  async function resend(o) {
    if (!window.confirm('إرسال رابط تحميل جديد إلى بريد هذا الطلب؟')) return;
    try {
      const res = await fetch(`/api/admin/orders/${o.id}/resend`, { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) window.alert('تعذّر: ' + (j.error || res.status));
      else if (j.complete) window.alert('تم إرسال الرابط.');
      else window.alert('لم يكتمل التسليم: ' + [...(j.missing || []).map((n) => 'ملف ناقص: ' + n), j.error].filter(Boolean).join(' | '));
    } catch (_) { window.alert('تعذّر الاتصال.'); }
    load();
  }

  async function confirmPayment(o) {
    const ref = window.prompt(
      `تأكيد يدوي: تأكدت من Chargily أن هذا الطلب مدفوع (${fmt(o.total)}) وأن البريد ${o.customer_email} صحيح.\n` +
      'أدخل رقم Checkout من Chargily (اختياري) ثم اضغط موافق للتأكيد والتسليم:',
      ''
    );
    if (ref === null) return;
    try {
      const res = await fetch(`/api/admin/orders/${o.id}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkout_id: ref }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) window.alert('تعذّر: ' + (j.error || res.status));
      else if (j.complete) window.alert('تم تأكيد الدفع وإرسال المنتج إلى بريد العميل.');
      else window.alert('تم تأكيد الدفع (Paid) لكن لم يكتمل الإرسال. استخدم "إعادة إرسال الرابط". ' + (j.error || ''));
    } catch (_) { window.alert('تعذّر الاتصال.'); }
    load();
  }

  if (orders === null) return <p className="text-gray-400">جارٍ التحميل…</p>;
  if (!orders.length) return <Empty title="لا توجد طلبات" sub="ستظهر الطلبات هنا فور استلامها." />;

    return (
    <div>
      <div className="bg-yellow-50 text-yellow-900 rounded-xl p-3 text-sm mb-4">
        في المرحلة الحالية فقط (Webhook) يتم تحويل حالة الطلب تلقائيًا من بوابة الدفع إلى Paid, Failed, Delivered.
      </div>

      {orders.map((o) => (
        <div
          key={o.id}
          className="flex flex-wrap items-center gap-2 py-3 border-b border-brand-line"
        >
          <div className="flex-1 min-w-[200px]">
            <b>{o.customer_email}</b>

            <div className="text-xs text-gray-400" dir="ltr">
              Order ID: {o.id}
            </div>

            <div className="text-sm text-gray-500">
              {(o.items || []).map((i) => i.name).join(', ')} · {fmt(o.total)}
            </div>

            {o.delivery_error && o.status === 'Paid' && (
              <div className="text-sm text-red-600">
                لم يكتمل التسليم: {o.delivery_error}
              </div>
            )}

            {o.payment_flag && (
              <div className="text-sm text-red-600">
                دفعة محجوزة للمراجعة: {o.payment_flag}
              </div>
            )}
          </div>

          {o.status === 'Pending' && (
            <button
              className="btn btn-yellow"
              onClick={() => confirmPayment(o)}
            >
              Confirm Payment &amp; Deliver
            </button>
          )}

          {['Paid', 'Delivered'].includes(o.status) && (
            <button
              className="btn btn-yellow"
              onClick={() => resend(o)}
            >
              إعادة إرسال الرابط
            </button>
          )}

          {EDITABLE.includes(o.status) ? (
            <select
              className="field w-auto"
              value={o.status}
              onChange={(e) => setStatus(o, e.target.value)}
            >
              {EDITABLE.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          ) : (
            <span className="chip">{o.status}</span>
          )}
        </div>
      ))}
    </div>
  );
}
