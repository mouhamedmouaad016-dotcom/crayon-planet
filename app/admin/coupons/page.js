'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseClient';
import Empty from '../../../components/Empty';

export default function AdminCoupons() {
  const [rows, setRows] = useState(null);
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState('');

  async function load() {
    const { data } = await supabaseBrowser().from('coupons').select('*').order('code');
    setRows(data || []);
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    if (!code.trim()) return;
    await supabaseBrowser().from('coupons').insert({ code: code.trim().toUpperCase(), percent_off: Number(percent) || null });
    setCode(''); setPercent('');
    load();
  }

  async function toggle(c) {
    await supabaseBrowser().from('coupons').update({ active: !c.active }).eq('id', c.id);
    load();
  }

  async function remove(c) {
    if (!confirm('حذف الكوبون؟')) return;
    await supabaseBrowser().from('coupons').delete().eq('id', c.id);
    load();
  }

  return (
    <div>
      <div className="bg-yellow-50 text-yellow-900 rounded-xl p-3 text-sm mb-4">
        الكوبونات جاهزة في قاعدة البيانات، لكن تطبيقها الفعلي على مبلغ الدفع
        سيُفعَّل عند ربط بوابة الدفع نهائيًا في المرحلة الثالثة.
      </div>
      <form onSubmit={add} className="border-2 border-brand-line rounded-2xl p-3 flex gap-2 mb-4 flex-wrap">
        <input className="field" style={{ maxWidth: 160 }} placeholder="الكود" value={code} onChange={(e) => setCode(e.target.value)} />
        <input className="field" style={{ maxWidth: 120 }} type="number" placeholder="نسبة الخصم %" value={percent} onChange={(e) => setPercent(e.target.value)} />
        <button className="btn btn-yellow">إضافة</button>
      </form>
      {rows === null ? (
        <p className="text-gray-400">جارٍ التحميل…</p>
      ) : rows.length ? (
        rows.map((c) => (
          <div key={c.id} className="flex items-center gap-2 py-2 border-b border-brand-line">
            <b className="flex-1" dir="ltr">{c.code}</b>
            <span className="text-sm text-gray-500">{c.percent_off ? c.percent_off + '%' : ''}</span>
            <button className="btn btn-ghost" onClick={() => toggle(c)}>{c.active ? 'تعطيل' : 'تفعيل'}</button>
            <button className="btn btn-pink" onClick={() => remove(c)}>حذف</button>
          </div>
        ))
      ) : (
        <Empty title="لا توجد كوبونات بعد" />
      )}
    </div>
  );
}
