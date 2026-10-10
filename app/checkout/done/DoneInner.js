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
    sub: 'شكرًا لشرائك من CRAYON PLANET. اضغط على زر التحميل لتنزيل منتجك.',
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

  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [inquiryResult, setInquiryResult] = useState('');

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

          if (data?.status) setStatus(data.status);

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

  async function submitInquiry(e) {
    e.preventDefault();
    setSending(true);
    setInquiryResult('');

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          email,
          orderId: id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInquiryResult(
          data?.error || 'تعذر إرسال استفسارك. يرجى المحاولة مجددًا.'
        );
        return;
      }

      setInquiryResult('تم إرسال استفسارك بنجاح. شكرًا لتواصلك معنا.');
      setMessage('');
      setEmail('');
    } catch (_) {
      setInquiryResult('تعذر الاتصال. تحققي من الإنترنت وحاولي مجددًا.');
    } finally {
      setSending(false);
    }
  }

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
  const isPaid = ['Paid', 'Delivered'].includes(status);

  return (
    <div className="py-6">
      <Empty title={label.title} sub={label.sub} />

      <p className="text-center text-sm text-gray-500 mt-3">
        رقم الطلب: {id}
      </p>

      {downloads.length > 0 && (
        <div className="mt-6 max-w-md mx-auto px-4">
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
            يمكنك تحميل منتجك من الأزرار أعلاه، كما يصلك رابط التحميل عبر البريد الإلكتروني.
            إذا لم تجد الرسالة، فتحقّق من مجلد الرسائل غير المرغوب فيها (Spam).
          </p>
        </div>
      )}

      {status === 'Pending' && (
        <p className="text-center text-sm text-gray-500 mt-5">
          يرجى الانتظار قليلًا… جارٍ تأكيد الدفع.
        </p>
      )}

      {isPaid && downloads.length === 0 && (
        <p className="text-center text-sm text-gray-500 mt-5 px-4">
          تم تأكيد الدفع، لكن جارٍ تجهيز رابط التحميل. يرجى الانتظار قليلًا.
        </p>
      )}

      <div className="text-center mt-6">
        <Link href="/shop" className="btn btn-primary">
          العودة للمتجر
        </Link>

        {isPaid && (
          <p className="mt-3 text-sm">
            <Link href="/recover" className="underline">
              لم يصلك البريد؟ استرجع رابط التحميل
            </Link>
          </p>
        )}
      </div>

      {isPaid && (
        <section className="max-w-md mx-auto mt-10 px-4">
          <div className="rounded-2xl border border-yellow-300 bg-blue-50 p-5">
            <h2 className="text-center text-lg font-bold mb-2">
              هل لديك استفسار؟ 💬
            </h2>

            <p className="text-center text-sm text-gray-600 mb-5">
              أرسلي رسالتك وسنطلع عليها من خلال لوحة إدارة المتجر.
            </p>

            <form onSubmit={submitInquiry} className="space-y-4">
              <div>
                <label
                  htmlFor="inquiry-message"
                  className="block text-sm font-medium mb-2"
                >
                  رسالتك أو استفسارك *
                </label>
                <textarea
                  id="inquiry-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  minLength={3}
                  maxLength={2000}
                  rows={4}
                  placeholder="اكتبي استفسارك هنا..."
                  className="w-full rounded-xl border border-gray-300 bg-white p-3"
                />
              </div>

              <div>
                <label
                  htmlFor="inquiry-email"
                  className="block text-sm font-medium mb-2"
                >
                  بريدك الإلكتروني (اختياري)
                </label>
                <input
                  id="inquiry-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={254}
                  placeholder="example@email.com"
                  className="w-full rounded-xl border border-gray-300 bg-white p-3"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="btn btn-primary w-full disabled:opacity-60"
              >
                {sending ? 'جارٍ إرسال الاستفسار…' : 'إرسال الاستفسار'}
              </button>

              {inquiryResult && (
                <p
                  role="status"
                  className="text-center text-sm mt-3"
                  aria-live="polite"
                >
                  {inquiryResult}
                </p>
              )}
            </form>
          </div>
        </section>
      )}
    </div>
  );
               }
