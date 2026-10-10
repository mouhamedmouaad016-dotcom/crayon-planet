'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseClient';
import Empty from '../../../components/Empty';

const STATUSES = ['New', 'In Progress', 'Answered', 'Closed'];

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    setError('');

    const { data, error } = await supabaseBrowser()
      .from('customer_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError('تعذّر تحميل الاستفسارات. تحققي من إعدادات قاعدة البيانات.');
      setInquiries([]);
      return;
    }

    setInquiries(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id, status) {
    const { error } = await supabaseBrowser()
      .from('customer_inquiries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      window.alert('تعذّر تحديث حالة الاستفسار.');
      return;
    }

    load();
  }

  if (inquiries === null) {
    return <p>جارٍ تحميل الاستفسارات...</p>;
  }

  return (
    <div>
      <h2 className="mb-4">استفسارات العملاء</h2>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {!error && inquiries.length === 0 && (
        <Empty
          title="لا توجد استفسارات بعد"
          sub="ستظهر هنا رسائل العملاء عند استقبالها."
        />
      )}

      <div className="space-y-4">
        {inquiries.map((item) => (
          <article
            key={item.id}
            className="border border-brand-line rounded-xl p-4"
          >
            <p className="whitespace-pre-wrap break-words">
              {item.message}
            </p>

            {item.customer_email && (
              <p className="text-sm mt-2" dir="ltr">
                {item.customer_email}
              </p>
            )}

            {item.order_id && (
              <p className="text-xs mt-2" dir="ltr">
                رقم الطلب: {item.order_id}
              </p>
            )}

            <p className="text-xs text-gray-500 mt-2" dir="ltr">
              {new Date(item.created_at).toLocaleString()}
            </p>

            <label className="label mt-3">حالة الاستفسار</label>
            <select
              className="field"
              value={item.status || 'New'}
              onChange={(e) => updateStatus(item.id, e.target.value)}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {{
                    New: 'جديد',
                    'In Progress': 'قيد المتابعة',
                    Answered: 'تم الرد',
                    Closed: 'مغلق',
                  }[status]}
                </option>
              ))}
            </select>
          </article>
        ))}
      </div>
    </div>
  );
      }
              
