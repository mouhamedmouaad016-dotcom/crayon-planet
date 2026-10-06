// منطق التسليم الصرف (بلا Next أو Resend)، يُستخدم من webhook ومن استعادة الرابط ويُختبر بمعزل.
export const SIGNED_URL_SECONDS = 60 * 60 * 48; // 48 ساعة، كما كان.

export async function buildDownloadLinks(admin, order, log = console) {
  const links = [];
  const missing = [];
  for (const item of order.items || []) {
    const itemName = item?.name || 'منتج';
    try {
      const { data: product, error } = await admin
        .from('products').select('file_path, name').eq('id', item.product_id).maybeSingle();
      if (error || !product) {
        log.error('Product lookup failed:', { productId: item.product_id, message: error?.message });
        missing.push({ name: itemName, reason: 'product_lookup' }); continue;
      }
      if (!product.file_path) {
        log.error('Product has no file_path:', { productId: item.product_id, productName: product.name || itemName });
        missing.push({ name: product.name || itemName, reason: 'no_file' }); continue;
      }
      const { data: signed, error: signErr } = await admin.storage
        .from('product-files').createSignedUrl(product.file_path, SIGNED_URL_SECONDS);
      if (signErr || !signed?.signedUrl) {
        log.error('Signed URL creation failed:', { productId: item.product_id, message: signErr?.message });
        missing.push({ name: product.name || itemName, reason: 'sign_failed' }); continue;
      }
      links.push({ name: product.name || itemName, url: signed.signedUrl });
    } catch (e) {
      log.error('Link creation exception:', { productId: item?.product_id, message: e?.message });
      missing.push({ name: itemName, reason: 'exception' });
    }
  }
  return { links, missing };
}

// Delivered فقط إذا: (1) أُنشئت روابط كل منتجات الطلب، و(2) أُرسل البريد بنجاح.
// وإلا يبقى الطلب Paid (ويُرسل ما توفّر من روابط مع تنبيه للعميل أن الباقي سيصله).
export async function deliverPaidOrder({ admin, order, sendEmail, log = console, now = () => new Date() }) {
  const { links, missing } = await buildDownloadLinks(admin, order, log);
  log.log('DOWNLOAD LINKS RESULT:', { orderId: order.id, linksCount: links.length, missingCount: missing.length });

  let emailOk = false;
  let emailError = null;
  if (links.length > 0) {
    try {
      const sent = await sendEmail(order, links, { partial: missing.length > 0 });
      emailOk = !sent?.skipped && !sent?.error;
      if (!emailOk) emailError = sent?.skipped ? 'email_disabled' : (sent?.error?.message || 'send_failed');
    } catch (e) {
      emailError = e?.message || 'send_exception';
      log.error('Product email exception:', { name: e?.name, message: e?.message });
    }
  } else {
    emailError = 'no_links';
    log.error('NO DOWNLOAD LINKS CREATED - PRODUCT EMAIL NOT SENT');
  }

  const complete = emailOk && missing.length === 0;
  const iso = now().toISOString();

  if (complete) {
    const { error } = await admin.from('orders')
      .update({ status: 'Delivered', updated_at: iso })
      .eq('id', order.id).eq('status', 'Paid');
    if (error) log.error('Failed to update final order status:', { message: error.message, code: error.code });
  }

  // أعمدة التتبع (migration_004): محاولة منفصلة وغير حرجة. غيابها لا يؤثر على التسليم.
  const reason = [...missing.map((m) => `${m.name}:${m.reason}`), emailOk ? null : emailError]
    .filter(Boolean).join(' | ').slice(0, 500);
  try {
    await admin.from('orders').update({
      delivery_attempts: (Number(order.delivery_attempts) || 0) + 1,
      last_delivery_at: iso,
      delivered_at: complete ? iso : null,
      delivery_error: complete ? null : reason,
    }).eq('id', order.id);
  } catch (_) { /* best-effort */ }

  return { complete, linksCount: links.length, missing, emailError: emailOk ? null : emailError };
}
