-- Structured portion breakdowns, two shopping trips, and hard budget defaults.

alter table public.weekly_meals
  add column if not exists portion_components jsonb not null default '{}'::jsonb;

alter table public.weekly_shopping_items
  add column if not exists shopping_trip text;

alter table public.weekly_shopping_items
  add column if not exists purchase_on date;

update public.weekly_shopping_items
set shopping_trip = 'sunday'
where shopping_trip is null;

alter table public.weekly_shopping_items
  alter column shopping_trip set default 'sunday';

alter table public.weekly_shopping_items
  alter column shopping_trip set not null;

alter table public.weekly_shopping_items
  drop constraint if exists weekly_shopping_items_shopping_trip_chk;

alter table public.weekly_shopping_items
  add constraint weekly_shopping_items_shopping_trip_chk
  check (shopping_trip in ('sunday','thursday'));

update public.weekly_shopping_items s
set purchase_on = case
  when s.shopping_trip = 'thursday' then wp.week_start + 3
  else wp.week_start - 1
end
from public.weekly_plans wp
where wp.id = s.week_id
  and s.purchase_on is null;

alter table public.weekly_shopping_items
  alter column purchase_on set not null;

create index if not exists weekly_shopping_items_week_trip_idx
  on public.weekly_shopping_items(week_id, purchase_on, product_name);

update public.family_settings
set settings =
  jsonb_set(
    jsonb_set(
      coalesce(settings, '{}'::jsonb),
      '{shopping_weekdays}',
      '[7,4]'::jsonb,
      true
    ),
    '{budget_hard_limit}',
    'true'::jsonb,
    true
  ),
  updated_at = now();
