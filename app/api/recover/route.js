import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import { requestResend } from '../../../lib/recovery';
import { makeDeliverer } from '../../../lib/deliveryServer';
import { rateLimit, clientIp } from '../../../lib/rateLimit';

export const dynamic = 'force-dynamic';

const MSG = {
  invalid: 'تحقق من رقم الطلب والبريد الإلكتروني.',
  accepted: 'إذا كانت البيانات مطابقة لطلب مدفوع، فسنرسل رابط التحميل إلى البريد المسجَّل في الطلب خلال دقائق. افحص أيضًا الرسائل غير الهامة.',
  limit: 'وصلت إلى الحد المسموح لإعادة الإرسال لهذا الطلب. تواصل معنا وسنساعدك.',
  unavailable: 'الخدمة غير متاحة مؤقتًا. تواصل معنا وسنرسل لك الرابط.',
  error: 'تعذّر تنفيذ الطلب الآن. حاول لاحقًا أو تواصل معنا.',
};
const STATUS = { invalid: 400, accepted: 200, limit: 429, unavailable: 503, error: 500 };

export async function POST(req) {
  if (!rateLimit(`recover:${clientIp(req.headers)}`, { limit: 5, windowMs: 10 * 60 * 1000 }).ok) {
    return NextResponse.json({ message: 'محاولات كثيرة. حاول بعد قليل.' }, { status: 429 });
  }
  let body;
  try { body = await req.json(); } catch (_) {
    return NextResponse.json({ message: MSG.invalid }, { status: 400 });
  }
  const admin = supabaseAdmin();
  const r = await requestResend({
    admin,
    orderId: body?.orderId,
    email: body?.email,
    deliver: makeDeliverer(admin),
  });
  // لا يُعاد أي رابط أبداً في الاستجابة: يُرسل إلى بريد الطلب فقط.
  return NextResponse.json({ message: MSG[r.kind] || MSG.error }, { status: STATUS[r.kind] || 500 });
}
