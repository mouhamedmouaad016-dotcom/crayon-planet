import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FROM = () =>
  process.env.RESEND_FROM_EMAIL ||
  'CRAYON PLANET <orders@crayonplanetdz.xyz>';

const REPLY_TO = 'mouhamedmouaad016@gmail.com';

function emailContent(step) {
  if (step === 1) {
    return {
      subject: 'كيف كان تحميل منتجك؟ 🌷 | CRAYON PLANET',
      html: `
        <div dir="rtl" style="font-family:Tahoma,sans-serif;line-height:1.9">
          <h2>مرحبًا بك من CRAYON PLANET ❤️</h2>
          <p>نأمل أن يكون تحميل منتجك الرقمي قد تم بنجاح.</p>
          <p>إذا واجهت أي مشكلة في فتح الملف أو استخدامه،
          يمكنك الرد على هذه الرسالة وسنساعدك.</p>
          <p>شكرًا لثقتك بنا 🌷</p>
          <p>فريق CRAYON PLANET</p>
        </div>
      `,
    };
  }

  if (step === 2) {
    return {
      subject: 'هل تحتاج إلى مساعدة مع منتجك؟ 🌟 | CRAYON PLANET',
      html: `
        <div dir="rtl" style="font-family:Tahoma,sans-serif;line-height:1.9">
          <h2>تحية طيبة من CRAYON PLANET ❤️</h2>
          <p>نرجو أن يكون منتجك الرقمي مفيدًا وممتعًا لك.</p>
          <p>إذا احتجت إلى مساعدة في فتح الملف أو استخدامه،
          يمكنك الرد على هذه الرسالة.</p>
          <p>يسعدنا مساعدتك، وشكرًا لثقتك بنا.</p>
          <p>فريق CRAYON PLANET</p>
        </div>
      `,
    };
  }

  return null;
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET;

  if (
    !secret ||
    request.headers.get('authorization') !== `Bearer ${secret}`
  ) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Email service is not configured' },
      { status: 503 }
    );
  }

  const admin = supabaseAdmin();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const now = new Date().toISOString();

  const { data: jobs, error } = await admin
    .from('followup_emails')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(20);

  if (error) {
    console.error('Follow-up queue lookup failed:', error.message);
    return NextResponse.json(
      { error: 'queue_lookup_failed' },
      { status: 500 }
    );
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const job of jobs || []) {
    // Only the two requested service emails are enabled.
    // Marketing emails are never sent by this worker.
    const content = emailContent(Number(job.sequence_step));

    if (!content) {
      const { error: skipError } = await admin
        .from('followup_emails')
        .update({ status: 'skipped' })
        .eq('id', job.id)
        .eq('status', 'pending');

      if (skipError) {
        failed++;
        console.error('Could not skip unsupported step:', skipError.message);
      } else {
        skipped++;
      }

      continue;
    }

    // Claim the job so overlapping cron runs do not normally send it twice.
    const { data: claimed, error: claimError } = await admin
      .from('followup_emails')
      .update({ status: 'processing' })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (claimError || !claimed) continue;

    try {
      const { data: order, error: orderError } = await admin
        .from('orders')
        .select('id, status')
        .eq('id', job.order_id)
        .maybeSingle();

      if (orderError) {
        throw new Error(`Order lookup failed: ${orderError.message}`);
      }

      if (!order || order.status !== 'Delivered') {
        const terminal =
          !order ||
          ['Failed', 'Cancelled'].includes(order.status);

        const { error: updateError } = await admin
          .from('followup_emails')
          .update({ status: terminal ? 'skipped' : 'pending' })
          .eq('id', job.id)
          .eq('status', 'processing');

        if (updateError) throw updateError;

        if (terminal) skipped++;
        continue;
      }

      const { error: sendError } = await resend.emails.send({
        from: FROM(),
        to: job.customer_email,
        replyTo: REPLY_TO,
        subject: content.subject,
        html: content.html,
      });

      if (sendError) throw sendError;

      const { error: updateError } = await admin
        .from('followup_emails')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', job.id)
        .eq('status', 'processing');

      if (updateError) {
        console.error(
          'Email sent but status update failed:',
          job.id,
          updateError.message
        );
        failed++;
      } else {
        sent++;
      }
    } catch (err) {
      console.error('Follow-up failed:', {
        id: job.id,
        message: err?.message,
      });

      const { error: resetError } = await admin
        .from('followup_emails')
        .update({ status: 'pending' })
        .eq('id', job.id)
        .eq('status', 'processing');

      if (resetError) {
        console.error('Could not reset job:', resetError.message);
      }

      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    checked: jobs?.length || 0,
    sent,
    skipped,
    failed,
  });
      }
