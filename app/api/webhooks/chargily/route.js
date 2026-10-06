import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { verifySignature } from '../../../../lib/chargily';
import { sendPaymentFailedEmail } from '../../../../lib/email';
import { makeDeliverer } from '../../../../lib/deliveryServer';
import { checkAmount, isDuplicateEventError } from '../../../../lib/payment';

export async function POST(req) {
  const secret = process.env.CHARGILY_SECRET_KEY;

  if (!secret) {
    console.error('CHARGILY_SECRET_KEY is missing');
    return NextResponse.json(
      { error: 'not_configured' },
      { status: 503 }
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get('signature') || '';

  let valid = false;

  try {
    valid =
      !!signature &&
      verifySignature(rawBody, signature, secret);
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    valid = false;
  }

  if (!valid) {
    console.error('Invalid Chargily webhook signature');
    return NextResponse.json(
      { error: 'invalid_signature' },
      { status: 403 }
    );
  }

  let event;

  try {
    event = JSON.parse(rawBody);
  } catch (error) {
    console.error('Invalid webhook JSON:', error);
    return NextResponse.json(
      { error: 'invalid_json' },
      { status: 400 }
    );
  }

  console.log('CHARGILY WEBHOOK EVENT:', {
    type: event?.type,
    id: event?.id,
    checkoutId: event?.data?.id,
  });

  const admin = supabaseAdmin();

  /*
   * Prevent duplicate webhook processing.
   */
  const eventId =
    event?.id ||
    `${event?.data?.id || 'unknown'}:${event?.type || 'unknown'}`;

  const { error: duplicateError } = await admin
    .from('webhook_events')
    .insert({
      id: eventId,
      event_type: event?.type || 'unknown',
      payload: event,
    });

  if (duplicateError) {
    if (isDuplicateEventError(duplicateError)) {
      console.log('Duplicate webhook ignored:', eventId);

      return NextResponse.json({
        ok: true,
        duplicate: true,
      });
    }

    // خطأ قاعدة بيانات حقيقي وليس تكراراً: نسجّله بوضوح ونتابع المعالجة،
    // فحماية عدم التكرار تبقى قائمة عبر فحص حالة الطلب أدناه.
    console.error('webhook_events insert failed (NOT a duplicate):', {
      code: duplicateError.code,
      message: duplicateError.message,
    });
  }

  const checkout = event?.data;

  /*
   * The order ID is stored in Chargily metadata.
   */
  const orderId = checkout?.metadata?.order_id;

  console.log('WEBHOOK ORDER:', {
    orderId: orderId || null,
    eventType: event?.type || null,
  });

  if (!orderId) {
    console.error('No order_id found in Chargily metadata');

    return NextResponse.json({
      ok: true,
      ignored: 'no_order_id',
    });
  }

  /*
   * Load the order.
   */
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) {
  console.error('Order lookup error:', {
    message: orderError.message,
    code: orderError.code,
  });

  // Remove the webhook event so a transient DB failure can be retried safely.
  await admin
    .from('webhook_events')
    .delete()
    .eq('id', eventId);

  return NextResponse.json(
    {
      ok: false,
      error: 'order_lookup_failed',
    },
    { status: 500 }
  );
  }

  if (!order) {
    console.error('Order not found:', orderId);

    return NextResponse.json({
      ok: true,
      ignored: 'order_not_found',
    });
  }

  console.log('ORDER FOUND:', {
    orderId: order.id,
    status: order.status,
  });

  /*
   * Do not process an already completed/failed/cancelled order again.
   */
  if (
    ['Paid', 'Delivered', 'Failed', 'Cancelled'].includes(
      order.status
    )
  ) {
    return NextResponse.json({
      ok: true,
      already: order.status,
    });
  }

  /*
   * Successful payment.
   */
  if (event.type === 'checkout.paid') {
    const amountCheck = checkAmount(order, checkout);

    if (!amountCheck.ok) {
      console.error('PAYMENT HELD - amount/currency mismatch:', {
        orderId,
        reason: amountCheck.reason,
        expected: amountCheck.expected ?? null,
        paid: amountCheck.paid ?? null,
      });

      // العمود payment_flag يأتي من migration_004؛ غيابه لا يؤثر على الحجز.
      await admin.from('orders').update({ payment_flag: amountCheck.reason }).eq('id', orderId);

      return NextResponse.json({ ok: true, held: amountCheck.reason });
    }

    if (amountCheck.unverified) {
      console.warn('Chargily event has no amount - proceeding (signature verified):', { orderId });
    }

    const downloadToken = crypto.randomUUID();

    /*
     * Mark the order as Paid first.
     */
    const { error: paidError } = await admin
  .from('orders')
  .update({
    status: 'Paid',
    payment_ref: checkout?.id || null,
    download_token: downloadToken,
    updated_at: new Date().toISOString(),
  })
  .eq('id', orderId);

if (paidError) {
  console.error('Failed to update order to Paid:', {
    message: paidError.message,
    code: paidError.code,
  });

  // Remove the webhook event so a transient DB failure can be retried safely.
  await admin
    .from('webhook_events')
    .delete()
    .eq('id', eventId);

  return NextResponse.json(
    {
      ok: false,
      error: 'order_update_failed',
    },
    { status: 500 }
  );
}
    

    /*
     * Create signed download URLs for ALL ordered products, send the email,
     * and set Delivered only if every link was created AND the email was sent.
     * Otherwise the order stays Paid and can be re-sent (admin / customer recovery).
     */
    const result = await makeDeliverer(admin)(order);
    const delivered = result.complete;
    const finalStatus = delivered ? 'Delivered' : 'Paid';

    /*
     * Update customer record.
     */
    const { error: customerError } = await admin
      .from('customers')
      .upsert(
        {
          email: order.customer_email,
          name: order.customer_name,
        },
        {
          onConflict: 'email',
        }
      );

    if (customerError) {
      console.error('Customer update error:', {
        message: customerError.message,
        code: customerError.code,
      });
    }

    console.log('PAYMENT PROCESSING FINISHED:', {
      orderId,
      status: finalStatus,
      emailSent: delivered,
    });

    return NextResponse.json({
      ok: true,
      status: finalStatus,
    });
  }

  /*
   * Failed payment.
   */
  if (event.type === 'checkout.failed') {
    await admin
      .from('orders')
      .update({
        status: 'Failed',
        payment_ref: checkout?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    try {
      await sendPaymentFailedEmail(order);
    } catch (error) {
      console.error('Failed payment email error:', {
        message: error?.message,
      });
    }

    return NextResponse.json({
      ok: true,
      status: 'Failed',
    });
  }

  /*
   * Cancelled or expired payment.
   */
  if (
    event.type === 'checkout.canceled' ||
    event.type === 'checkout.expired'
  ) {
    await admin
      .from('orders')
      .update({
        status: 'Cancelled',
        payment_ref: checkout?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    return NextResponse.json({
      ok: true,
      status: 'Cancelled',
    });
  }

  console.log('Unhandled Chargily event:', event.type);

  return NextResponse.json({
    ok: true,
    ignored: event.type,
  });
    }
