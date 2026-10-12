-- Safeguard retail pack sizes and prevent fractional fruit purchases.
-- Activia drink with grains is sold in 870 g bottles; unknown store/price stay null.
create or replace function public.normalize_shopping_retail_pack()
returns trigger language plpgsql set search_path = public as $$
declare
  prior_surplus numeric := 0;
  net_need numeric;
begin
  if new.ingredient_id = 'activia_drink_grains' then
    if new.unit <> 'g' then
      raise exception 'Активия со злаками должна учитываться в граммах, получено %', new.unit;
    end if;
    if new.shopping_trip = 'thursday' then
      select greatest(0, coalesce(sum(purchase_quantity - to_buy),0))
      into prior_surplus
      from public.weekly_shopping_items
      where week_id = new.week_id and ingredient_id = new.ingredient_id
        and shopping_trip = 'sunday';
    end if;
    net_need := greatest(0, new.to_buy - prior_surplus);
    new.to_buy := net_need;
    new.package_quantity := 870;
    new.packages := ceil(net_need / 870)::integer;
    new.purchase_quantity := new.packages * 870;
    new.estimated_price := null;
    new.price_known := false;
    new.price_verified := false;
    new.store := null;
  end if;
  if new.ingredient_id in ('pear','banana','apple') and new.unit = 'pcs' then
    raise exception 'Для фруктов укажите граммы (g), а не штуки (pcs): %', new.product_name;
  end if;
  return new;
end $$;

drop trigger if exists trg_normalize_shopping_retail_pack on public.weekly_shopping_items;
create trigger trg_normalize_shopping_retail_pack
before insert on public.weekly_shopping_items
for each row execute function public.normalize_shopping_retail_pack();
