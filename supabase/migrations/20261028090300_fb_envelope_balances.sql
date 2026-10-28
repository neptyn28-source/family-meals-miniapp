-- family-budget computed envelope balances from the latest 80 operations only, so after the 81st
-- operation old amounts silently dropped out of the balances. Sum all live operations in SQL.

create or replace function public.fb_envelope_balances(p_household_id uuid)
returns table (envelope_id uuid, balance bigint)
language sql
stable
set search_path = public
as $$
  select o.envelope_id, coalesce(sum(o.amount), 0)::bigint
  from public.fb_operations o
  where o.household_id = p_household_id and o.deleted_at is null
  group by o.envelope_id
$$;

revoke all on function public.fb_envelope_balances(uuid) from public, anon, authenticated;
