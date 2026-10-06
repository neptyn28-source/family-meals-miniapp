-- Inventory usage restrictions: some leftovers may be used only inside cooked dishes.
alter table public.inventory
  add column if not exists usage_mode text not null default 'any';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='inventory_usage_mode_chk'
      and conrelid='public.inventory'::regclass
  ) then
    alter table public.inventory
      add constraint inventory_usage_mode_chk
      check (usage_mode in ('any','cooking_only'));
  end if;
end $$;

comment on column public.inventory.usage_mode is
  'any = may be served directly or cooked; cooking_only = may only satisfy AI-menu ingredient requirements marked use=cooking';
