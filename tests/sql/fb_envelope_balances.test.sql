-- CI-only: envelope balances must include every live operation, not only the latest 80.
do $$
declare
  h uuid := gen_random_uuid();
  m uuid := gen_random_uuid();
  e uuid := gen_random_uuid();
  e2 uuid := gen_random_uuid();
  bal bigint;
begin
  insert into public.fb_households (id, name, invite_code) values (h, 'Тест', 'TST' || substr(md5(h::text), 1, 4));
  insert into public.fb_members (id, household_id, display_name, role, device_token_hash) values (m, h, 'Я', 'husband', md5(m::text));
  insert into public.fb_envelopes (id, household_id, name, group_name, type) values (e, h, 'Продукты', 'Жизнь', 'limit'), (e2, h, 'Ребёнок', 'Жизнь', 'limit');

  insert into public.fb_operations (household_id, envelope_id, amount, kind, member_id)
  select h, e, 10000, 'allocation', m;
  insert into public.fb_operations (household_id, envelope_id, amount, kind, member_id)
  select h, e, -100, 'expense', m from generate_series(1, 100);
  -- soft-deleted operations are ignored
  insert into public.fb_operations (household_id, envelope_id, amount, kind, member_id, deleted_at)
  values (h, e, -5000, 'expense', m, now());

  select balance into bal from public.fb_envelope_balances(h) where envelope_id = e;
  if bal <> 0 then raise exception 'expected 0 after 101 operations, got %', bal; end if;
  if exists (select 1 from public.fb_envelope_balances(h) where envelope_id = e2) then
    raise exception 'envelope without operations must not appear';
  end if;
  if exists (select 1 from public.fb_envelope_balances(gen_random_uuid())) then
    raise exception 'other household must see nothing';
  end if;

  delete from public.fb_households where id = h;
  raise notice 'fb_envelope_balances: ok';
end $$;
