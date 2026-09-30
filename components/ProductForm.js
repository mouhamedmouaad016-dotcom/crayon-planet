'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '../lib/supabaseClient';

const AGES = ['2–4', '4–6', '6–8', '8–12', 'كل الأعمار'];
const TYPES = ['PDF', 'ZIP', 'EPUB', 'PNG', 'DOCX'];

function slugify(s) {
  return s.trim().toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60) + '-' + Date.now().toString(36).slice(-4);
}

// يبني مفتاح تخزين آمنًا وفريدًا دون أي اعتماد على اسم الملف الأصلي، الذي قد
// يحتوي أحرفًا مرفوضة من Supabase Storage (مثل ':') — خصوصًا من بعض متصفحات
// أندرويد التي تُرجع أحيانًا اسمًا مشتقًا من معرّف الملف الداخلي (مثل
// "document:1000012345") بدل الاسم الحقيقي. الامتداد فقط يُستخرج من الاسم
// الأصلي، وما تبقى منه يُستبعد كليًا من المفتاح.
function safeStorageKey(originalName) {
  const dot = originalName.lastIndexOf('.');
  const rawExt = dot > -1 ? originalName.slice(dot + 1) : '';
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
  const random = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}-${random}${ext ? '.' + ext : ''}`;
}

export default function ProductForm({ product }) {
  const router = useRouter();
  const [cats, setCats] = useState([]);
  const [name, setName] = useState(product?.name || '');
  const [desc, setDesc] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price ?? '');
  const [old, setOld] = useState(product?.compare_at_price ?? '');
  const [cat, setCat] = useState(product?.category_id || '');
  const [age, setAge] = useState(product?.age_range || AGES[0]);
  const [pages, setPages] = useState(product?.pages ?? '');
  const [type, setType] = useState(product?.file_type || TYPES[0]);
  const [images, setImages] = useState(product?.images || []);
  const [filePath, setFilePath] = useState(product?.file_path || '');
  const [fileName, setFileName] = useState(product?.file_name || '');
  const [published, setPublished] = useState(product?.published || false);
  const [featured, setFeatured] = useState(product?.featured || false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabaseBrowser().from('categories').select('*').order('sort').then(({ data }) => {
      setCats(data || []);
      if (!cat && data?.length) setCat(data[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadImages(fileList) {
    const supabase = supabaseBrowser();
    const urls = [];
    for (const file of fileList) {
      const path = safeStorageKey(file.name);
      const { error: upErr } = await supabase.storage.from('product-images').upload(path, file, { upsert: false });
      if (upErr) { setError('تعذّر رفع إحدى الصور: ' + upErr.message); continue; }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    setImages((prev) => [...prev, ...urls]);
  }

  async function uploadFile(file) {
    const supabase = supabaseBrowser();
    const path = safeStorageKey(file.name);
    const { error: upErr } = await supabase.storage.from('product-files').upload(path, file, { upsert: false });
    if (upErr) { setError('تعذّر رفع الملف: ' + upErr.message); return; }
    setFilePath(path);
    setFileName(file.name);
  }

  function removeImage(i) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    if (published && !filePath) { setError('أرفق ملف المنتج قبل النشر.'); return; }
    setBusy(true);
    const body = {
      name: name.trim(),
      description: desc.trim(),
      price: Number(price) || 0,
      compare_at_price: Number(old) || null,
      category_id: cat || null,
      age_range: age,
      pages: Number(pages) || null,
      file_type: type,
      images,
      file_path: filePath || null,
      file_name: fileName || null,
      published,
      featured,
      updated_at: new Date().toISOString(),
    };
    const supabase = supabaseBrowser();
    let dbErr;
    if (product?.id) {
      ({ error: dbErr } = await supabase.from('products').update(body).eq('id', product.id));
    } else {
      body.slug = slugify(name);
      ({ error: dbErr } = await supabase.from('products').insert(body));
    }
    setBusy(false);
    if (dbErr) { setError('تعذّر الحفظ: ' + dbErr.message); return; }
    router.push('/admin/products');
    router.refresh();
  }

  return (
    <form onSubmit={save} className="border-2 border-brand-line rounded-2xl p-4 max-w-xl">
      <h3 className="mb-2">{product ? 'تعديل منتج' : 'إضافة منتج'}</h3>

      <label className="label">الاسم</label>
      <input className="field" required value={name} onChange={(e) => setName(e.target.value)} />

      <label className="label">الوصف</label>
      <textarea className="field" rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">السعر (د.ج، 0 = مجاني)</label>
          <input className="field" type="number" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div>
          <label className="label">السعر قبل الخصم (اختياري)</label>
          <input className="field" type="number" min="0" value={old} onChange={(e) => setOld(e.target.value)} />
        </div>
      </div>

      <label className="label">التصنيف</label>
      <select className="field" value={cat} onChange={(e) => setCat(e.target.value)}>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">العمر</label>
          <select className="field" value={age} onChange={(e) => setAge(e.target.value)}>
            {AGES.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="label">عدد الصفحات</label>
          <input className="field" type="number" min="0" value={pages} onChange={(e) => setPages(e.target.value)} />
        </div>
      </div>

      <label className="label">نوع الملف</label>
      <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
        {TYPES.map((t) => <option key={t}>{t}</option>)}
      </select>

      <label className="label">صور المنتج (من الهاتف)</label>
      <input className="field" type="file" accept="image/*" multiple onChange={(e) => e.target.files.length && uploadImages(e.target.files)} />
      <div className="flex gap-2 flex-wrap mt-2">
        {images.map((src, i) => (
          <img key={i} src={src} onClick={() => removeImage(i)} title="اضغط للحذف" className="w-14 h-14 object-cover rounded-lg border-2 border-brand-line cursor-pointer" alt="" />
        ))}
      </div>

      <label className="label">ملف المنتج (PDF/ZIP) — يُخزَّن في مساحة خاصة غير عامة</label>
      <input className="field" type="file" onChange={(e) => e.target.files[0] && uploadFile(e.target.files[0])} />
      <p className="text-sm text-gray-500 mt-1">{fileName || 'لم يُرفق ملف'}</p>

      <label className="flex items-center gap-2 mt-4 font-bold">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        نشر المنتج للزوار
      </label>
      <label className="flex items-center gap-2 mt-2 font-bold">
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        منتج مميز (يظهر في قسم "المنتجات المميزة")
      </label>

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      <div className="flex gap-2 mt-4">
        <button className="btn btn-yellow" disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</button>
        <button type="button" className="btn btn-ghost" onClick={() => router.push('/admin/products')}>إلغاء</button>
      </div>
    </form>
  );
}
  
