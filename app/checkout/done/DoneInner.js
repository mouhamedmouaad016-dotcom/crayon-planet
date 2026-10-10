'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Empty from '../../../components/Empty';

const LABELS = {
  Pending: {
    title: 'جارٍ تأكيد الدفع…',
    sub: 'تم استلام طلبك. نتحقق الآن من عملية الدفع لدى Chargily.',
  },
  Paid: {
    title: 'تم الدفع بنجاح 🎉',
   sub: 'شكرًا لشرائك من CRAYON PLANET. إذا ظهرت أزرار التحميل أسفل الصفحة، اضغط على الزر الخاص بمنتجك لتنزيله.',
  },
  Delivered: {
    title: 'تم الدفع بنجاح 🎉',
    sub: 'شكرًا لشرائك من CRAYON PLANET. منتجك جاهز للتحميل الآن.',
  },
  Failed: {
    title: 'تعذر إتمام الدفع',
    sub: 'لم تكتمل عملية الدفع. يمكنك المحاولة مرة أخرى.',
  },
  Cancelled: {
    title: 'تم إلغاء الدفع',
    sub: 'تم إلغاء عملية الدفع.',
  },
};

export default function DoneInner() {
  const id = useSearchParams().get('order');

  const [status, setStatus] = useState('Pending');
  const [downloads, setDownloads] = useState([]);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!id) return;

    let stop = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${id}/status`, {
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();

          if (stop) return;

          if (data?.status) {
            setStatus(data.status);
          }

          if (Array.isArray(data?.downloads)) {
            setDownloads(data.downloads);
          }

          if (
            ['Paid', 'Delivered', 'Failed', 'Cancelled'].includes(
              data?.status
            )
          ) {
            return;
          }
        }
      } catch (_) {}

      if (!stop && tries < 40) {
        setTries((t) => t + 1);
      }
    };

    poll();

    return () => {
      stop = true;
    };
  }, [id, tries]);

  useEffect(() => {
    if (!id) return;

    if (
      ['Paid', 'Delivered', 'Failed', 'Cancelled'].includes(status)
    ) {
      return;
    }

    const timer = setTimeout(() => {
      setTries((t) => t + 1);
    }, 3000);

    return () => clearTimeout(timer);
  }, [id, status]);

  if (!id) {
    return (
      <div className="py-6">
        <Empty
          title="لم يتم العثور على الطلب"
          sub="يرجى العودة إلى المتجر والمحاولة مرة أخرى."
        />
      </div>
    );
  }

  const label = LABELS[status] || LABELS.Pending;

  return (
    <div className="py-6">
      <Empty title={label.title} sub={label.sub} />

      <p className="text-center text-sm text-gray-500 mt-3">
        رقم الطلب: {id}
      </p>

      {downloads.length > 0 && (
        <div className="mt-6 max-w-md mx-auto">
          <h2 className="text-center font-bold text-lg mb-4">
            منتجاتك جاهزة للتحميل 📥
          </h2>

          <div className="space-y-3">
            {downloads.map((item, index) => (
              <a
                key={`${item.product_id || item.name || 'product'}-${index}`}
                href={item.url}
                className="btn btn-primary w-full block text-center"
                target="_blank"
                rel="noreferrer"
              >
                تحميل: {item.name || 'المنتج'}
              </a>
            ))}
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">
            يمكنك تحميل منتجك من الأزرار أعلاه. وقد يصلك رابط التحميل أيضًا عبر البريد الإلكتروني.
            إذا لم تجد الرسالة في صندوق الوارد، فتحقّق من مجلد Spam
            (الرسائل غير المرغوب فيها) في Gmail.
          </p>
        </div>
      )}

      {status === 'Pending' && (
        <p className="text-center text-sm text-gray-500 mt-5">
          يرجى الانتظار قليلًا… جارٍ تأكيد الدفع.
        </p>
      )}

      {['Paid', 'Delivered'].includes(status) &&
        downloads.length === 0 && (
          <p className="text-center text-sm text-gray-500 mt-5">
            تم تأكيد الدفع، لكن جارٍ تجهيز رابط التحميل…
            إذا وصلتك رسالة بريد إلكتروني، فتحقّق من مجلد Spam
            (الرسائل غير المرغوب فيها) في Gmail عند عدم ظهورها في صندوق الوارد.
          </p>
        )}

      <div className="text-center mt-6">
        <Link href="/shop" className="btn btn-primary">
          العودة للمتجر
        </Link>

        {['Paid', 'Delivered'].includes(status) && (
          <p className="mt-3 text-sm">
            <Link href="/recover" className="underline">
              لم يصلك البريد؟ استرجع رابط التحميل
            </Link>
          </p>
        )}
      </div>
    </div>
  );
              }
        
