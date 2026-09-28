-- Harden internal event-trigger function exposure and add covering indexes for new planner tables.
do $
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public';
    execute 'revoke execute on function public.rls_auto_enable() from anon, authenticated';
  end if;
end $;

create index if not exists family_caps_ingredient_idx
  on public.family_ingredient_caps(ingredient_id)
  where ingredient_id is not null;
create index if not exists family_prices_ingredient_idx
  on public.family_ingredient_prices(ingredient_id);
create index if not exists generation_runs_week_idx
  on public.generation_runs(week_id)
  where week_id is not null;
create index if not exists planner_recipe_ingredients_ingredient_idx
  on public.planner_recipe_ingredients(ingredient_id);
create index if not exists weekly_feedback_member_idx
  on public.weekly_meal_feedback(member_id);
create index if not exists weekly_feedback_recipe_idx
  on public.weekly_meal_feedback(recipe_key)
  where recipe_key is not null;
create index if not exists weekly_feedback_week_idx
  on public.weekly_meal_feedback(week_id);
create index if not exists weekly_meals_recipe_key_idx
  on public.weekly_meals(recipe_key)
  where recipe_key is not null;
create index if not exists weekly_shopping_ingredient_idx
  on public.weekly_shopping_items(ingredient_id)
  where ingredient_id is not null;
create index if not exists weekly_shopping_purchased_by_idx
  on public.weekly_shopping_items(purchased_by)
  where purchased_by is not null;
