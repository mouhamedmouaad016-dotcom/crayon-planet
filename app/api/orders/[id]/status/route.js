import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseServer';

// Public, read-only, and deliberately narrow: returns ONLY the order's
// status by its (unguessable) UUID — never the customer's email, items or
// total. This lets the "thank you" page poll for the real Chargily-verified
// status without weakening orders' row-level security (orders stay
// admin-only to select from the browser).
export async function GET(_req, { params }) {
  const { data, error } = await supabaseAdmin()
    .from('orders')
    .select('status')
    .eq('id', params.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ status: data.status });
}
