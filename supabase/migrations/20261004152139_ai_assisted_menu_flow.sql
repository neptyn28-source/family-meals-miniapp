-- AI-assisted menu workflow.
-- The bot stores facts and performs deterministic arithmetic; ChatGPT produces the menu.
-- Existing planner tables are preserved for rollback/history, but new imports use ai_menu_* tables.

alter table public.weekly_meals
  drop constraint if exists weekly_meals_source_chk;

alter table public.weekly_meals
  add constraint weekly_meals_source_chk
  check (source in ('generated','manual','ai_import'));

alter table public.weekly_plans
  add column if not exists ai_import_version text;

alter table public.weekly_plans
  add column if not exists imported_at timestamptz;

create table if not exists public.ai_menu_imports (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  week_id uuid not null references public.weekly_plans(id) on delete cascade,
  schema_version text not null,
  payload jsonb not null,
  imported_by uuid references public.family_members(id) on delete set null,
  imported_at timestamptz not null default now()
);

create index if not exists ai_menu_imports_family_week_idx
  on public.ai_menu_imports(family_id, week_id, imported_at desc);

create table if not exists public.ai_menu_cook_blocks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  week_id uuid not null references public.weekly_plans(id) on delete cascade,
  block_key text not null,
  title text not null,
  serves jsonb not null default '[]'::jsonb,
  ingredients jsonb not null default '[]'::jsonb,
  recipe jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (week_id, block_key)
);

create index if not exists ai_menu_cook_blocks_family_week_idx
  on public.ai_menu_cook_blocks(family_id, week_id);

alter table public.ai_menu_imports enable row level security;
alter table public.ai_menu_cook_blocks enable row level security;

revoke all on public.ai_menu_imports from anon, authenticated;
revoke all on public.ai_menu_cook_blocks from anon, authenticated;
