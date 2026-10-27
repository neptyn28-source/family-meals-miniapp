-- Home WMS: места хранения семьи (Locations → Modules → Cells → Items, 5S).
-- Живёт в проекте family-meals: доступ только через Edge Function home-wms-api
-- по Telegram initData; anon/authenticated к таблицам не допускаются.
-- Идемпотентна: CI family-meals-miniapp применяет миграции дважды.

create table if not exists public.wms_locations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.wms_modules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  location_id uuid not null references public.wms_locations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.wms_cells (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  module_id uuid not null references public.wms_modules(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  height_from_floor_cm numeric not null check (height_from_floor_cm between 0 and 400),
  width_cm numeric check (width_cm > 0 and width_cm <= 500),
  depth_cm numeric check (depth_cm > 0 and depth_cm <= 500),
  height_cm numeric check (height_cm > 0 and height_cm <= 500),
  -- 5S-эргономика; держать в синхроне с src/lib/zones.ts в home-wms
  zone_type text generated always as (
    case
      when height_from_floor_cm between 75 and 150 then 'hot'
      when height_from_floor_cm between 40 and 190 then 'warm'
      else 'cold'
    end
  ) stored,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.wms_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  cell_id uuid references public.wms_cells(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  category text,
  width_cm numeric check (width_cm > 0),
  depth_cm numeric check (depth_cm > 0),
  height_cm numeric check (height_cm > 0),
  quantity integer not null default 1 check (quantity > 0),
  usage_frequency text check (usage_frequency in ('daily', 'weekly', 'monthly', 'rare')),
  photo_path text,
  created_at timestamptz not null default now()
);

create index if not exists wms_locations_family_idx on public.wms_locations (family_id);
create index if not exists wms_modules_location_idx on public.wms_modules (location_id);
create index if not exists wms_modules_family_idx on public.wms_modules (family_id);
create index if not exists wms_cells_module_idx on public.wms_cells (module_id);
create index if not exists wms_cells_family_idx on public.wms_cells (family_id);
create index if not exists wms_items_cell_idx on public.wms_items (cell_id);
create index if not exists wms_items_family_idx on public.wms_items (family_id);

alter table public.wms_locations enable row level security;
alter table public.wms_modules enable row level security;
alter table public.wms_cells enable row level security;
alter table public.wms_items enable row level security;

revoke all on public.wms_locations, public.wms_modules, public.wms_cells, public.wms_items
  from anon, authenticated;
