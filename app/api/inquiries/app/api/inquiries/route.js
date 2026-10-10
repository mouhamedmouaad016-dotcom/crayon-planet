import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';

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

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
    ) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني غير صحيح.' },
        { status: 400 }
      );
    }

    if (orderId && !/^[0-9a-f-]{36}$/i.test(orderId)) {
      return NextResponse.json(
        { error: 'رقم الطلب غير صحيح.' },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();

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
