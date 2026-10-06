import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '../../../../../../lib/supabaseServer';
import { makeDeliverer } from '../../../../../../lib/deliveryServer';
import { UUID_RE } from '../../../../../../lib/validate';

export const dynamic = 'force-dynamic';

// إعادة إرسال رابط التحميل من لوحة الإدارة. يتحقق من الخادم أن المستدعي مدير فعلاً (جدول admins).
export async function POST(_req, { params }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: adminRow } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!adminRow) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: order } = await admin.from('orders').select('*').eq('id', params.id).maybeSingle();
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!['Paid', 'Delivered'].includes(order.status)) {
    return NextResponse.json({ error: 'not_paid' }, { status: 409 });
  }

  const r = await makeDeliverer(admin)(order);
  return NextResponse.json({
    ok: true,
    complete: r.complete,
    missing: (r.missing || []).map((m) => m.name),
    error: r.emailError,
  });
}
