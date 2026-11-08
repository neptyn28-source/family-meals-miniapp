-- Визуальное «Хранение»: план квартиры и мебель на нём.
-- wms_floorplans — геометрия квартиры семьи (комнаты прямоугольниками в метрах, двери).
-- wms_furniture — предмет мебели на плане; секции (wms_modules) ссылаются на него.
-- Размер NULL = ещё не задан, экран предлагает его по полкам. x/y NULL = не поставлен на план.
-- Только добавляет таблицы и колонку; существующие данные не меняются.
-- Идемпотентна: CI применяет миграции дважды.

create table if not exists public.wms_floorplans (
  family_id uuid primary key references public.families(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.wms_furniture (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  location_id uuid not null references public.wms_locations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  x_m numeric check (x_m between -5 and 100),
  y_m numeric check (y_m between -5 and 100),
  width_cm numeric check (width_cm between 10 and 600),
  depth_cm numeric check (depth_cm between 10 and 400),
  rotation smallint not null default 0 check (rotation between 0 and 3),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wms_modules
  add column if not exists furniture_id uuid references public.wms_furniture(id) on delete set null;

create index if not exists wms_furniture_family_idx on public.wms_furniture (family_id);
create index if not exists wms_furniture_location_idx on public.wms_furniture (location_id);
create index if not exists wms_modules_furniture_idx on public.wms_modules (furniture_id);

alter table public.wms_floorplans enable row level security;
alter table public.wms_furniture enable row level security;
revoke all on public.wms_floorplans, public.wms_furniture from anon, authenticated;

-- План квартиры №120 (по ДДУ застройщика, 2026-11-08). Начало — левый верхний внутренний угол
-- детской, x вправо, y вниз, метры. Ставится семье, у которой есть эти комнаты; кухня и гостиная —
-- две половины одной кухни-гостиной. Существующий план не перезаписывается.
with geo(room, parts, label) as (
  values
    ('Детская',              '[[0,0,4.55,2.77]]'::jsonb,                          '[2.27,1.48]'::jsonb),
    ('Ванная',               '[[4.65,0,0.89,1.71],[5.54,0,1.31,0.89]]'::jsonb,    '[5.75,0.55]'::jsonb),
    ('Туалет',               '[[6.95,0,1.31,1.69]]'::jsonb,                       '[7.6,0.9]'::jsonb),
    ('Кухня',                '[[8.36,0,3.22,2.78]]'::jsonb,                       '[9.97,1.48]'::jsonb),
    ('Гостиная',             '[[11.58,0,3.22,2.78]]'::jsonb,                      '[13.19,1.48]'::jsonb),
    ('Прихожая с коридором', '[[4.65,1.81,1.83,0.91],[6.48,1.79,1.81,4.27]]'::jsonb, '[7.38,4.6]'::jsonb),
    ('Спальня',              '[[8.39,2.88,4.96,3.06]]'::jsonb,                    '[10.87,4.5]'::jsonb),
    ('Балкон',               '[[13.45,2.88,1.4,2.5]]'::jsonb,                     '[14.15,4.2]'::jsonb)
),
fam as (
  select l.family_id
  from public.wms_locations l
  where l.name in (select room from geo)
  group by l.family_id
  having count(distinct l.name) = 8
)
insert into public.wms_floorplans (family_id, data)
select f.family_id, jsonb_build_object(
  'title', 'Квартира 120',
  'units', 'm',
  'rooms', (
    select jsonb_agg(jsonb_build_object('location_id', l.id, 'name', g.room, 'parts', g.parts, 'label', g.label) order by l.position)
    from geo g join public.wms_locations l on l.family_id = f.family_id and l.name = g.room
  ),
  'doors', '[[4.55,1.86,4.55,2.67],[7.0,6.06,7.8,6.06]]'::jsonb,
  'openings', '[[11.58,0.05,11.58,2.73]]'::jsonb
)
from fam f
on conflict (family_id) do nothing;
