import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';

const TOKEN_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PRODUCT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SIGNED_URL_SECONDS = 60;

export async function GET(req, { params }) {
  const token = String(params?.token || '').trim();
  const productId = String(params?.productId || '').trim();

  if (!TOKEN_RE.test(token) || !PRODUCT_ID_RE.test(productId)) {
    return new NextResponse('رابط التحميل غير صالح.', { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id,status,download_token,delivered_at,created_at,items')
    .eq('download_token', token)
    .maybeSingle();

  if (orderError || !order) {
    return new NextResponse('رابط التحميل غير صالح أو منتهي.', { status: 404 });
  }

  if (!['Paid', 'Delivered'].includes(order.status)) {
    return new NextResponse('هذا الطلب غير متاح للتحميل.', { status: 403 });
  }

  const items = Array.isArray(order.items) ? order.items : [];

  const purchased = items.some(
    (item) => String(item?.product_id || '') === productId
  );

  if (!purchased) {
    return new NextResponse('هذا المنتج غير موجود في هذا الطلب.', {
      status: 403,
    });
  }

  const deliveredAt = order.delivered_at
    ? new Date(order.delivered_at).getTime()
    : new Date(order.created_at).getTime();

  if (!Number.isFinite(deliveredAt)) {
    return new NextResponse('تعذر التحقق من صلاحية الرابط.', {
      status: 500,
    });
  }

  const expiresAt = deliveredAt + 48 * 60 * 60 * 1000;

  if (Date.now() > expiresAt) {
    return new NextResponse(
      'انتهت صلاحية رابط التحميل. يمكنك طلب إعادة إرسال الرابط من المتجر.',
      { status: 410 }
    );
  }

  const { data: product, error: productError } = await admin
    .from('products')
    .select('id,name,file_path')
    .eq('id', productId)
    .maybeSingle();

  if (productError || !product?.file_path) {
    return new NextResponse('ملف المنتج غير متوفر حاليًا.', {
      status: 404,
    });
  }

  const { data: signed, error: signedError } = await admin
    .storage
    .from('product-files')
    .createSignedUrl(product.file_path, SIGNED_URL_SECONDS);

  if (signedError || !signed?.signedUrl) {
    console.error('DOWNLOAD SIGNED URL FAILED:', {
      orderId: order.id,
      productId,
      message: signedError?.message,
    });

    return new NextResponse('تعذر تجهيز الملف للتحميل.', {
      status: 500,
    });
  }

  const response = NextResponse.redirect(signed.signedUrl, 302);

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Referrer-Policy', 'no-referrer');

  return response;
      }
