-- migration_004: تتبع التسليم واستعادة الروابط — للمراجعة فقط، لا تُنفَّذ قبل موافقتك.
-- إضافية فقط: لا تحذف ولا تعدّل أي بيانات موجودة، وآمنة لإعادة التشغيل.
-- بدونها: الإصلاحات الأخرى تعمل، وصفحة /recover تردّ "غير متاحة مؤقتًا"، وزر الإدارة يعمل لكن بلا تتبع.

-- ضمان وجود جدول webhook_events (نفس تعريف migration_002)
create table if not exists public.webhook_events (
  id text primary key,
  provider text not null default 'chargily',
  event_type text,
  payload jsonb,
  processed_at timestamptz default now()
);
alter table public.webhook_events enable row level security;

-- أعمدة تتبع التسليم والدفعات المحجوزة على orders
alter table public.orders add column if not exists delivery_attempts int not null default 0;
alter table public.orders add column if not exists last_delivery_at timestamptz;
alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.orders add column if not exists delivery_error text;
alter table public.orders add column if not exists payment_flag text;
