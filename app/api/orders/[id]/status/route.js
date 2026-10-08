import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const admin = supabaseAdmin();

  const { data: order, error } = await admin
    .from('orders')
    .select('id,status,download_token,items')
    .eq('id', params.id)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json(
      { error: 'not_found' },
      { status: 404 }
    );
  }

  // لا نكشف روابط التحميل قبل تأكيد الدفع
  if (!['Paid', 'Delivered'].includes(order.status)) {
    return NextResponse.json({
      status: order.status,
      downloads: [],
    });
  }

  const downloads = [];

  for (const item of Array.isArray(order.items) ? order.items : []) {
    if (!item?.product_id || !order.download_token) continue;

    downloads.push({
      name: item.name || 'المنتج',
      url:
        `/download/${encodeURIComponent(order.download_token)}` +
        `/${encodeURIComponent(item.product_id)}`,
    });
  }

  return NextResponse.json({
    status: order.status,
    downloads,
  });
}
