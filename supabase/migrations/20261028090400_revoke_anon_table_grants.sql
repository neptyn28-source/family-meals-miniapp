-- All data access goes through Edge Functions with the service role. RLS without policies already
-- blocks anon/authenticated, but some legacy tables still carry table grants: remove them so a
-- future policy or RLS change cannot expose family data through the public key by accident.
do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v', 'm')
  loop
    execute format('revoke all on public.%I from anon, authenticated', t.relname);
  end loop;
end $$;
