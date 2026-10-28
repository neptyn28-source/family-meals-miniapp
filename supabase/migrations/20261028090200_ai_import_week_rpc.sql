-- Atomic save of an imported AI menu. Previously ai-menu-api wrote meals, cook blocks, shopping
-- and the week in separate requests: a failure in the middle (e.g. the retail-pack trigger)
-- left new meals with an empty or stale shopping list. One function call = one transaction.
-- Row shapes are the ones ai-menu-api already builds; columns not present keep their defaults.

create or replace function public.ai_import_week(
  p_family_id uuid,
  p_week_id uuid,
  p_week_start date,
  p_meals jsonb,
  p_blocks jsonb,
  p_shopping jsonb,
  p_import jsonb,
  p_week_patch jsonb
) returns public.weekly_plans
language plpgsql
set search_path = public
as $$
declare
  existing_id uuid;
  result public.weekly_plans;
begin
  select id into existing_id
  from public.weekly_plans
  where family_id = p_family_id and week_start = p_week_start
  for update;

  if existing_id is null then
    insert into public.weekly_plans (id, family_id, week_start, status)
    values (p_week_id, p_family_id, p_week_start, 'draft');
  elsif existing_id <> p_week_id then
    raise exception 'week % already exists with another id', p_week_start
      using errcode = '40001'; -- concurrent import of the same week: client may retry
  end if;

  insert into public.weekly_meals (
    week_id, meal_date, meal_type, title, batch_key, portions, portion_components, ingredients,
    recipe, notes, sort_order, source, locked, recipe_key, batch_day, eaters, portion_grams, updated_at
  )
  select
    p_week_id, r.meal_date, r.meal_type, r.title, r.batch_key, coalesce(r.portions, '{}'),
    coalesce(r.portion_components, '{}'), coalesce(r.ingredients, '[]'), coalesce(r.recipe, '{}'),
    r.notes, coalesce(r.sort_order, 0), coalesce(r.source, 'ai_import'), coalesce(r.locked, false),
    r.recipe_key, r.batch_day, r.eaters, coalesce(r.portion_grams, '{}'), now()
  from jsonb_populate_recordset(null::public.weekly_meals, coalesce(p_meals, '[]')) r
  on conflict (week_id, meal_date, meal_type) do update set
    title = excluded.title,
    batch_key = excluded.batch_key,
    portions = excluded.portions,
    portion_components = excluded.portion_components,
    ingredients = excluded.ingredients,
    recipe = excluded.recipe,
    notes = excluded.notes,
    sort_order = excluded.sort_order,
    source = excluded.source,
    locked = excluded.locked,
    recipe_key = excluded.recipe_key,
    batch_day = excluded.batch_day,
    eaters = excluded.eaters,
    portion_grams = excluded.portion_grams,
    updated_at = excluded.updated_at;

  delete from public.ai_menu_cook_blocks where family_id = p_family_id and week_id = p_week_id;
  insert into public.ai_menu_cook_blocks (family_id, week_id, block_key, title, serves, ingredients, recipe)
  select p_family_id, p_week_id, r.block_key, r.title, coalesce(r.serves, '[]'),
    coalesce(r.ingredients, '[]'), coalesce(r.recipe, '{}')
  from jsonb_populate_recordset(null::public.ai_menu_cook_blocks, coalesce(p_blocks, '[]')) r;

  -- Rows are inserted in array order: the retail-pack trigger on Thursday rows reads the
  -- Sunday rows inserted earlier in this same statement, exactly as with the old bulk insert.
  delete from public.weekly_shopping_items where family_id = p_family_id and week_id = p_week_id;
  insert into public.weekly_shopping_items (
    family_id, week_id, item_key, ingredient_id, product_name, required_quantity, home_quantity,
    to_buy, package_quantity, packages, purchase_quantity, unit, state, store, estimated_price,
    price_known, price_verified, purchased, purchased_by, purchased_at, updated_at,
    shopping_trip, purchase_on, used_for
  )
  select
    p_family_id, p_week_id, r.item_key, r.ingredient_id, r.product_name,
    coalesce(r.required_quantity, 0), coalesce(r.home_quantity, 0), coalesce(r.to_buy, 0),
    r.package_quantity, r.packages, r.purchase_quantity, r.unit, r.state, r.store, r.estimated_price,
    coalesce(r.price_known, false), coalesce(r.price_verified, false), coalesce(r.purchased, false),
    r.purchased_by, r.purchased_at, now(), coalesce(r.shopping_trip, 'sunday'), r.purchase_on,
    coalesce(r.used_for, '[]')
  from jsonb_array_elements(coalesce(p_shopping, '[]')) with ordinality as e(j, n)
  cross join lateral jsonb_populate_record(null::public.weekly_shopping_items, e.j) r
  order by e.n;

  insert into public.ai_menu_imports (family_id, week_id, schema_version, payload, imported_by)
  values (
    p_family_id, p_week_id, p_import->>'schema_version', p_import->'payload',
    nullif(p_import->>'imported_by', '')::uuid
  );

  update public.weekly_plans set
    status = coalesce(p_week_patch->>'status', 'draft'),
    validation_ok = coalesce((p_week_patch->>'validation_ok')::boolean, true),
    estimated_cost = (p_week_patch->>'estimated_cost')::numeric,
    budget_status = p_week_patch->>'budget_status',
    planner_version = null,
    ai_import_version = p_week_patch->>'ai_import_version',
    imported_at = now(),
    notes = p_week_patch->>'notes',
    updated_at = now()
  where id = p_week_id and family_id = p_family_id
  returning * into result;

  return result;
end $$;

revoke all on function public.ai_import_week(uuid, uuid, date, jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
