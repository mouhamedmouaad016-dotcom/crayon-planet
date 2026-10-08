import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';

// اختبار تشخيصي مؤقت: نص خالص بلا روابط. للمشرف فقط. احذفه بعد الاختبار.
export async function POST(req) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: adminRow } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!adminRow) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body = {};
  try { body = await req.json(); } catch (_) {}
  const to = typeof body?.to === 'string' ? body.to.trim() : '';
  if (!/^[^\s@]+@gmail\.com$/i.test(to)) {
    return NextResponse.json({ error: 'gmail_address_required' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: 'CRAYON PLANET — اختبار البريد',
        text: 'هذه رسالة اختبار من متجر CRAYON PLANET للتأكد من وصول البريد الإلكتروني.',
      }),
    });
    const j = await res.json().catch(() => ({}));
    console.log('TEST EMAIL RESULT:', { status: res.status, id: j?.id || null, error: j?.message || null });
    return NextResponse.json({ ok: res.ok, id: j?.id || null, error: j?.message || null });
  } catch (e) {
    console.error('TEST EMAIL FAILED:', { message: e?.message });
    return NextResponse.json({ error: 'send_failed' }, { status: 500 });
  }
                              }
