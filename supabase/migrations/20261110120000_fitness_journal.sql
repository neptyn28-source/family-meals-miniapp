-- Фитнес-план жены: дневник тренировок, замеров и дней — один документ на семью.
create table if not exists public.fitness_journal (
  family_id uuid primary key references public.families(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by bigint
);

alter table public.fitness_journal enable row level security;
revoke all on public.fitness_journal from anon, authenticated;
