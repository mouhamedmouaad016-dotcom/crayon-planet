'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Empty from '../../../components/Empty';

const LABELS = {
  Pending: ['جارٍ التحقق من الدفع…', 'لا تغلق الصفحة. نتحقق من نتيجة الدفع مباشرة من Chargily.'],
  Paid: ['تم الدفع بنجاح 🎉', 'يصلك رابط تحميل المنتج على بريدك خلال لحظات. إن لم يصلك، افحص الرسائل غير الهامة ثم استعد الرابط من صفحة «استعادة الرابط».'],
  Delivered: ['تم الدفع والتسليم 🎉', 'أرسلنا رابط تحميل المنتج إلى بريدك.'],
  Failed: ['فشلت عملية الدفع', 'لم يُخصم أي مبلغ ولم يُرسل أي ملف. يمكنك المحاولة مجددًا من السلة.'],
  Cancelled: ['تم إلغاء عملية الدفع', 'لم يُخصم أي مبلغ ولم يُرسل أي ملف.'],
};

export default function DoneInner() {
  const id = useSearchParams().get('order');
  const [status, setStatus] = useState('Pending');
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!id) return;
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${id}/status`, { cache: 'no-store' });
        if (res.ok) {
          const { status: s } = await res.json();
          if (!stop) setStatus(s);
          if (['Paid', 'Delivered', 'Failed', 'Cancelled'].includes(s)) return;
        }
      } catch (_) {}
      if (!stop && tries < 20) {
        setTries((t) => t + 1);
        setTimeout(poll, 3000);
      }
    };
    poll();
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!id) return <div className="py-6"><Empty title="لا يوجد طلب" sub="عد إلى المتجر وابدأ من هناك." /></div>;

  const [title, sub] = LABELS[status] || LABELS.Pending;

  return (
    <div className="py-6">
      <Empty title={title} sub={sub} />
      <p className="text-center text-sm text-gray-500 mt-3">رقم الطلب: {id}</p>
      <div className="text-center mt-4">
        <Link href="/shop" className="btn btn-primary">العودة للمتجر</Link>
        {(status === 'Paid' || status === 'Delivered') && (
          <p className="mt-3 text-sm"><Link href="/recover" className="underline">لم يصلك الرابط؟ استعد رابط التحميل</Link></p>
        )}
      </div>
    </div>
  );
}
