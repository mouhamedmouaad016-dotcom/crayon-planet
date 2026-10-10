import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Temporary health check only.
  // Follow-up email processing is not enabled yet.
  return NextResponse.json({
    ok: true,
    status: 'cron_endpoint_ready',
    emailsSent: 0
  });
}
