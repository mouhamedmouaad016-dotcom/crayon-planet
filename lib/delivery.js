// وظيفة إنشاء روابط التحميل وإرسال البريد. تُستخدم من webhook (أو Next.js) في مسار التسليم الفعلي.

export const SIGNED_URL_SECONDS = 60 * 60 * 48; // 48 ساعة

export async function buildDownloadLinks(admin, order, log = console) {
  const links = [];
  const missing = [];

  for (const item of order.items || []) {
    const itemName = item?.name || 'منتج';

    try {
      const { data: product, error } = await admin
        .from('products')
        .select('file_path')
        .eq('id', item.product_id)
        .maybeSingle();

      if (error || !product) {
        log.error('Product lookup failed:', {
          productId: item?.product_id,
          message: error?.message,
        });

        missing.push({
          name: itemName,
          reason: 'product_lookup',
        });

        continue;
      }

      if (!product.file_path) {
        log.error('Product has no file_path:', {
          productId: item?.product_id,
          productName: product.name || itemName,
        });

        missing.push({
          name: product.name || itemName,
          reason: 'no_file',
        });

        continue;
      }

      // رابط التحميل يمر أولًا عبر موقع CRAYON PLANET.
      // الموقع يتحقق من download_token ثم ينشئ رابط Supabase قصير المدة.
      const site =
        process.env.NEXT_PUBLIC_SITE_URL ||
        'https://crayonplanetdz.xyz';

      if (!order.download_token) {
        log.error('Download token missing:', {
          orderId: order.id,
        });

        missing.push({
          name: product.name || itemName,
          reason: 'download_token_missing',
        });

        continue;
      }

      const downloadUrl =
        `${site.replace(/\/$/, '')}` +
        `/download/${encodeURIComponent(order.download_token)}` +
        `/${encodeURIComponent(item.product_id)}`;

      links.push({
        name: product.name || itemName,
        url: downloadUrl,
      });
    } catch (e) {
      log.error('Link creation exception:', {
        productId: item?.product_id,
        message: e?.message,
      });

      missing.push({
        name: itemName,
        reason: 'exception',
      });
    }
  }

  return { links, missing };
}

// هذا هو المسار الرئيسي لتسليم المنتجات.
// فقط إذا أُرسلت روابط كل منتجات الطلب (أو أرسل البريد جزئيًا) يُعتبر الطلب Delivered.

export async function deliverPaidOrder({
  admin,
  order,
  sendEmail,
  log = console,
  now = () => new Date(),
}) {
  const { links, missing } = await buildDownloadLinks(admin, order, log);

  log.log('DOWNLOAD LINKS RESULT:', {
    orderId: order.id,
    linksCount: links.length,
    missingCount: missing.length,
  });

  let emailOk = false;
  let emailError = null;

  if (links.length > 0) {
    try {
      const sent = await sendEmail(order, links, {
        partial: missing.length > 0,
      });

      emailOk = sent?.skipped === false && !sent?.error;

      if (!emailOk) {
        emailError =
          sent?.error?.message ||
          sent?.error ||
          'send_failed';
      }
    } catch (e) {
      emailError = e?.message || 'send_exception';

      log.error('Product email exception:', {
        name: e?.name,
        message: e?.message,
      });
    }
  } else {
    emailError = 'no_links';

    log.error(
      'NO DOWNLOAD LINKS CREATED - PRODUCT EMAIL NOT SENT'
    );
  }

  const complete = emailOk && missing.length === 0;
  const iso = now().toISOString();

  if (complete) {
    const { error } = await admin
      .from('orders')
      .update({
        status: 'Delivered',
        updated_at: iso,
      })
      .eq('id', order.id)
      .eq('status', 'Paid');

    if (error) {
      log.error('Failed to update final order status:', {
        message: error.message,
        code: error.code,
      });
    }
  }

  // محاولة تسجيل منظمة وغير حرجة لأثر التسليم.
  const reason = [
    ...missing.map((m) => `${m.name}:${m.reason}`),
    emailOk ? null : emailError,
  ]
    .filter(Boolean)
    .join(' | ')
    .slice(0, 500);

  try {
    await admin
      .from('orders')
      .update({
        delivery_attempts:
          (Number(order.delivery_attempts) || 0) + 1,
        last_delivery_at: iso,
        delivered_at: complete ? iso : null,
        delivery_error: complete ? null : reason,
      })
      .eq('id', order.id);
  } catch (_) {
    // best-effort
  }

  return {
    complete,
    linksCount: links.length,
    missing,
    emailError: emailOk ? null : emailError,
  };
}
