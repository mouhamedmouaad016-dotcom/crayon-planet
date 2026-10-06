// منطق صرف يُستخدم من webhook (ويُختبر بمعزل).

// في Postgres: 23505 = unique_violation. فقط هذا الخطأ يعني "الحدث مُسجَّل مسبقاً".
export function isDuplicateEventError(error) {
  return !!error && error.code === '23505';
}

// يقارن المبلغ المدفوع في حدث Chargily بمبلغ الطلب المخزّن من الخادم (order.total).
// - مبلغ مختلف أو عملة غير DZD: ok=false (تُحجز الدفعة ولا يُسلَّم شيء).
// - مبلغ غير موجود في الحدث: ok=true مع unverified=true (التوقيع موثَّق، لكن لا يمكن المقارنة).
export function checkAmount(order, checkout) {
  const raw = checkout?.amount;
  if (raw === undefined || raw === null || raw === '') return { ok: true, unverified: true };
  const paid = Number(raw);
  const expected = Number(order?.total);
  if (!Number.isFinite(paid) || !Number.isFinite(expected) || Math.abs(paid - expected) > 0.009) {
    return { ok: false, reason: 'amount_mismatch', expected, paid };
  }
  const currency = String(checkout?.currency || 'dzd').toLowerCase();
  if (currency !== 'dzd') return { ok: false, reason: 'currency_mismatch', currency };
  return { ok: true };
}
