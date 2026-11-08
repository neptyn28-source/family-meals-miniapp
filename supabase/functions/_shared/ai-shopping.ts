import {
  AiMenuValidationError,
  inventoryUsageCompatible,
  normalizeIngredientName,
  type AiMenuPlan,
} from "./ai-menu.ts";
import {
  IngredientIndex,
  stateCompatible,
  toDefaultUnit,
} from "./planner/normalize.ts";
import type { Ingredient, IngredientPrice } from "./planner/types.ts";

// Pure shopping calculation for an imported AI menu. ai-menu-api loads the rows from
// Supabase and passes them here, so the same code is exercised by unit tests.

export function makeIngredientIndex(catalogRows: any[], aliasRows: any[]) {
  const aliases = new Map<string, string[]>();
  for (const a of aliasRows) {
    const list = aliases.get(String(a.ingredient_id)) ?? [];
    list.push(String(a.alias_norm));
    aliases.set(String(a.ingredient_id), list);
  }
  const ingredients: Ingredient[] = catalogRows.map((x) => ({
    id: String(x.id),
    canonical_name: String(x.canonical_name),
    category: String(x.category),
    tags: Array.isArray(x.tags) ? x.tags : [],
    default_unit: x.default_unit,
    grams_per_piece: x.grams_per_piece == null ? null : Number(x.grams_per_piece),
    kcal_per_100g: x.kcal_per_100g == null ? null : Number(x.kcal_per_100g),
    aliases: aliases.get(String(x.id)) ?? [],
    active: Boolean(x.active),
  }));
  return { ingredients, index: new IngredientIndex(ingredients) };
}

export function priceFor(
  prices: IngredientPrice[],
  ingredientId: string,
  preferredStore: string | null,
) {
  const rows = prices.filter((x) => x.ingredient_id === ingredientId && x.price_rub > 0 && x.package_amount > 0);
  if (!rows.length) return null;
  const preferred = preferredStore ? rows.filter((x) => x.store === preferredStore) : [];
  const candidates = preferred.length ? preferred : rows;
  return candidates.sort((a, b) => a.price_rub / a.package_amount - b.price_rub / b.package_amount)[0];
}

export type AiShoppingInput = {
  familyId: string;
  weekId: string;
  plan: AiMenuPlan;
  settings: any;
  catalogRows: any[];
  aliasRows: any[];
  inventoryRows: any[];
  globalPriceRows: any[];
  familyPriceRows: any[];
  oldShoppingRows: any[];
};

export function computeAiShopping(args: AiShoppingInput) {
  const {
    familyId,
    weekId,
    plan,
    settings,
    catalogRows,
    aliasRows,
    inventoryRows,
    globalPriceRows,
    familyPriceRows,
    oldShoppingRows,
  } = args;

  const addIsoDays = (value: string, days: number) => {
    const d = new Date(value + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const shoppingTripForBlock = (block: AiMenuPlan["cook_blocks"][number]) => {
    const firstServe = [...block.serves].map((x) => x.date).sort()[0] || plan.week_start;
    return firstServe < addIsoDays(plan.week_start, 3) ? "sunday" : "thursday";
  };
  const purchaseOnForTrip = (trip: string) =>
    trip === "thursday" ? addIsoDays(plan.week_start, 3) : addIsoDays(plan.week_start, -1);

  const { ingredients, index } = makeIngredientIndex(catalogRows, aliasRows);
  const byId = new Map(ingredients.map((x) => [x.id, x]));

  const overridden = new Set(familyPriceRows.map((x: any) => String(x.ingredient_id) + "|" + String(x.store)));
  const prices: IngredientPrice[] = [
    ...globalPriceRows
      .filter((x: any) => !overridden.has(String(x.ingredient_id) + "|" + String(x.store)))
      .map((x: any) => ({
        ingredient_id: String(x.ingredient_id),
        store: String(x.store),
        price_rub: Number(x.price_rub),
        package_amount: Number(x.package_amount),
        package_unit: x.package_unit,
        manually_verified_at: x.manually_verified_at ?? null,
      })),
    ...familyPriceRows.map((x: any) => ({
      ingredient_id: String(x.ingredient_id),
      store: String(x.store),
      price_rub: Number(x.price_rub),
      package_amount: Number(x.package_amount),
      package_unit: x.package_unit,
      manually_verified_at: x.manually_verified_at,
    })),
  ];

  type Requirement = {
    key: string;
    ingredient_id: string | null;
    name: string;
    amount: number;
    unit: string;
    state: string;
    use: "cooking" | "direct";
    shopping_trip: "sunday" | "thursday";
    purchase_on: string;
    used_for: { date: string; meal_type: string; title: string; block_id: string }[];
  };
  const reqMap = new Map<string, Requirement>();

  for (const block of plan.cook_blocks) {
    const trip = shoppingTripForBlock(block) as "sunday" | "thursday";
    const purchaseOn = purchaseOnForTrip(trip);
    for (const line of block.ingredients) {
      const ingredientId = index.resolve(line.name);
      const ing = ingredientId ? byId.get(ingredientId) : undefined;
      if (ing) {
        const converted = toDefaultUnit(ing, Number(line.amount), line.unit);
        if (converted == null) {
          throw new AiMenuValidationError([
            "Нельзя преобразовать " + line.name + ": " + line.amount + " " + line.unit + " в " + ing.default_unit + ". Исправь единицу в меню.",
          ]);
        }
        const baseKey = ingredientId + "|" + ing.default_unit + "|" + line.state + "|" + line.use;
        const key = trip + "|" + baseKey;
        const row = reqMap.get(key) ?? {
          key,
          ingredient_id: ingredientId,
          name: ing.canonical_name,
          amount: 0,
          unit: ing.default_unit,
          state: line.state,
          use: line.use,
          shopping_trip: trip,
          purchase_on: purchaseOn,
          used_for: [],
        };
        row.amount += converted;
        for (const serve of block.serves) {
          const usageKey = serve.date + "|" + serve.meal_type + "|" + block.id;
          if (!row.used_for.some((x) => x.date + "|" + x.meal_type + "|" + x.block_id === usageKey)) {
            row.used_for.push({ date: serve.date, meal_type: serve.meal_type, title: block.title, block_id: block.id });
          }
        }
        reqMap.set(key, row);
      } else {
        const normalized = normalizeIngredientName(line.name);
        const baseKey = "name:" + normalized + "|" + line.unit + "|" + line.state + "|" + line.use;
        const key = trip + "|" + baseKey;
        const row = reqMap.get(key) ?? {
          key,
          ingredient_id: null,
          name: line.name,
          amount: 0,
          unit: line.unit,
          state: line.state,
          use: line.use,
          shopping_trip: trip,
          purchase_on: purchaseOn,
          used_for: [],
        };
        row.amount += Number(line.amount);
        for (const serve of block.serves) {
          const usageKey = serve.date + "|" + serve.meal_type + "|" + block.id;
          if (!row.used_for.some((x) => x.date + "|" + x.meal_type + "|" + x.block_id === usageKey)) {
            row.used_for.push({ date: serve.date, meal_type: serve.meal_type, title: block.title, block_id: block.id });
          }
        }
        reqMap.set(key, row);
      }
    }
  }

  const stock = inventoryRows.map((x: any) => ({
    id: String(x.id),
    ingredient_id: x.ingredient_id ? String(x.ingredient_id) : index.resolve(String(x.name)),
    name_norm: normalizeIngredientName(String(x.name)),
    quantity: Math.max(0, Number(x.quantity) || 0),
    unit: String(x.unit),
    state: String(x.state),
    usage_mode: String(x.usage_mode ?? "any"),
    urgent: Boolean(x.urgent),
  })).sort((a: any, b: any) => {
    const restricted = Number(b.usage_mode === "cooking_only") - Number(a.usage_mode === "cooking_only");
    return restricted || Number(b.urgent) - Number(a.urgent);
  });

  const rows: any[] = [];
  let estimated = 0;
  let unpriced = 0;
  let unverified = 0;

  const orderedRequirements = [...reqMap.values()].sort((a, b) => {
    const tripOrder = a.shopping_trip === b.shopping_trip ? 0 : a.shopping_trip === "sunday" ? -1 : 1;
    const useOrder = a.use === b.use ? 0 : a.use === "cooking" ? -1 : 1;
    return tripOrder || useOrder || a.name.localeCompare(b.name, "ru");
  });

  for (const req of orderedRequirements) {
    let need = req.amount;
    let coveredBeforeTrip = 0;
    const ing = req.ingredient_id ? byId.get(req.ingredient_id) : undefined;

    for (const item of stock) {
      if (need <= 1e-9 || item.quantity <= 1e-9) continue;
      const sameProduct = req.ingredient_id
        ? item.ingredient_id === req.ingredient_id
        : item.name_norm === normalizeIngredientName(req.name);
      if (!sameProduct || !stateCompatible(req.state, item.state)) continue;
      if (!inventoryUsageCompatible(item.usage_mode, req.use)) continue;

      let available = item.quantity;
      let backFactor = 1;
      if (ing) {
        const converted = toDefaultUnit(ing, item.quantity, item.unit);
        if (converted == null) continue;
        available = converted;
        backFactor = item.quantity / converted;
      } else if (item.unit !== req.unit) {
        continue;
      }

      const use = Math.min(need, available);
      need -= use;
      coveredBeforeTrip += use;
      item.quantity -= use * backFactor;
    }

    const toBuy = Math.max(0, need);
    let packages: number | null = null;
    let packageQuantity: number | null = null;
    let purchaseQuantity: number | null = null;
    let price: number | null = null;
    let store: string | null = null;
    let priceKnown = toBuy <= 1e-9;
    let priceVerified = toBuy <= 1e-9;

    if (toBuy > 1e-9 && ing) {
      const p = priceFor(prices, ing.id, settings?.preferred_store ?? null);
      if (p) {
        const pack = toDefaultUnit(ing, p.package_amount, p.package_unit);
        if (pack && pack > 0) {
          packages = Math.ceil(toBuy / pack - 1e-9);
          packageQuantity = pack;
          purchaseQuantity = packages * pack;
          price = Math.round(packages * p.price_rub * 100) / 100;
          store = p.store;
          priceKnown = true;
          priceVerified = Boolean(p.manually_verified_at);
          estimated += price;
          if (!priceVerified) unverified++;

          const surplus = Math.max(0, purchaseQuantity - toBuy);
          if (surplus > 1e-9) {
            stock.push({
              id: "purchase:" + req.key,
              ingredient_id: req.ingredient_id,
              name_norm: normalizeIngredientName(req.name),
              quantity: surplus,
              unit: req.unit,
              state: req.state,
              usage_mode: "any",
              urgent: false,
            });
          }
        }
      }
    }
    // A verified pack size may be known even when no store/price is known.
    // Still round to full retail packs and carry surplus into the next trip.
    if (toBuy > 1e-9 && packages === null && ing?.id === "activia_drink_grains") {
      packageQuantity = 870;
      packages = Math.ceil(toBuy / 870 - 1e-9);
      purchaseQuantity = packages * 870;
      const surplus = Math.max(0, purchaseQuantity - toBuy);
      if (surplus > 1e-9) {
        stock.push({
          id: "purchase:" + req.key,
          ingredient_id: req.ingredient_id,
          name_norm: normalizeIngredientName(req.name),
          quantity: surplus,
          unit: req.unit,
          state: req.state,
          usage_mode: "any",
          urgent: false,
        });
      }
    }
    if (toBuy > 1e-9 && !priceKnown) unpriced++;

    rows.push({
      family_id: familyId,
      week_id: weekId,
      item_key: req.key,
      ingredient_id: req.ingredient_id,
      product_name: req.name,
      required_quantity: Math.round(req.amount * 1000) / 1000,
      home_quantity: Math.round(coveredBeforeTrip * 1000) / 1000,
      to_buy: Math.round(toBuy * 1000) / 1000,
      package_quantity: packageQuantity,
      packages,
      purchase_quantity: purchaseQuantity,
      unit: req.unit,
      state: req.state,
      store,
      estimated_price: price,
      price_known: priceKnown,
      price_verified: priceVerified,
      shopping_trip: req.shopping_trip,
      purchase_on: req.purchase_on,
      used_for: req.used_for,
    });
  }

  const old = new Map(oldShoppingRows.map((x: any) => [String(x.item_key), x]));
  for (const row of rows) {
    const prev: any = old.get(row.item_key);
    const same =
      prev &&
      Math.abs(Number(prev.to_buy) - Number(row.to_buy)) < 0.001 &&
      Math.abs(Number(prev.purchase_quantity ?? 0) - Number(row.purchase_quantity ?? 0)) < 0.001;
    row.purchased = Boolean(same && prev.purchased);
    row.purchased_by = row.purchased ? prev.purchased_by : null;
    row.purchased_at = row.purchased ? prev.purchased_at : null;
    row.updated_at = new Date().toISOString();
  }

  const budget = Number(settings?.weekly_budget_rub ?? 8000);
  const status = estimated > budget
    ? "over"
    : unpriced > 0
    ? "unverified"
    : "within";

  return {
    rows,
    estimated_cost_rub: Math.round(estimated * 100) / 100,
    budget_rub: budget,
    budget_status: status,
    unpriced_count: unpriced,
    unverified_price_count: unverified,
  };
}
