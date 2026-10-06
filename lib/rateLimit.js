// حد معدل بسيط داخل الذاكرة (لكل نسخة خادم). يخفف إساءة استخدام صفحة استعادة الرابط.
const buckets = new Map();

export function rateLimit(key, { limit, windowMs }, now = Date.now()) {
  const b = buckets.get(key);
  if (!b || now - b.start >= windowMs) {
    buckets.set(key, { start: now, count: 1 });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (now - v.start >= windowMs) buckets.delete(k);
    return { ok: true };
  }
  b.count += 1;
  return { ok: b.count <= limit };
}

export function clientIp(headers) {
  const xf = headers.get('x-forwarded-for') || '';
  return xf.split(',')[0].trim() || headers.get('x-real-ip') || 'unknown';
}
