-- Schema of the family-budget module (fb_*). The tables were created in production outside the
-- repo migrations; this file mirrors the live schema so CI and fresh databases match production.
-- Idempotent: on production every statement is a no-op.

create extension if not exists pgcrypto;

create table if not exists public.fb_households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.fb_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.fb_households(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('husband','wife')),
  device_token_hash text not null unique,
  tg_user_id bigint,
  created_at timestamptz not null default now(),
  unique (household_id, role)
);

create table if not exists public.fb_envelopes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.fb_households(id) on delete cascade,
  name text not null,
  group_name text not null,
  type text not null check (type in ('payment','limit','personal','goal','system')),
  plan_amount bigint not null default 0,
  goal_amount bigint,
  goal_date date,
  goal_priority integer not null default 0,
  status text not null default 'active' check (status in ('active','paused','done','archived')),
  owner_member_id uuid references public.fb_members(id) on delete set null,
  due_day integer check (due_day >= 1 and due_day <= 31),
  rollover boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, name)
);
create index if not exists fb_envelopes_household_idx on public.fb_envelopes (household_id, status, sort);

create table if not exists public.fb_income_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.fb_households(id) on delete cascade,
  kind text not null check (kind in ('advance','salary','bonus','other','personal')),
  amount bigint not null check (amount > 0),
  event_date date not null default current_date,
  member_id uuid not null references public.fb_members(id) on delete restrict,
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.fb_operations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.fb_households(id) on delete cascade,
  envelope_id uuid not null references public.fb_envelopes(id) on delete restrict,
  amount bigint not null,
  kind text not null constraint fb_operations_kind_check
    check (kind in ('allocation','expense','transfer_in','transfer_out','personal_income','adjustment','rollover','income_unallocated')),
  op_date date not null default current_date,
  member_id uuid not null references public.fb_members(id) on delete restrict,
  income_event_id uuid references public.fb_income_events(id) on delete set null,
  transfer_group_id uuid,
  is_cash boolean not null default false,
  comment text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists fb_operations_household_date_idx on public.fb_operations (household_id, op_date desc);
create index if not exists fb_operations_envelope_idx on public.fb_operations (envelope_id) where deleted_at is null;

create table if not exists public.fb_template_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.fb_households(id) on delete cascade,
  income_kind text not null check (income_kind in ('advance','salary','bonus')),
  envelope_id uuid not null references public.fb_envelopes(id) on delete cascade,
  mode text not null check (mode in ('fixed','percent','remainder')),
  value numeric(12,4),
  priority integer not null default 0,
  unique (household_id, income_kind, envelope_id)
);

-- Access only through the family-budget Edge Function (service role).
alter table public.fb_households enable row level security;
alter table public.fb_members enable row level security;
alter table public.fb_envelopes enable row level security;
alter table public.fb_income_events enable row level security;
alter table public.fb_operations enable row level security;
alter table public.fb_template_rules enable row level security;
revoke all on public.fb_households, public.fb_members, public.fb_envelopes,
  public.fb_income_events, public.fb_operations, public.fb_template_rules from anon, authenticated;
