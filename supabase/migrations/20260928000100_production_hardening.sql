-- Production hardening: planner catalog, family settings, caps, prices, shopping, feedback, observability.
-- ADDITIVE ONLY: no existing table/column is dropped or rewritten. Safe to re-run (IF NOT EXISTS everywhere).
-- NOTE: written before the live schema could be inspected; the DO-blocks detect existing column names.

create extension if not exists pgcrypto;

create table if not exists public.ingredient_catalog (
  id text primary key,
  canonical_name text not null,
  category text not null,
  tags text[] not null default '{}',
  default_unit text not null check (default_unit in ('g', 'ml', 'pcs')),
  grams_per_piece numeric check (grams_per_piece is null or grams_per_piece > 0),
  kcal_per_100g numeric check (kcal_per_100g is null or kcal_per_100g >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingredient_aliases (
  alias_norm text primary key,
  ingredient_id text not null references public.ingredient_catalog(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists ingredient_aliases_ingredient_idx on public.ingredient_aliases(ingredient_id);

create table if not exists public.ingredient_prices (
  id uuid primary key default gen_random_uuid(),
  ingredient_id text not null references public.ingredient_catalog(id) on delete cascade,
  store text not null,
  price_rub numeric not null check (price_rub > 0),
  package_amount numeric not null check (package_amount > 0),
  package_unit text not null check (package_unit in ('g', 'ml', 'pcs')),
  effective_from date not null default current_date,
  manually_verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (ingredient_id, store, effective_from)
);
create index if not exists ingredient_prices_ingredient_idx on public.ingredient_prices(ingredient_id);

create table if not exists public.recipes (
  id text primary key,
  title text not null,
  meal_types text[] not null,
  tags text[] not null default '{}',
  side text,
  active boolean not null default true,
  batchable boolean not null default false,
  batch_days int not null default 1 check (batch_days between 1 and 3),
  equipment text[] not null default '{}',
  cook_minutes int not null default 0,
  ref_portion_g numeric not null check (ref_portion_g > 0),
  steps jsonb not null default '[]',
  child_adaptation text not null default '',
  seasoning text not null default '',
  child_ok boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (meal_types <@ array['breakfast','snack1','lunch','snack2','dinner']::text[])
);

create table if not exists public.recipe_ingredients (
  recipe_id text not null references public.recipes(id) on delete cascade,
  ingredient_id text not null references public.ingredient_catalog(id),
  amount numeric not null check (amount > 0),
  state text not null default 'raw' check (state in ('raw','cooked','semi_finished','frozen','dry','canned')),
  optional boolean not null default false,
  position int not null default 0,
  primary key (recipe_id, ingredient_id)
);

create table if not exists public.family_settings (
  family_id uuid primary key references public.families(id) on delete cascade,
  settings jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by bigint
);

create table if not exists public.family_ingredient_caps (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  ingredient_id text references public.ingredient_catalog(id),
  category text,
  max_amount numeric not null check (max_amount >= 0),
  unit text not null check (unit in ('g','ml','pcs')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((ingredient_id is null) <> (category is null))
);
create unique index if not exists family_caps_ing_uq on public.family_ingredient_caps(family_id, ingredient_id) where ingredient_id is not null;
create unique index if not exists family_caps_cat_uq on public.family_ingredient_caps(family_id, category) where category is not null;

create table if not exists public.family_ingredient_prices (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  ingredient_id text not null references public.ingredient_catalog(id),
  store text not null,
  price_rub numeric not null check (price_rub > 0),
  package_amount numeric not null check (package_amount > 0),
  package_unit text not null check (package_unit in ('g','ml','pcs')),
  manually_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (family_id, ingredient_id, store)
);

alter table public.family_rules add column if not exists rule_kind text;
alter table public.family_rules add column if not exists params jsonb;
alter table public.family_rules add column if not exists updated_at timestamptz default now();

alter table public.inventory add column if not exists ingredient_id text references public.ingredient_catalog(id);
create index if not exists inventory_ingredient_idx on public.inventory(ingredient_id);

alter table public.weekly_meals add column if not exists source text not null default 'manual';
alter table public.weekly_meals add column if not exists locked boolean not null default false;
alter table public.weekly_meals add column if not exists recipe_id text references public.recipes(id);
alter table public.weekly_meals add column if not exists batch_key text;
alter table public.weekly_meals add column if not exists batch_day int;
alter table public.weekly_meals add column if not exists eaters text[];
alter table public.weekly_meals add column if not exists portion_grams jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'weekly_meals_source_chk') then
    alter table public.weekly_meals add constraint weekly_meals_source_chk check (source in ('generated','manual'));
  end if;
end $$;
update public.weekly_meals set source = 'generated'
 where source = 'manual' and ingredients is not null and jsonb_typeof(ingredients) = 'array' and jsonb_array_length(ingredients) > 0;

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  week_id uuid not null references public.weekly_plans(id) on delete cascade,
  item_key text not null,
  ingredient_id text references public.ingredient_catalog(id),
  purchased boolean not null default false,
  purchased_amount numeric,
  added_to_inventory_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by bigint,
  unique (week_id, item_key)
);
create index if not exists shopping_items_family_idx on public.shopping_items(family_id);

create table if not exists public.recipe_feedback (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  week_id uuid references public.weekly_plans(id) on delete set null,
  meal_id uuid,
  recipe_id text references public.recipes(id),
  rating text check (rating in ('liked','disliked','neutral')),
  amount text check (amount in ('too_much','ok','too_little')),
  leftovers boolean,
  hungry_after boolean,
  snack_used boolean,
  action text check (action in ('never','more_often','less_often')),
  comment text,
  author_telegram_id bigint,
  created_at timestamptz not null default now()
);
create index if not exists recipe_feedback_family_recipe_idx on public.recipe_feedback(family_id, recipe_id);

create table if not exists public.generation_runs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  week_id uuid references public.weekly_plans(id) on delete set null,
  scope text not null default 'week',
  success boolean not null,
  failures jsonb not null default '[]',
  warnings jsonb not null default '[]',
  estimated_cost_rub numeric,
  priced_count int,
  unpriced_count int,
  budget_status text,
  attempts int,
  planner_version text not null,
  duration_ms int,
  created_at timestamptz not null default now()
);
create index if not exists generation_runs_family_idx on public.generation_runs(family_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['families','family_members','family_invites','family_rules','inventory','weekly_plans','weekly_meals',
                           'family_settings','family_ingredient_caps','family_ingredient_prices','shopping_items','recipe_feedback',
                           'generation_runs','ingredient_catalog','ingredient_aliases','ingredient_prices','recipes','recipe_ingredients']
  loop
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = t) then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;
