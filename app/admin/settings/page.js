'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseClient';

const FIELDS = [
  ['store_name', 'اسم المتجر'],
  ['domain', 'النطاق'],
  ['support_email', 'البريد الرسمي'],
  ['whatsapp', 'رقم WhatsApp (بصيغة دولية، أرقام فقط)'],
  ['facebook', 'رابط Facebook'],
  ['instagram', 'رابط Instagram'],
  ['pinterest', 'رابط Pinterest'],
  ['telegram', 'رابط Telegram'],
  ['x', 'رابط X'],
  ['linkedin', 'رابط LinkedIn'],
];

export default function AdminSettings() {
  const [s, setS] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabaseBrowser().from('settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setS(data || {}));
  }, []);

  async function save(e) {
    e.preventDefault();
    setSaved(false);
    const { id, ...body } = s;
    await supabaseBrowser().from('settings').update(body).eq('id', 1);
    setSaved(true);
  }

  if (!s) return <p className="text-gray-400">جارٍ التحميل…</p>;

  return (
    <form onSubmit={save} className="border-2 border-brand-line rounded-2xl p-4 max-w-md">
      {FIELDS.map(([key, label]) => (
        <div key={key}>
          <label className="label">{label}</label>
          <input className="field" dir="ltr" value={s[key] || ''} onChange={(e) => setS({ ...s, [key]: e.target.value })} />
        </div>
      ))}
      <button className="btn btn-yellow mt-4">حفظ الإعدادات</button>
      {saved && <span className="text-green-700 text-sm ms-3">تم الحفظ ✓</span>}
    </form>
  );
}
