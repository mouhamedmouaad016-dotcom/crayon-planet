import { Resend } from 'resend';

// يُستدعى فقط من مسارات API على الخادم. RESEND_API_KEY سرّي ولا يصل
// إلى المتصفح أبدًا.
export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY);
}

function resend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = () => process.env.RESEND_FROM_EMAIL || 'CRAYON PLANET <orders@crayonplanetdz.xyz>';
const REPLY_TO = 'mouhamedmouaad016@gmail.com';

// resend.emails.send() لا يرمي استثناءً عند الفشل، بل يعيد { data, error }
// (توثيق Resend الرسمي)، لذلك نتحقق من error بأنفسنا في كل دالة، ونعيد شكلًا
// موحّدًا { skipped, error, data } يستخدمه المستدعي ليقرر هل اعتُبر
// "مُسلَّمًا" فعليًا أم لا.
export async function sendOrderConfirmationEmail(order) {
  if (!emailEnabled()) return { skipped: true };
  const { data, error } = await resend().emails.send({
    from: FROM(),
    to: order.customer_email,
    replyTo: REPLY_TO,
    subject: 'تم استلام طلبك في CRAYON PLANET',
    html: `
      <div dir="rtl" style="font-family:Tahoma,sans-serif;text-align:right">
        <h2>شكرًا لطلبك، ${order.customer_name || ''} 👋</h2>
        <p>استلمنا طلبك رقم <b>${order.id}</b> بإجمالي ${Number(order.total).toLocaleString('ar-DZ')} د.ج.</p>
        <p>بمجرد تأكيد الدفع فعليًا، سيصلك بريد آخر فيه رابط تحميل منتجك مباشرة.</p>
      </div>`,
  });
  if (error) console.error('Resend order-confirmation error:', error);
  return { skipped: false, error, data };
}

// links: [{ name, url }] — رابط تحميل موقّع ومؤقت لكل منتج مدفوع في الطلب.
export async function sendPaymentSuccessEmail(order, links) {
  if (!emailEnabled()) return { skipped: true };
  const buttons = (links || [])
    .map(
      (l) =>
        `<p><a href="${l.url}" style="background:#1e88e5;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;display:inline-block;margin:4px 0">تحميل: ${l.name}</a></p>`
    )
    .join('');
  const { data, error } = await resend().emails.send({
    from: FROM(),
    to: order.customer_email,
    replyTo: REPLY_TO,
    subject: 'تم تأكيد الدفع — منتجك جاهز للتحميل 🎉',
    html: `
      <div dir="rtl" style="font-family:Tahoma,sans-serif;text-align:right">
        <p>شكرًا لثقتك واختيارك CRAYON PLANET ❤️</p>
        <p>تم تأكيد عملية الشراء بنجاح.</p>
        ${buttons || '<p>تواصل معنا لاستلام منتجك.</p>'}
        <p style="color:#888;font-size:13px">رقم الطلب: ${order.id} — الروابط صالحة لمدة 48 ساعة.</p>
      </div>`,
  });
  if (error) console.error('Resend payment-success error:', error);
  return { skipped: false, error, data };
}

export async function sendPaymentFailedEmail(order) {
  if (!emailEnabled()) return { skipped: true };
  const { data, error } = await resend().emails.send({
    from: FROM(),
    to: order.customer_email,
    replyTo: REPLY_TO,
    subject: 'لم تكتمل عملية الدفع',
    html: `
      <div dir="rtl" style="font-family:Tahoma,sans-serif;text-align:right">
        <p>لم تكتمل عملية دفع طلبك رقم <b>${order.id}</b>. لم يُخصم أي مبلغ.</p>
        <p>يمكنك إعادة المحاولة في أي وقت من متجرنا.</p>
      </div>`,
  });
  if (error) console.error('Resend payment-failed error:', error);
  return { skipped: false, error, data };
}
