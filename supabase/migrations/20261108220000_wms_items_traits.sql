-- Признаки вещи из приёмки: нужны, чтобы разложить вещь позже (она могла быть сохранена «без места»).
alter table public.wms_items add column if not exists can_hang boolean not null default false;
alter table public.wms_items add column if not exists can_fold boolean not null default false;
alter table public.wms_items add column if not exists hazardous boolean not null default false;
