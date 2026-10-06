import RecoverForm from './RecoverForm';

export const metadata = {
  title: 'استعادة رابط التحميل',
  robots: { index: false, follow: false },
};

export default function RecoverPage() {
  return (
    <div className="py-6 max-w-md mx-auto">
      <h2 className="mb-2">استعادة رابط التحميل</h2>
      <p className="text-sm text-gray-600 mb-3">
        أدخل رقم الطلب والبريد الإلكتروني المستخدم عند الشراء، وسنرسل رابط تحميل جديدًا إلى بريدك.
        رقم الطلب موجود في صفحة تأكيد الدفع وفي رسالة التأكيد.
      </p>
      <RecoverForm />
    </div>
  );
}
