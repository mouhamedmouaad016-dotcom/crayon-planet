import { sendPaymentSuccessEmail } from './email';
import { deliverPaidOrder } from './delivery';

// يربط منطق التسليم الصرف ببريد Resend. لا يغيّر المرسل ولا REPLY_TO (يبقيان في lib/email.js).
export function makeDeliverer(admin) {
  return (order) =>
    deliverPaidOrder({
      admin,
      order,
      sendEmail: async (o, links, opts) => {
        const sent = await sendPaymentSuccessEmail(o, links, opts);
        console.log('RESEND RESULT:', {
          skipped: !!sent?.skipped,
          hasError: !!sent?.error,
          hasData: !!sent?.data,
          errorMessage: sent?.error?.message || null,
        });
        return sent;
      },
    });
}
