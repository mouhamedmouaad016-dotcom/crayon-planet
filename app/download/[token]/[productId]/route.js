import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { UUID_RE } from '../../../../lib/validate';

export const dynamic = 'force-dynamic';

const WINDOW_MS = 48 * 60 * 60 * 1000; // صلاحية الرابط: 48 ساعة من آخر تسليم
const REDIRECT_SECONDS = 60 * 60; // مدة الرابط ساعة واحدة

function notFound() {
  return new NextResponse('الرابط غير صالح أو منتهي الصلاحية.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function GET(_req, { params }) {
  const { token, productId } = await params;
  if (!UUID_RE.test(token || '') || !UUID_RE.test(productId || '')) return notFound();

  const admin = supabaseAdmin();
  const { data: order, error } = await admin
    .from('orders')
    .select('id, status, items, last_delivery_at, delivered_at')
    .eq('download_token', token)
    .maybeSingle();

  if (error || !order) return notFound();
  if (!['Paid', 'Delivered'].includes(order.status)) return notFound();

  const owns = (order.items || []).some(
    (i) => String(i?.product_id || '').toLowerCase() === productId.toLowerCase()
  );
  if (!owns) return notFound();

  const base = order.last_delivery_at || order.delivered_at;
  const t = base ? new Date(base).getTime() : NaN;
  if (!Number.isFinite(t) || Date.now() - t > WINDOW_MS) return notFound();

  const { data: product } = await admin
    .from('products')
    .select('file_path')
    .eq('id', productId)
    .maybeSingle();
  if (!product?.file_path) return notFound();

  const { data: signed, error: signErr } = await admin.storage
    .from('product-files')
    .createSignedUrl(product.file_path, REDIRECT_SECONDS);
  if (signErr || !signed?.signedUrl) {
    console.error('DOWNLOAD SIGN FAILED:', { orderId: order.id, message: signErr?.message });
    return notFound();
  }

  console.log('DOWNLOAD OK:', { orderId: order.id });
  const res = NextResponse.redirect(signed.signedUrl, 302);
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
                            }
