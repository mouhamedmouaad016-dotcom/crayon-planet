import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { verifySignature } from '../../../../lib/chargily';
import { sendPaymentSuccessEmail, sendPaymentFailedEmail } from '../../../../lib/email';

// هذا المسار هو المصدر الوحيد المسموح له بتحويل طلب إلى Paid. لا صفحة في
// الواجهة الأمامية تستطيع فعل ذلك مهما فعل الزائر في متصفحه.
export async function POST(req) {
  const secret = process.env.CHARGILY_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  // يجب التحقق من التوقيع على النص الخام للجسم بالضبط كما وصل، قبل أي
  // JSON.parse — وإلا قد يفشل التحقق أو يصبح قابلًا للالتفاف عليه.
  const rawBody = await req.text();
  const signature = req.headers.get('signature') || '';

  let valid = false;
  try {
    valid = signature && verifySignature(rawBody, signature, secret);
  } catch (_) {
    valid = false;
  }
  if (!valid) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 403 });
  }

  const event = JSON.parse(rawBody);
  const admin = supabaseAdmin();

  // منع معالجة نفس الحدث مرتين (Chargily قد يعيد إرسال نفس الـ Webhook).
  const eventId = event.id || `${event.data?.id}:${event.type}`;
  const { error: dupErr } = await admin.from('webhook_events').insert({
    id: eventId,
    event_type: event.type,
    payload: event,
  });
  if (dupErr) {
    // مفتاح مكرر primary key = تمت معالجة هذا الحدث من قبل، تجاهله بأمان.
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const checkout = event.data;
  const orderId = checkout?.metadata?.order_id;
  if (!orderId) return NextResponse.json({ ok: true, ignored: 'no_order_id' });

  const { data: order } = await admin.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (!order) return NextResponse.json({ ok: true, ignored: 'order_not_found' });

  // لا نعالج طلبًا وصل بالفعل إلى حالة نهائية (يحمي أيضًا من إعادة إرسال
  // الحدث بعد إزالة المدخل من webhook_events يدويًا).
  if (['Paid', 'Delivered', 'Failed', 'Cancelled'].includes(order.status)) {
    return NextResponse.json({ ok: true, already: order.status });
  }

  if (event.type === 'checkout.paid') {
    const downloadToken = crypto.randomUUID();
    await admin.from('orders').update({
      status: 'Paid',
      payment_ref: checkout.id,
      download_token: downloadToken,
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);

    // إنشاء رابط تحميل موقَّع ومؤقت لكل منتج مدفوع في الطلب — الملف الأصلي
    // يبقى في bucket خاص ولا يُكشف رابطه الحقيقي أبدًا.
    const links = [];
    for (const item of order.items || []) {
      const { data: product } = await admin.from('products').select('file_path, name').eq('id', item.product_id).maybeSingle();
      if (!product?.file_path) continue;
      const { data: signed } = await admin.storage
        .from('product-files')
        .createSignedUrl(product.file_path, 60 * 60 * 48); // صالح 48 ساعة
      if (signed?.signedUrl) links.push({ name: product.name, url: signed.signedUrl });
    }

    let delivered = false;
    if (links.length) {
      const sent = await sendPaymentSuccessEmail(order, links);
      // delivered فقط إذا كان Resend مفعّلًا فعليًا ونجح الإرسال بلا خطأ.
      delivered = !sent?.skipped && !sent?.error;
    }

    await admin.from('orders').update({
      status: delivered ? 'Delivered' : 'Paid',
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);

    // تحديث/إنشاء سجل العميل الحقيقي (CRM)، بلا بيانات وهمية.
    await admin.from('customers').upsert(
      { email: order.customer_email, name: order.customer_name },
      { onConflict: 'email' }
    );

    return NextResponse.json({ ok: true, status: 'Delivered' });
  }

  if (event.type === 'checkout.failed') {
    await admin.from('orders').update({ status: 'Failed', payment_ref: checkout.id }).eq('id', orderId);
    await sendPaymentFailedEmail(order);
    return NextResponse.json({ ok: true, status: 'Failed' });
  }

  if (event.type === 'checkout.canceled' || event.type === 'checkout.expired') {
    await admin.from('orders').update({ status: 'Cancelled', payment_ref: checkout.id }).eq('id', orderId);
    return NextResponse.json({ ok: true, status: 'Cancelled' });
  }

  return NextResponse.json({ ok: true, ignored: event.type });
}
