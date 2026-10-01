import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseServer';

// ينشئ الطلب من جهة الخادم فقط.
// السعر الحقيقي يُقرأ من قاعدة البيانات ولا نعتمد على بيانات المتصفح.
export async function POST(req) {
  const { productIds, name, email } = await req.json().catch(() => ({}));

  if (!Array.isArray(productIds) || !productIds.length) {
    return NextResponse.json(
      { error: 'السلة فارغة' },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || ''))) {
    return NextResponse.json(
      { error: 'أدخل بريدًا إلكترونيًا صحيحًا' },
      { status: 400 }
    );
  }

  const admin = supabaseAdmin();

  const { data: products, error } = await admin
    .from('products')
    .select('id, name, price, published')
    .in('id', productIds);

  if (error) {
    // تشخيص مؤقت فقط لمعرفة سبب الخطأ الحقيقي.
    return NextResponse.json(
      {
        error: 'تعذّر التحقق من المنتجات',
        debug: {
          message: error.message || '-',
          code: error.code || '-',
          details: error.details || '-',
          hint: error.hint || '-',
        },
      },
      { status: 500 }
    );
  }

  const found = new Map(
    (products || []).map((p) => [p.id, p])
  );

  const items = [];

  for (const id of productIds) {
    const p = found.get(id);

    if (!p || !p.published) {
      return NextResponse.json(
        {
          error:
            'أحد المنتجات لم يعد متاحًا. حدّث السلة وحاول مجددًا.',
        },
        { status: 409 }
      );
    }

    items.push({
      product_id: p.id,
      name: p.name,
      price: Number(p.price),
    });
  }

  const total = items.reduce(
    (sum, item) => sum + item.price,
    0
  );

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(name || '').trim() || null;

  await admin
    .from('customers')
    .upsert(
      {
        email: cleanEmail,
        name: cleanName,
      },
      { onConflict: 'email' }
    );

  const { data: order, error: orderErr } = await admin
    .from('orders')
    .insert({
      customer_email: cleanEmail,
      customer_name: cleanName,
      items,
      total,
      status: 'Pending',
    })
    .select('id')
    .maybeSingle();

  if (orderErr || !order) {
    return NextResponse.json(
      {
        error: 'تعذّر تسجيل الطلب، حاول مجددًا.',
        debug: {
          message: orderErr?.message || 'لم يتم إنشاء الطلب',
          code: orderErr?.code || '-',
          details: orderErr?.details || '-',
          hint: orderErr?.hint || '-',
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    orderId: order.id,
  });
}
