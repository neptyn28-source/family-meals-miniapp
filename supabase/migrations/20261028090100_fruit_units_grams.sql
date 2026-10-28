-- Fruits are bought by weight: production already stores apple/banana/pear in grams, and the
-- retail-pack trigger rejects "pcs" for them. Align fresh databases with production (no-op there).
update public.ingredient_catalog
set default_unit = 'g', updated_at = now()
where id in ('apple', 'banana', 'pear') and default_unit <> 'g';
