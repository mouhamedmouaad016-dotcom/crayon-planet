import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'Cron secret is not configured' },
      { status: 503 }
    );
  }

  const authorization = request.headers.get('authorization');

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Safe placeholder: no emails are sent yet.
  // Follow-up processing will be enabled after
  // the queue, consent checks, and scheduling are configured.
  return NextResponse.json({
    ok: true,
    status: 'protected_endpoint_ready',
    emailsSent: 0
  });
}
