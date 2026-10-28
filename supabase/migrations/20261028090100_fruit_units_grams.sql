-- Fruits are bought by weight: production already stores apple/banana/pear in grams, and the
-- retail-pack trigger rejects "pcs" for them. Align fresh databases with production (no-op there).
update public.ingredient_catalog
set default_unit = 'g', updated_at = now()
where id in ('apple', 'banana', 'pear') and default_unit <> 'g';

-- Added in production on 2026-10-12 together with the retail-pack trigger, never in the repo.
insert into public.ingredient_catalog (id, canonical_name, category, tags, default_unit, active)
values ('activia_drink_grains', 'Активиа питьевая со злаками', 'dairy', array['liquid','dairy']::text[], 'g', true)
on conflict (id) do nothing;
