export const metadata = { title: 'الأسئلة الشائعة', description: 'إجابات عن أكثر الأسئلة شيوعًا حول منتجات CRAYON PLANET الرقمية، الدفع، والتحميل.' };

const FAQ = [
  ['ما نوع المنتجات؟', 'منتجات رقمية قابلة للتحميل والطباعة، ولا يوجد شحن.'],
  ['كيف أستلم المنتج؟', 'يصلك رابط تحميل آمن على بريدك بعد تأكيد الدفع.'],
  ['ما العملة وطرق الدفع؟', 'الدينار الجزائري، عبر CIB والبطاقة الذهبية عند تفعيل الدفع.'],
  ['هل يمكن استرجاع المنتج؟', 'راجع سياسة الاسترجاع.'],
];

export default function FaqPage() {
  return (
    <div className="py-6">
      <h2 className="mb-3">الأسئلة الشائعة</h2>
      <div className="space-y-2">
        {FAQ.map(([q, a]) => (
          <details key={q} className="border-2 border-brand-line rounded-xl p-3">
            <summary className="font-bold cursor-pointer">{q}</summary>
            <p className="mt-2">{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
