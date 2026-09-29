'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../../lib/supabaseClient';

function slugify(s) {
  return s.trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '').replace(/\s+/g, '-') + '-' + Date.now().toString(36).slice(-4);
}

export default function AdminCategories() {
  const [cats, setCats] = useState([]);
  const [name, setName] = useState('');

  async function load() {
    const { data } = await supabaseBrowser().from('categories').select('*').order('sort');
    setCats(data || []);
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await supabaseBrowser().from('categories').insert({ name: name.trim(), slug: slugify(name) });
    setName('');
    load();
  }

  async function rename(c) {
    const n = prompt('الاسم الجديد', c.name);
    if (!n?.trim()) return;
    await supabaseBrowser().from('categories').update({ name: n.trim() }).eq('id', c.id);
    load();
  }

  async function remove(c) {
    const { count } = await supabaseBrowser().from('products').select('id', { count: 'exact', head: true }).eq('category_id', c.id);
    if (count > 0) { alert('لا يمكن حذف تصنيف يحتوي منتجات.'); return; }
    if (!confirm('حذف التصنيف؟')) return;
    await supabaseBrowser().from('categories').delete().eq('id', c.id);
    load();
  }

  return (
    <div>
      <form onSubmit={add} className="border-2 border-brand-line rounded-2xl p-3 flex gap-2 mb-4 max-w-md">
        <input className="field" placeholder="اسم تصنيف جديد" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-yellow">إضافة</button>
      </form>
      {cats.map((c) => (
        <div key={c.id} className="flex items-center gap-2 py-2 border-b border-brand-line">
          <b className="flex-1">{c.name}</b>
          <button className="btn btn-ghost" onClick={() => rename(c)}>تسمية</button>
          <button className="btn btn-pink" onClick={() => remove(c)}>حذف</button>
        </div>
      ))}
    </div>
  );
}
