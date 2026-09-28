-- Snapshot of the live production tables that the hardening migration touches.
-- CI only. Kept deliberately small, but column names/types/constraints match production.

do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;

create extension if not exists pgcrypto;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Наша семья',
  budget_weekly numeric not null default 8000,
  currency text not null default 'RUB',
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id),
  telegram_user_id bigint,
  name text not null,
  role text not null check (role in ('husband','wife','child','other')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (family_id, telegram_user_id)
);

create table if not exists public.family_rules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id),
  rule_type text not null check (rule_type in ('hard','preference','feedback')),
  code text not null,
  description text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (family_id, code)
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id),
  name text not null,
  quantity numeric not null check (quantity >= 0),
  unit text not null,
  state text not null check (state in ('raw','cooked','semi_finished','frozen','dry','canned')),
  category text,
  urgent boolean not null default false,
  opened boolean not null default false,
  frozen boolean not null default false,
  added_at timestamptz not null default now(),
  use_by date,
  note text,
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id),
  week_start date not null,
  status text not null default 'draft' check (status in ('draft','approved','archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, week_start)
);

create table if not exists public.weekly_meals (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weekly_plans(id) on delete cascade,
  meal_date date not null,
  meal_type text not null check (meal_type in ('breakfast','snack1','lunch','snack2','dinner')),
  title text not null,
  batch_key text,
  portions jsonb not null default '{}'::jsonb,
  ingredients jsonb not null default '[]'::jsonb,
  recipe jsonb not null default '{}'::jsonb,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.families (id,name,budget_weekly)
values ('11111111-1111-1111-1111-111111111111','test',8000)
on conflict do nothing;

insert into public.family_members (id,family_id,telegram_user_id,name,role)
values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111',42,'Test','husband')
on conflict do nothing;

insert into public.weekly_plans (id,family_id,week_start)
values ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','2026-09-28')
on conflict do nothing;

insert into public.weekly_meals
  (week_id,meal_date,meal_type,title,ingredients,recipe,sort_order)
values
  ('22222222-2222-2222-2222-222222222222','2026-09-28','lunch','old generated',
   '[{"name":"картофель","amount":400,"unit":"g","state":"raw"}]'::jsonb,
   '{"steps":["x"]}'::jsonb,30)
on conflict do nothing;
