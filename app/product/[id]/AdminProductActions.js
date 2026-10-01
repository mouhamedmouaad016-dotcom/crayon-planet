'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '../../../lib/supabaseClient';

export default function AdminProductActions({ product }) {
  const [loading, setLoading] = useState(false);

  async function togglePublish() {
    if (!product.published && !product.file_path) {
      alert('أرفق ملف المنتج قبل النشر.');
      return;
    }

    setLoading(true);

    const { error } = await supabaseBrowser()
      .from('products')
      .update({ published: !product.published })
      .eq('id', product.id);

    setLoading(false);

    if (error) {
      alert('حدث خطأ: ' + error.message);
      return;
    }

    window.location.reload();
  }

  return (
    <div className="mt-4 p-4 rounded-xl border-2 border-brand-line bg-brand-soft">
      <div className="flex gap-2 flex-wrap">
        <Link
          href={`/admin/products/${product.id}`}
          className="btn btn-ghost"
        >
          ✏️ تعديل المنتج
        </Link>

        <button
          type="button"
          onClick={togglePublish}
          disabled={loading}
          className="btn btn-yellow"
        >
          {loading
            ? 'جارٍ التنفيذ…'
            : product.published
              ? '👁️ إخفاء المنتج'
              : '📢 نشر المنتج'}
        </button>
      </div>
    </div>
  );
            }
