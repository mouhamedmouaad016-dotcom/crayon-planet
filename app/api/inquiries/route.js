import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req) {
  try {
    const body = await req.json();

    const message =
      typeof body.message === 'string' ? body.message.trim() : '';
    const email =
      typeof body.email === 'string' ? body.email.trim() : '';
    const orderId =
      typeof body.orderId === 'string' ? body.orderId.trim() : '';

    if (message.length < 3 || message.length > 2000) {
      return NextResponse.json(
        { error: 'يجب أن تتراوح الرسالة بين 3 و2000 حرف.' },
        { status: 400 }
      );
    }

    if (email && (email.length > 254 || !EMAIL_RE.test(email))) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني غير صحيح.' },
        { status: 400 }
      );
    }

    if (orderId && !UUID_RE.test(orderId)) {
      return NextResponse.json(
        { error: 'رقم الطلب غير صحيح.' },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();

    if (orderId) {
      const { data: order, error: orderError } = await admin
        .from('orders')
        .select('id, customer_email')
        .eq('id', orderId)
        .maybeSingle();

      if (orderError) {
        return NextResponse.json(
          { error: 'تعذّر التحقق من الطلب.' },
          { status: 500 }
        );
      }

      if (!order) {
        return NextResponse.json(
          { error: 'لم يتم العثور على الطلب.' },
          { status: 404 }
        );
      }

      if (
        email &&
        order.customer_email.toLowerCase() !== email.toLowerCase()
      ) {
        return NextResponse.json(
          { error: 'البريد الإلكتروني لا يطابق البريد المسجل للطلب.' },
          { status: 403 }
        );
      }
    }

    const { error } = await admin
      .from('customer_inquiries')
      .insert({
        message,
        customer_email: email || null,
        order_id: orderId || null,
      });

    if (error) {
      return NextResponse.json(
        { error: 'تعذّر حفظ الاستفسار. حاول مرة أخرى لاحقًا.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'تعذّر معالجة الاستفسار.' },
      { status: 400 }
    );
  }
          }
