import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import { chargilyClient, chargilyEnabled, siteUrl } from '../../../lib/chargily';

// يستقبل orderId لطلب موجود بالفعل بحالة Pending (أنشأته صفحة Checkout عبر
// إدراج مباشر مسموح به في RLS)، وينشئ جلسة دفع Chargily حقيقية بنفس مبلغ
// الطلب بالضبط — لا نثق بأي مبلغ يُرسل من المتصفح.
export async function POST(req) {
  if (!chargilyEnabled()) {
    return NextResponse.json(
      { error: 'payment_not_configured', message: 'بوابة الدفع غير مفعّلة بعد. أضف CHARGILY_SECRET_KEY في Environment Variables.' },
      { status: 503 }
    );
  }
  const site = siteUrl();
  if (!site) {
    return NextResponse.json(
      { error: 'site_url_missing', message: 'أضف NEXT_PUBLIC_SITE_URL (رابط الموقع المنشور الحقيقي) في Environment Variables.' },
      { status: 503 }
    );
  }

  const { orderId } = await req.json().catch(() => ({}));
  if (!orderId) return NextResponse.json({ error: 'orderId مطلوب' }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: order, error } = await admin.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (error || !order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
  if (order.status !== 'Pending') {
    return NextResponse.json({ error: 'هذا الطلب لم يعد قابلًا للدفع (الحالة الحالية: ' + order.status + ')' }, { status: 409 });
  }
  if (!order.total || Number(order.total) <= 0) {
    return NextResponse.json({ error: 'قيمة الطلب غير صالحة' }, { status: 400 });
  }

  try {
    const client = chargilyClient();
    // نفس نقطة الوصول لكل من النجاح والفشل والإلغاء: صفحة /checkout/done لا
    // تعتبر الطلب مدفوعًا إلا بعد أن تتحقق من الحالة الحقيقية عبر
    // /api/orders/[id]/status، وهذه بدورها لا تتغير إلا من الـ Webhook.
    const returnUrl = `${site}/checkout/done?order=${order.id}`;
    const checkout = await client.createCheckout({
      amount: Number(order.total),
      currency: 'dzd',
      success_url: returnUrl,
      failure_url: returnUrl,
      webhook_endpoint: `${site}/api/webhooks/chargily`,
      locale: 'ar',
      metadata: { order_id: order.id },
    });
const verifiedCheckout = await client.getCheckout(checkout.id);

console.log('CHARGILY CHECKOUT STATUS:', {
  id: checkout.id,
  status: verifiedCheckout?.status ?? 'unknown',
});
    await admin.from('orders').update({ payment_ref: checkout.id }).eq('id', order.id);

    return NextResponse.json({ checkout_url: checkout.checkout_url });
  } catch (e) {
    console.error('Chargily createCheckout failed:', e);
    return NextResponse.json({ error: 'تعذّر إنشاء عملية الدفع. حاول مجددًا لاحقًا.' }, { status: 502 });
  }
}
