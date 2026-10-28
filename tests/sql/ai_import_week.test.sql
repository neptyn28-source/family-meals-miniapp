-- CI-only checks for public.ai_import_week (run after all migrations).
do $$
declare
  fam uuid := gen_random_uuid();
  wk uuid := gen_random_uuid();
  meals jsonb := '[{"meal_date":"2026-11-02","meal_type":"lunch","title":"Суп","portions":{"husband":1},"eaters":["husband"],"sort_order":3}]';
  good_shop jsonb := '[
    {"item_key":"activia_sun","ingredient_id":"activia_drink_grains","product_name":"Активиа","required_quantity":600,"to_buy":600,"unit":"g","shopping_trip":"sunday","purchase_on":"2026-11-01","used_for":[]},
    {"item_key":"activia_thu","ingredient_id":"activia_drink_grains","product_name":"Активиа","required_quantity":500,"to_buy":500,"unit":"g","shopping_trip":"thursday","purchase_on":"2026-11-05","used_for":[]}
  ]';
  bad_shop jsonb := '[{"item_key":"banana","ingredient_id":"banana","product_name":"Банан","to_buy":3,"unit":"pcs","shopping_trip":"sunday","purchase_on":"2026-11-01"}]';
  n int;
  w public.weekly_plans;
begin
  insert into public.families (id, name) values (fam, 'Тест импорта');

  -- 1. A failing shopping row rolls back everything, including the new week.
  begin
    perform public.ai_import_week(fam, wk, '2026-11-02', meals, '[]', bad_shop,
      jsonb_build_object('schema_version','family-meal-plan-v3','payload','{}'::jsonb), '{"budget_status":"within"}');
    raise exception 'expected failure';
  exception when others then
    if sqlerrm = 'expected failure' then raise; end if;
  end;
  select count(*) into n from public.weekly_plans where family_id = fam;
  if n <> 0 then raise exception 'week must not survive a failed import, got %', n; end if;

  -- 2. Successful import writes week, meals, blocks, shopping, audit in one go.
  w := public.ai_import_week(fam, wk, '2026-11-02', meals,
    '[{"block_key":"b1","title":"Суп на 2 дня","serves":[],"ingredients":[],"recipe":{}}]', good_shop,
    jsonb_build_object('schema_version','family-meal-plan-v3','payload','{"x":1}'::jsonb), '{"estimated_cost":123.5,"budget_status":"within","ai_import_version":"family-meal-plan-v3","notes":"ok"}');
  if w.id <> wk or not w.validation_ok or w.estimated_cost <> 123.5 then raise exception 'bad week row %', row_to_json(w); end if;
  select count(*) into n from public.weekly_meals where week_id = wk; if n <> 1 then raise exception 'meals %', n; end if;
  select count(*) into n from public.ai_menu_cook_blocks where week_id = wk; if n <> 1 then raise exception 'blocks %', n; end if;
  select count(*) into n from public.ai_menu_imports where week_id = wk; if n <> 1 then raise exception 'imports %', n; end if;
  -- Thursday sees Sunday surplus inserted earlier in the same call: 870-600=270, 500-270=230 → 1 pack.
  select packages into n from public.weekly_shopping_items where week_id = wk and item_key = 'activia_thu';
  if n <> 1 then raise exception 'thursday packs %', n; end if;

  -- 3. Re-import replaces blocks and shopping instead of duplicating, keeps the same week.
  perform public.ai_import_week(fam, wk, '2026-11-02', meals, '[]', '[]',
    jsonb_build_object('schema_version','family-meal-plan-v3','payload','{}'::jsonb), '{}');
  select count(*) into n from public.ai_menu_cook_blocks where week_id = wk; if n <> 0 then raise exception 'blocks after reimport %', n; end if;
  select count(*) into n from public.weekly_shopping_items where week_id = wk; if n <> 0 then raise exception 'shop after reimport %', n; end if;
  select count(*) into n from public.weekly_plans where family_id = fam; if n <> 1 then raise exception 'weeks %', n; end if;

  -- 4. A second id for an existing week is rejected.
  begin
    perform public.ai_import_week(fam, gen_random_uuid(), '2026-11-02', meals, '[]', '[]', '{}', '{}');
    raise exception 'expected conflict';
  exception when serialization_failure then null;
  end;

  delete from public.ai_menu_imports where family_id = fam;
  delete from public.weekly_plans where family_id = fam;
  delete from public.families where id = fam;
  raise notice 'ai_import_week: ok';
end $$;
