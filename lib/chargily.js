import { ChargilyClient, verifySignature } from '@chargily/chargily-pay';

// هذا الملف يُستدعى فقط من مسارات API على الخادم (app/api/**/route.js).
// CHARGILY_SECRET_KEY لا يصل أبدًا إلى المتصفح.

export function chargilyEnabled() {
  return Boolean(process.env.CHARGILY_SECRET_KEY);
}

export function chargilyClient() {
  if (!chargilyEnabled()) {
    throw new Error('CHARGILY_SECRET_KEY غير مضبوط في متغيرات البيئة.');
  }
  return new ChargilyClient({
    api_key: process.env.CHARGILY_SECRET_KEY,
    mode: process.env.CHARGILY_MODE === 'live' ? 'live' : 'test',
  });
}

export function siteUrl() {
  // يجب أن يكون رابط الموقع المنشور الفعلي، وليس localhost، حتى تعمل
  // success_url وfailure_url وwebhook_endpoint بشكل صحيح مع Chargily.
  return (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
}

// verifySignature(rawBodyString, signatureHeader, secretKey) -> boolean
// المُصدَّر من مكتبة Chargily الرسمية نفسها؛ نعيد تصديره هنا فقط لإبقاء كل
// استيرادات Chargily في مكان واحد.
export { verifySignature };
