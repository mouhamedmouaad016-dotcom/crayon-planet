'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabaseClient';
import { useCart } from '../../lib/cart';
import { fmt } from '../../components/ProductCard';
import Empty from '../../components/Empty';

export default function Checkout() {
  const { ids, clear } = useCart();
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // هذه القائمة للعرض فقط (تجربة المستخدم)؛ السعر الفعلي المُعتمد يُعاد
  // حسابه بالكامل من جهة الخادم في /api/orders، فتعديل الصفحة من أدوات
  // المطوّر هنا لا يغيّر شيئًا في المبلغ الذي يُدفع فعليًا.
  useEffect(() => {
    if (!ids.length) { setItems([]); return; }
    supabaseBrowser().from('products').select('*').in('id', ids).eq('published', true)
      .then(({ data }) => setItems(data || []));
  }, [ids]);

  if (!items.length) return <div className="py-6"><Empty title="السلة فارغة" sub="أضف منتجًا من المتجر أولًا." /></div>;

  const total = items.reduce((s, p) => s + Number(p.price), 0);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setError('أدخل بريدًا إلكترونيًا صحيحًا.');
      return;
    }
    setBusy(true);

    // 1) إنشاء الطلب من جهة الخادم (يتحقق من الأسعار الحقيقية، وينشئ/يحدّث
    // سجل العميل بنفس الخطوة).
    let orderRes;
    try {
      orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: ids, name: name.trim(), email: email.trim() }),
      });
    } catch (_) {
      setBusy(false);
      setError('تعذّر الاتصال بالخادم. حاول مجددًا.');
      return;
    }
    const orderBody = await orderRes.json().catch(() => ({}));
    if (!orderRes.ok) {
      setBusy(false);
      setError(orderBody.error || 'تعذّر تسجيل الطلب، حاول مجددًا.');
      return;
    }
    const orderId = orderBody.orderId;

    // 2) إنشاء جلسة دفع Chargily حقيقية لهذا الطلب تحديدًا.
    let res;
    try {
      res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
    } catch (_) {
      setBusy(false);
      setError('تعذّر الاتصال ببوابة الدفع. حاول مجددًا.');
      return;
    }

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setBusy(false);
      // الطلب مسجَّل فعليًا بحالة Pending في لوحة الإدارة حتى لو لم تكن
      // بوابة الدفع مفعّلة بعد — لا نعتبره مدفوعًا بأي شكل.
      setError(body.message || body.error || 'تعذّر بدء الدفع. طلبك مسجَّل برقم ' + orderId + ' بانتظار المتابعة.');
      return;
    }

    clear();
    window.location.href = body.checkout_url; // مغادرة الموقع إلى صفحة الدفع الرسمية لدى Chargily
  }

  return (
    <div className="py-6">
      <h2 className="mb-3">إتمام الطلب</h2>
      <form onSubmit={submit} className="border-2 border-brand-line rounded-2xl p-4">
        {items.map((p) => (
          <div key={p.id} className="flex justify-between py-1">
            <b>{p.name}</b><span>{fmt(p.price)}</span>
          </div>
        ))}
        <h3 className="my-3">الإجمالي: {fmt(total)}</h3>
        <label className="label">الاسم</label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <label className="label">البريد الإلكتروني لاستلام المنتج</label>
        <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        <div className="flex flex-wrap gap-2 mt-4">
          <button className="btn btn-yellow" disabled={busy}>{busy ? 'جارٍ التحويل إلى الدفع…' : 'الدفع الآن عبر CIB / الذهبية'}</button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          سيتم تحويلك إلى صفحة الدفع الرسمية لدى Chargily. لا نطّلع على بيانات بطاقتك ولا نخزّنها.
        </p>
      </form>
    </div>
  );
}
