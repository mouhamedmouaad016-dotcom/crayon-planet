import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { verifySignature } from '../../../../lib/chargily';
import {
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
} from '../../../../lib/email';

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
    console.log('Duplicate webhook ignored:', eventId);

    return NextResponse.json({
      ok: true,
      duplicate: true,
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

    return NextResponse.json({
      ok: true,
      ignored: 'order_lookup_error',
    });
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
    email: order.customer_email,
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

      return NextResponse.json({
        ok: true,
        status: 'Paid',
        warning: 'order_update_failed',
      });
    }

    /*
     * Create temporary signed download URLs.
     */
    const links = [];

    for (const item of order.items || []) {
      const {
        data: product,
        error: productError,
      } = await admin
        .from('products')
        .select('file_path, name')
        .eq('id', item.product_id)
        .maybeSingle();

      if (productError) {
        console.error('Product lookup error:', {
          productId: item.product_id,
          message: productError.message,
        });

        continue;
      }

      if (!product?.file_path) {
        console.error('Product has no file_path:', {
          productId: item.product_id,
          productName: product?.name || item.name,
        });

        continue;
      }

      const {
        data: signed,
        error: signedError,
      } = await admin.storage
        .from('product-files')
        .createSignedUrl(
          product.file_path,
          60 * 60 * 48
        );

      if (signedError) {
        console.error('Signed URL creation failed:', {
          productId: item.product_id,
          productName: product.name,
          message: signedError.message,
        });

        continue;
      }

      if (!signed?.signedUrl) {
        console.error('No signed URL returned:', {
          productId: item.product_id,
          productName: product.name,
        });

        continue;
      }

      links.push({
        name: product.name,
        url: signed.signedUrl,
      });
    }

    console.log('DOWNLOAD LINKS RESULT:', {
      orderId,
      linksCount: links.length,
    });

    /*
     * Send the product email.
     */
    let delivered = false;

    if (links.length > 0) {
      try {
        const sent = await sendPaymentSuccessEmail(
          order,
          links
        );

        console.log('RESEND RESULT:', {
          skipped: !!sent?.skipped,
          hasError: !!sent?.error,
          hasData: !!sent?.data,
          errorMessage: sent?.error?.message || null,
        });

        delivered =
          !sent?.skipped &&
          !sent?.error;
      } catch (emailError) {
        console.error('Product email exception:', {
          name: emailError?.name,
          message: emailError?.message,
        });

        delivered = false;
      }
    } else {
      console.error(
        'NO DOWNLOAD LINKS CREATED - PRODUCT EMAIL NOT SENT'
      );
    }

    /*
     * Delivered only when the email was successfully sent.
     */
    const finalStatus = delivered
      ? 'Delivered'
      : 'Paid';

    const { error: finalStatusError } = await admin
      .from('orders')
      .update({
        status: finalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (finalStatusError) {
      console.error('Failed to update final order status:', {
        message: finalStatusError.message,
        code: finalStatusError.code,
      });
    }

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
