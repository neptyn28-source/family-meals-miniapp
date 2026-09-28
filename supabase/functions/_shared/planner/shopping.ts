import type {
  IngredientPrice,
  InventoryItem,
  PlannedMeal,
  ShoppingLine,
  ShoppingResult,
} from "./types.ts";
import { IngredientIndex, stateCompatible, toDefaultUnit } from "./normalize.ts";

const EPS = 1e-6;

function round(value: number, digits = 1): number {
  const k = 10 ** digits;
  return Math.round(value * k) / k;
}

/**
 * Data model: each meal row stores the consumption of THIS slot on THIS day.
 * A two-day batch therefore appears as two rows each holding its own share,
 * and the shopping list is a plain sum — no batch multiplier anywhere.
 */
export function aggregateRequirements(meals: PlannedMeal[]) {
  const req = new Map<string, { ingredient_id: string | null; name: string; unit: string; state: string; amount: number }>();
  let manualWithout = 0;
  for (const meal of meals) {
    if (!meal.ingredients?.length) {
      if (meal.source === "manual") manualWithout++;
      continue;
    }
    for (const line of meal.ingredients) {
      const amount = Number(line.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const key = `${line.ingredient_id ?? "name:" + line.name}|${line.unit}|${line.state}`;
      const cur = req.get(key) ?? { ingredient_id: line.ingredient_id, name: line.name, unit: line.unit, state: line.state, amount: 0 };
      cur.amount += amount;
      req.set(key, cur);
    }
  }
  return { requirements: [...req.values()], manualWithout };
}

export function pickPrice(prices: IngredientPrice[], ingredientId: string, preferredStore?: string | null) {
  const own = prices.filter((p) => p.ingredient_id === ingredientId && p.price_rub > 0 && p.package_amount > 0);
  if (!own.length) return null;
  if (preferredStore) {
    const pref = own.filter((p) => p.store === preferredStore);
    if (pref.length) return pref.sort((a, b) => a.price_rub / a.package_amount - b.price_rub / b.package_amount)[0];
  }
  return own.sort((a, b) => a.price_rub / a.package_amount - b.price_rub / b.package_amount)[0];
}

export function buildShopping(args: {
  meals: PlannedMeal[];
  inventory: InventoryItem[];
  index: IngredientIndex;
  prices: IngredientPrice[];
  budget_rub: number;
  preferred_store?: string | null;
}): ShoppingResult {
  const { meals, index, prices, budget_rub } = args;
  const { requirements, manualWithout } = aggregateRequirements(meals);

  // Working copy of stock, urgent items consumed first. Never mutates the input.
  const stock = args.inventory
    .map((item) => ({
      id: item.id,
      ingredient_id: item.ingredient_id ?? index.resolve(item.name),
      unit: String(item.unit),
      state: String(item.state),
      urgent: !!item.urgent,
      remaining: Math.max(0, Number(item.quantity) || 0),
    }))
    .sort((a, b) => Number(b.urgent) - Number(a.urgent));

  const allocations: ShoppingResult["allocations"] = [];
  const lines: ShoppingLine[] = [];

  for (const r of requirements) {
    let need = r.amount;
    let covered = 0;
    const ing = r.ingredient_id ? index.get(r.ingredient_id) : undefined;

    if (ing) {
      for (const s of stock) {
        if (need <= EPS) break;
        if (s.remaining <= EPS || s.ingredient_id !== ing.id) continue;
        if (!stateCompatible(r.state, s.state)) continue;
        const availableInReqUnit = toDefaultUnit(ing, s.remaining, s.unit);
        if (availableInReqUnit === null) continue;
        const use = Math.min(need, availableInReqUnit);
        const factor = s.remaining / availableInReqUnit; // stock units per requirement unit
        s.remaining -= use * factor;
        need -= use;
        covered += use;
        allocations.push({ inventory_id: s.id, ingredient_id: ing.id, amount: round(use, 3) });
      }
    }

    const toBuy = Math.max(0, need);
    const price = ing ? pickPrice(prices, ing.id, args.preferred_store) : null;
    let packageCount: number | null = null;
    let purchase: number | null = null;
    let cost: number | null = null;
    let packAmount: number | null = null;
    if (price && ing) {
      const packInReq = toDefaultUnit(ing, price.package_amount, price.package_unit);
      if (packInReq && packInReq > 0) {
        packAmount = packInReq;
        packageCount = toBuy > EPS ? Math.ceil(toBuy / packInReq - 1e-9) : 0;
        purchase = packageCount * packInReq;
        cost = round(packageCount * price.price_rub, 2);
      }
    }
    const priceKnown = cost !== null;
    lines.push({
      ingredient_id: r.ingredient_id,
      name: ing?.canonical_name ?? r.name,
      unit: r.unit,
      state: r.state,
      required: round(r.amount),
      from_inventory: round(covered),
      to_buy: round(toBuy),
      package_amount: packAmount,
      package_count: packageCount,
      purchase_amount: purchase === null ? null : round(purchase),
      estimated_cost_rub: cost,
      store: priceKnown ? price!.store : null,
      price_known: priceKnown || toBuy <= EPS,
      price_verified: priceKnown ? !!price!.manually_verified_at : toBuy <= EPS,
    });
  }

  const buying = lines.filter((l) => l.to_buy > EPS);
  const estimated = round(buying.reduce((s, l) => s + (l.estimated_cost_rub ?? 0), 0), 2);
  const unpriced = buying.filter((l) => l.estimated_cost_rub === null).length;
  const priced = buying.length - unpriced;
  const unverified = buying.filter((l) => l.estimated_cost_rub !== null && !l.price_verified).length;

  let status: ShoppingResult["budget_status"];
  if (estimated > budget_rub + EPS) status = "over"; // over even with a partial sum — definitely over
  else if (unpriced > 0 || manualWithout > 0) status = "unverified";
  else status = "within";

  lines.sort((a, b) => (b.to_buy > EPS ? 1 : 0) - (a.to_buy > EPS ? 1 : 0) || a.name.localeCompare(b.name, "ru"));

  return {
    lines,
    allocations,
    estimated_cost_rub: estimated,
    priced_count: priced,
    unpriced_count: unpriced,
    unverified_price_count: unverified,
    budget_rub,
    budget_status: status,
    manual_meals_without_ingredients: manualWithout,
  };
}
