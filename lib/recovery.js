import { UUID_RE, EMAIL_RE } from './validate';

export const MAX_DELIVERY_ATTEMPTS = 8;   // التسليم الأول + 7 إعادات كحد أقصى
export const MIN_GAP_MS = 2 * 60 * 1000;  // دقيقتان بين محاولتين

// استعادة رابط التحميل بطلب العميل. يلزم رقم الطلب + البريد المطابق له.
// لا يُعاد أي رابط في الاستجابة أبداً: يُرسل فقط إلى البريد المسجَّل في الطلب نفسه.
// النتيجة "accepted" نفسها تعود سواء وُجد الطلب أم لا، فلا يمكن استخدامها لتخمين الطلبات.
export async function requestResend({ admin, orderId, email, deliver, now = () => Date.now() }) {
  const cleanId = String(orderId || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!UUID_RE.test(cleanId) || !EMAIL_RE.test(cleanEmail)) return { kind: 'invalid' };

  const { data: order, error } = await admin.from('orders').select('*').eq('id', cleanId).maybeSingle();
  if (error) return { kind: 'error' };
  if (!order || String(order.customer_email || '').toLowerCase() !== cleanEmail) return { kind: 'accepted' };
  if (!['Paid', 'Delivered'].includes(order.status)) return { kind: 'accepted' };

  if (order.delivery_attempts === undefined) return { kind: 'unavailable' }; // migration_004 لم تُنفَّذ بعد
  if (Number(order.delivery_attempts) >= MAX_DELIVERY_ATTEMPTS) return { kind: 'limit' };
  const last = order.last_delivery_at ? Date.parse(order.last_delivery_at) : 0;
  if (now() - last < MIN_GAP_MS) return { kind: 'accepted' };

  try { await deliver(order); } catch (_) { return { kind: 'error' }; }
  return { kind: 'accepted' };
}
