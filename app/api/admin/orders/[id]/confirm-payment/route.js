import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer, supabaseAdmin } from '../../../../../../lib/supabaseServer';
import { makeDeliverer } from '../../../../../../lib/deliveryServer';
import { UUID_RE } from '../../../../../../lib/validate';

export const dynamic = 'force-dynamic';

// Manual confirmation by Admin: لا ينشئ دفعة جديدة ولا يزوّر Webhook.
export async function POST(req, { params }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: adminRow } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!adminRow) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  let body = {};
  try { body = await req.json(); } catch (_) {}
  const checkoutId = typeof body?.checkout_id === 'string' ? body.checkout_id.trim().slice(0, 100) : '';

  const admin = supabaseAdmin();
  const { data: order, error: lookupError } = await admin
    .from('orders').select('*').eq('id', params.id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (order.status !== 'Pending') {
    return NextResponse.json({ error: 'not_pending', status: order.status }, { status: 409 });
  }

  console.log('MANUAL PAYMENT CONFIRM START', { orderId: order.id, adminId: user.id });

  const downloadToken = crypto.randomUUID();
  const paymentRef = checkoutId || `manual-admin:${user.id}`;

  // تحديث ذري: ينجح مرة واحدة فقط لطلب ما زال Pending.
  const { data: rows, error: paidError } = await admin
    .from('orders')
    .update({
      status: 'Paid',
      payment_ref: paymentRef,
      download_token: downloadToken,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .eq('status', 'Pending')
    .select('id');

  if (paidError) {
    console.error('MANUAL PAYMENT CONFIRM FAILED:', { orderId: order.id, message: paidError.message });
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'already_processed' }, { status: 409 });
  }

  console.log('MANUAL PAYMENT CONFIRM SUCCESS: order is Paid', { orderId: order.id, adminId: user.id });

  let result = null;
  let errMsg = null;
  try {
    result = await makeDeliverer(admin)({
      ...order,
      status: 'Paid',
      payment_ref: paymentRef,
      download_token: downloadToken,
    });
  } catch (e) {
    errMsg = e?.message || 'delivery_exception';
  }

  const complete = !!result?.complete;
  if (complete) {
    await admin.from('orders')
      .update({ status: 'Delivered', updated_at: new Date().toISOString() })
      .eq('id', order.id).eq('status', 'Paid');
    console.log('DELIVERY SUCCESS:', { orderId: order.id });
  } else {
    errMsg = errMsg || result?.emailError || 'incomplete_delivery';
    await admin.from('orders').update({ delivery_error: String(errMsg).slice(0, 300) }).eq('id', order.id);
    console.error('DELIVERY FAILED: order stays Paid for resend', { orderId: order.id, message: errMsg });
  }

  return NextResponse.json({
    ok: true,
    status: complete ? 'Delivered' : 'Paid',
    complete,
    missing: (result?.missing || []).map((m) => m.name),
    error: errMsg,
  });
}
