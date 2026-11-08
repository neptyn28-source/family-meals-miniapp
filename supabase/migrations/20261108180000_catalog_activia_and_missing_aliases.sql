-- Catalog entries and aliases that were partly added to production by hand on 2026-10-22,
-- products from the 2026-10-19 shopping list with no catalog match, and products from
-- the family's inventory (2026-11-08) that were not linked to the catalog.
-- Idempotent: rows are upserted, aliases are re-pointed, inventory links only fill NULLs.

insert into public.ingredient_catalog (id, canonical_name, category, tags, default_unit, grams_per_piece, kcal_per_100g, active)
values
  ('activia_drink_grains', 'Активиа питьевая со злаками', 'dairy', array['liquid','dairy']::text[], 'g', null, null, true),
  ('cauliflower', 'цветная капуста', 'vegetable', array['cauliflower']::text[], 'g', null, 30, true),
  ('corn_canned', 'кукуруза консервированная', 'vegetable', array['canned_veg']::text[], 'g', null, 58, true),
  ('eggplant', 'баклажан', 'vegetable', array['eggplant']::text[], 'g', null, 24, true),
  ('pumpkin', 'тыква', 'vegetable', array['pumpkin']::text[], 'g', null, 26, true),
  ('barley_groats', 'ячневая крупа', 'grain', array['barley']::text[], 'g', null, 313, true),
  ('wheat_groats', 'пшеничная крупа', 'grain', array['wheat']::text[], 'g', null, 316, true),
  ('peas_dry', 'горох колотый', 'grain', array['legume']::text[], 'g', null, 298, true)
on conflict (id) do update set
  canonical_name = excluded.canonical_name,
  category = excluded.category,
  tags = excluded.tags,
  default_unit = excluded.default_unit,
  grams_per_piece = excluded.grams_per_piece,
  kcal_per_100g = excluded.kcal_per_100g,
  active = excluded.active,
  updated_at = now();

-- alias_norm is stored normalized: lowercase, ё→е, punctuation collapsed to single spaces.
insert into public.ingredient_aliases (alias_norm, ingredient_id)
values
  ('активиа питьевая со злаками', 'activia_drink_grains'),
  ('активиа', 'activia_drink_grains'),
  ('активия', 'activia_drink_grains'),
  ('активиа питьевая', 'activia_drink_grains'),
  ('активия питьевая', 'activia_drink_grains'),
  ('активия питьевая со злаками', 'activia_drink_grains'),
  ('питьевая активиа', 'activia_drink_grains'),
  ('питьевая активия', 'activia_drink_grains'),
  ('активиа со злаками', 'activia_drink_grains'),
  ('активия со злаками', 'activia_drink_grains'),
  ('цветная капуста', 'cauliflower'),
  ('капуста цветная', 'cauliflower'),
  ('кукуруза консервированная', 'corn_canned'),
  ('консервированная кукуруза', 'corn_canned'),
  ('кукуруза', 'corn_canned'),
  ('сладкая кукуруза', 'corn_canned'),
  ('говядина нежирная', 'beef'),
  ('нежирная говядина', 'beef'),
  ('фарш куринный', 'chicken_mince'),
  ('куринный фарш', 'chicken_mince'),
  ('грецкий орех', 'walnuts'),
  ('орех грецкий', 'walnuts'),
  ('броколли', 'broccoli'),
  ('баклажан', 'eggplant'),
  ('баклажаны', 'eggplant'),
  ('тыква', 'pumpkin'),
  ('тыква мускатная', 'pumpkin'),
  ('мускатная тыква', 'pumpkin'),
  ('ячневая крупа', 'barley_groats'),
  ('крупа ячневая', 'barley_groats'),
  ('ячка', 'barley_groats'),
  ('пшеничная крупа', 'wheat_groats'),
  ('крупа пшеничная', 'wheat_groats'),
  ('горох колотый', 'peas_dry'),
  ('горох', 'peas_dry'),
  ('горох сушеный', 'peas_dry'),
  ('овсяная крупа', 'oats'),
  ('вишня', 'berries_frozen'),
  ('вишня замороженная', 'berries_frozen')
on conflict (alias_norm) do update set ingredient_id = excluded.ingredient_id;

-- Typos in inventory names (2026-11-08).
update public.inventory set name = 'Брокколи', updated_at = now() where name = 'Броколли';
update public.inventory set name = 'Гречневая крупа', updated_at = now() where name = 'Гречневая група';

-- Link inventory rows that have no catalog product yet, by normalized name.
update public.inventory i
set ingredient_id = a.ingredient_id
from public.ingredient_aliases a
where i.ingredient_id is null
  and a.alias_norm = btrim(regexp_replace(regexp_replace(lower(replace(i.name, 'ё', 'е')), '[^a-zа-я0-9]+', ' ', 'g'), '\s+', ' ', 'g'));
