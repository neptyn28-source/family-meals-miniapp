-- family-budget records a received income as an "income_unallocated" operation on the system
-- envelope, but the kind check did not allow it, so every "+ Получка" failed with a 500.
-- fb_* tables are not created by repo migrations yet, so skip when the table is absent.
do $$
begin
  if to_regclass('public.fb_operations') is not null then
    alter table public.fb_operations drop constraint if exists fb_operations_kind_check;
    alter table public.fb_operations add constraint fb_operations_kind_check
      check (kind in ('allocation','expense','transfer_in','transfer_out','personal_income','adjustment','rollover','income_unallocated'));
  end if;
end $$;
