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
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('signature') || '';

  let valid = false;
  try {
    valid = !!signature && verifySignature(rawBody, signature, secret);
  } catch (error) {
    console.error('Webhook signature verification error:', error?.message);
    valid = false;
  }
  if (!valid) {
    console.error('WEBHOOK REJECTED: invalid signature');
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (error) {
    console.error('Invalid webhook JSON:', error?.message);
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  console.log('WEBHOOK RECEIVED:', {
    type: event?.type,
    id: event?.id,
    checkoutId: event?.data?.id,
  });

  const admin = supabaseAdmin();

  // Prevent duplicate webhook processing.
  const eventId =
    event?.id || `${event?.data?.id || 'unknown'}:${event?.type || 'unknown'}`;

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
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error('webhook_events insert failed (NOT a duplicate):', {
      code: duplicateError.code,
      message: duplicateError.message,
    });
    // 500 so Chargily retries later.
    return NextResponse.json(
      { ok: false, error: 'webhook_event_record_failed' },
      { status: 500 }
    );
  }

  const checkout = event?.data;
  const orderId = checkout?.metadata?.order_id;

  if (!orderId) {
    console.error('Webhook missing order_id');
    return NextResponse.json(
      { ok: false, error: 'missing_order_id' },
      { status: 400 }
    );
  }

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
    await admin.from('webhook_events').delete().eq('id', eventId);
    return NextResponse.json(
      { ok: false, error: 'order_lookup_failed' },
      { status: 500 }
    );
  }

  if (!order) {
    console.error('Order not found:', orderId);
    return NextResponse.json({ ok: true, ignored: 'order_not_found' });
  }

  console.log('ORDER FOUND:', { orderId: order.id, status: order.status });

  if (['Paid', 'Delivered', 'Failed', 'Cancelled'].includes(order.status)) {
    return NextResponse.json({ ok: true, already: order.status });
  }

  // ---- Successful payment ----
  if (event.type === 'checkout.paid') {
    const amountCheck = checkAmount(order, checkout);

    if (!amountCheck.ok) {
      console.error('PAYMENT HELD - amount/currency mismatch:', {
        orderId,
        reason: amountCheck.reason,
        expected: amountCheck.expected ?? null,
        paid: amountCheck.paid ?? null,
      });
      await admin
        .from('orders')
        .update({ payment_flag: amountCheck.reason })
        .eq('id', orderId);
      return NextResponse.json({ ok: true, held: amountCheck.reason });
    }

    if (amountCheck.unverified) {
      console.warn('Chargily event has no amount - proceeding (signature verified):', { orderId });
    }

    const downloadToken = crypto.randomUUID();

    // Mark Paid first, atomically (only if still Pending).
    const { data: updatedRows, error: paidError } = await admin
      .from('orders')
      .update({
        status: 'Paid',
        payment_ref: checkout?.id || null,
        download_token: downloadToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'Pending')
      .select('id');

    if (paidError) {
      console.error('Failed to update order to Paid:', {
        message: paidError.message,
        code: paidError.code,
      });
      await admin.from('webhook_events').delete().eq('id', eventId);
      return NextResponse.json(
        { ok: false, error: 'order_update_failed' },
        { status: 500 }
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.log('Order no longer Pending, skipping:', orderId);
      return NextResponse.json({ ok: true, already: 'processed' });
    }

    console.log('WEBHOOK PAYMENT PROCESSED:', { orderId });

    // Delivery: failure must leave the order Paid, never Pending.
    let delivered = false;
    try {
      const freshOrder = {
        ...order,
        status: 'Paid',
        payment_ref: checkout?.id || null,
        download_token: downloadToken,
      };
      const result = await makeDeliverer(admin)(freshOrder);
      delivered = !!result?.complete;
    } catch (error) {
      console.error('DELIVERY FAILED:', { orderId, message: error?.message });
    }

    if (delivered) {
      const { error: deliveredError } = await admin
        .from('orders')
        .update({ status: 'Delivered', updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('status', 'Paid');
      if (deliveredError) {
        console.error('Failed to set Delivered:', { message: deliveredError.message });
      }
      console.log('DELIVERY SUCCESS:', { orderId });
    } else {
      console.error('DELIVERY FAILED: order stays Paid for resend', { orderId });
    }

    const { error: customerError } = await admin
      .from('customers')
      .upsert(
        { email: order.customer_email, name: order.customer_name },
        { onConflict: 'email' }
      );
    if (customerError) {
      console.error('Customer update error:', {
        message: customerError.message,
        code: customerError.code,
      });
    }

    return NextResponse.json({
      ok: true,
      status: delivered ? 'Delivered' : 'Paid',
    });
  }

  // ---- Failed payment ----
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
      console.error('Failed payment email error:', { message: error?.message });
    }
    return NextResponse.json({ ok: true, status: 'Failed' });
  }

  // ---- Cancelled / expired ----
  if (event.type === 'checkout.canceled' || event.type === 'checkout.expired') {
    await admin
      .from('orders')
      .update({
        status: 'Cancelled',
        payment_ref: checkout?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
    return NextResponse.json({ ok: true, status: 'Cancelled' });
  }

  console.log('Unhandled Chargily event:', event.type);
  return NextResponse.json({ ok: true, ignored: event.type });
        }
