-- Approximation of the pre-existing production schema, used ONLY by CI to validate migrations.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $$;
create extension if not exists pgcrypto;
create table if not exists public.families (id uuid primary key default gen_random_uuid(), name text, created_at timestamptz default now());
create table if not exists public.family_members (id uuid primary key default gen_random_uuid(), family_id uuid references public.families(id), telegram_user_id bigint unique, role text, name text);
create table if not exists public.family_invites (id uuid primary key default gen_random_uuid(), family_id uuid references public.families(id), code text, expires_at timestamptz);
create table if not exists public.family_rules (id uuid primary key default gen_random_uuid(), family_id uuid references public.families(id), rule_type text, description text, enabled boolean default true, created_at timestamptz default now());
create table if not exists public.inventory (id uuid primary key default gen_random_uuid(), family_id uuid references public.families(id), name text, quantity numeric, unit text, state text, urgent boolean default false);
create table if not exists public.weekly_plans (id uuid primary key default gen_random_uuid(), family_id uuid references public.families(id), week_start date, status text default 'draft');
create table if not exists public.weekly_meals (id uuid primary key default gen_random_uuid(), week_id uuid references public.weekly_plans(id), family_id uuid, meal_date date, meal_type text, title text, portions jsonb, ingredients jsonb, recipe jsonb, notes text);
insert into public.families (id, name) values ('11111111-1111-1111-1111-111111111111', 'test') on conflict do nothing;
insert into public.weekly_plans (id, family_id, week_start) values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '2026-09-28') on conflict do nothing;
insert into public.weekly_meals (week_id, meal_date, meal_type, title, ingredients) values ('22222222-2222-2222-2222-222222222222', '2026-09-28', 'lunch', 'old', '[{"name":"картофель","amount":4000,"unit":"g"}]');
