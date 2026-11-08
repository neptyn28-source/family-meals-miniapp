-- Восстановлено из истории миграций Supabase (применялась к базе напрямую).
alter table public.weekly_shopping_items
  add column if not exists used_for jsonb not null default '[]'::jsonb;
