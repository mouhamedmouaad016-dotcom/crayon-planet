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
      subject: 'كيف كانت تجربتك مع منتج CRAYON PLANET؟',
      html: `
        <div dir="rtl" style="font-family:Tahoma,sans-serif">
          <p>مرحبًا بك في CRAYON PLANET ❤️</p>
          <p>نأمل أن يكون منتجك قد وصل إليك وأن تستمتع باستخدامه.</p>
          <p>إذا واجهت أي صعوبة في التحميل أو الاستخدام، يمكنك الرد على هذه الرسالة لمساعدتك.</p>
          <p>فريق CRAYON PLANET</p>
        </div>`,
    };
  }

  if (step === 2) {
    return {
      subject: 'يسعدنا سماع رأيك في CRAYON PLANET',
      html: `
        <div dir="rtl" style="font-family:Tahoma,sans-serif">
          <p>مرحبًا بك ❤️</p>
          <p>رأيك يساعدنا على تحسين منتجاتنا التعليمية والإبداعية للأطفال.</p>
          <p>إذا رغبت، يمكنك الرد على هذه الرسالة ومشاركتنا رأيك أو أي سؤال لديك.</p>
          <p>شكرًا لثقتك بنا.</p>
        </div>`,
    };
  }

  return null;
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET;

  if (!secret ||
      request.headers.get('authorization') !== `Bearer ${secret}`) {
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

  const { data: jobs, error } = await admin
    .from('followup_emails')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
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
    const { data: claimed, error: claimError } = await admin
      .from('followup_emails')
      .update({ status: 'processing' })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (claimError || !claimed) continue;

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, status')
      .eq('id', job.order_id)
      .maybeSingle();

    if (orderError) {
      await admin.from('followup_emails')
        .update({ status: 'pending' })
        .eq('id', job.id)
        .eq('status', 'processing');
      failed++;
      continue;
    }

    if (!order || order.status !== 'Delivered') {
      const terminal = !order ||
        ['Failed', 'Cancelled'].includes(order.status);

      await admin.from('followup_emails')
        .update({ status: terminal ? 'skipped' : 'pending' })
        .eq('id', job.id)
        .eq('status', 'processing');

      if (terminal) skipped++;
      continue;
    }

    if (Number(job.sequence_step) === 3) {
      const { data: customer, error: customerError } = await admin
        .from('customers')
        .select('marketing_consent')
        .eq('email', job.customer_email)
        .maybeSingle();

      if (customerError) {
        await admin.from('followup_emails')
          .update({ status: 'pending' })
          .eq('id', job.id)
          .eq('status', 'processing');
        failed++;
        continue;
      }

      if (customer?.marketing_consent !== true) {
        await admin.from('followup_emails')
          .update({ status: 'skipped' })
          .eq('id', job.id)
          .eq('status', 'processing');
        skipped++;
        continue;
      }

      // لا نرسل التسويق قبل تجهيز رسالة معتمدة.
      await admin.from('followup_emails')
        .update({ status: 'skipped' })
        .eq('id', job.id)
        .eq('status', 'processing');
      skipped++;
      continue;
    }

    const content = emailContent(Number(job.sequence_step));

    if (!content) {
      await admin.from('followup_emails')
        .update({ status: 'skipped' })
        .eq('id', job.id)
        .eq('status', 'processing');
      skipped++;
      continue;
    }

    try {
      const { data, error: sendError } = await resend.emails.send({
        from: FROM(),
        to: job.customer_email,
        replyTo: REPLY_TO,
        subject: content.subject,
        html: content.html,
      });

      if (sendError || !data?.id) {
        console.error('Follow-up email failed:', sendError);
        await admin.from('followup_emails')
          .update({ status: 'pending' })
          .eq('id', job.id)
          .eq('status', 'processing');
        failed++;
        continue;
      }

      const { error: updateError } = await admin
        .from('followup_emails')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', job.id)
        .eq('status', 'processing');

      if (updateError) {
        console.error('Could not record sent email:', updateError.message);
        failed++;
      } else {
        sent++;
      }
    } catch (sendError) {
      console.error('Follow-up email exception:', sendError);
      await admin.from('followup_emails')
        .update({ status: 'pending' })
        .eq('id', job.id)
        .eq('status', 'processing');
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
