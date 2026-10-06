// تنظيف نص الوصف عند العرض: يزيل رمز الاستبدال التالف (U+FFFD) وأي سطر دخيل يبدأ بـ "Lughati".
// الحل الدائم هو تنظيف القيمة في قاعدة البيانات (supabase/migration_005)، وهذه شبكة أمان للعرض.
export function cleanText(s) {
  return String(s ?? '')
    .replace(/\uFFFD/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/^[ \t]*Lughati\b.*$/gim, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
