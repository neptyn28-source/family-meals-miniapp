import type {
  ConstraintFailure,
  FamilySettings,
  IngredientCap,
  InventoryItem,
  PlannedMeal,
  Recipe,
  ShoppingResult,
  StructuredRule,
} from "./types.ts";
import { MAIN_MEAL_TYPES, MEAL_TYPES } from "./types.ts";
import type { IngredientIndex } from "./normalize.ts";
import { toDefaultUnit } from "./normalize.ts";
import { ingredientViolations, recipeViolations, tagLimits } from "./rules.ts";
import { batchGroupOf, batchKey, childAtKindergarten, eatersFor, MEAL_LABELS, weekDates } from "./calendar.ts";
import { KINDERGARTEN_LABEL } from "./meal.ts";
import { aggregateRequirements } from "./shopping.ts";

export interface ValidationContext {
  week_start: string;
  settings: FamilySettings;
  rules: StructuredRule[];
  caps: IngredientCap[];
  index: IngredientIndex;
  recipes: Map<string, Recipe>;
  inventory: InventoryItem[];
  shopping: ShoppingResult | null;
  blacklist?: string[];
}

const f = (code: string, message: string, details?: Record<string, unknown>): ConstraintFailure => ({ code, message, details });

/** Weekly consumption per ingredient in its default unit. */
export function weeklyTotals(meals: PlannedMeal[]) {
  const totals = new Map<string, number>();
  for (const m of meals) for (const l of m.ingredients ?? []) {
    if (!l.ingredient_id) continue;
    totals.set(l.ingredient_id, (totals.get(l.ingredient_id) ?? 0) + Number(l.amount || 0));
  }
  return totals;
}

export function capViolations(totals: Map<string, number>, caps: IngredientCap[], index: IngredientIndex): ConstraintFailure[] {
  const out: ConstraintFailure[] = [];
  for (const cap of caps) {
    if (!cap.enabled) continue;
    if (cap.ingredient_id) {
      const ing = index.get(cap.ingredient_id);
      if (!ing) continue;
      const total = totals.get(cap.ingredient_id) ?? 0;
      const capInUnit = toDefaultUnit(ing, cap.max_amount, cap.unit);
      if (capInUnit !== null && total > capInUnit + 1e-6) {
        out.push(f("ingredient_cap", `Слишком много: ${ing.canonical_name} — ${Math.round(total)} ${ing.default_unit} за неделю при лимите ${cap.max_amount} ${cap.unit}`, { ingredient_id: ing.id, total, cap: cap.max_amount }));
      }
    } else if (cap.category) {
      let total = 0;
      for (const [id, amount] of totals) {
        const ing = index.get(id);
        if (ing && ing.category === cap.category && ing.default_unit === cap.unit) total += amount;
      }
      if (total > cap.max_amount + 1e-6) {
        out.push(f("category_cap", `Слишком много категории «${cap.category}»: ${Math.round(total)} ${cap.unit} при лимите ${cap.max_amount}`, { category: cap.category, total }));
      }
    }
  }
  return out;
}

/** Distinct "cooking events": one per batch, one per standalone meal. */
export function cookingEvents(meals: PlannedMeal[]) {
  const seen = new Map<string, PlannedMeal>();
  for (const m of meals) {
    const key = m.batch_key ?? `${m.meal_date}|${m.meal_type}`;
    if (!seen.has(key)) seen.set(key, m);
  }
  return [...seen.values()];
}

export function validatePlan(meals: PlannedMeal[], ctx: ValidationContext): { ok: boolean; failures: ConstraintFailure[]; warnings: ConstraintFailure[] } {
  const failures: ConstraintFailure[] = [];
  const warnings: ConstraintFailure[] = [];
  const s = ctx.settings;
  const dates = weekDates(ctx.week_start);

  const slots = new Map<string, PlannedMeal>();
  for (const m of meals) {
    const key = `${m.meal_date}|${m.meal_type}`;
    if (slots.has(key)) failures.push(f("duplicate_slot", `Дублируется слот ${m.meal_date} ${MEAL_LABELS[m.meal_type]}`));
    slots.set(key, m);
    if (!dates.includes(m.meal_date)) failures.push(f("out_of_week", `Блюдо вне недели: ${m.meal_date}`));
    if (!MEAL_TYPES.includes(m.meal_type)) failures.push(f("bad_meal_type", `Неизвестный тип приёма пищи: ${m.meal_type}`));
  }
  for (const d of dates) for (const t of MEAL_TYPES) {
    if (!slots.has(`${d}|${t}`)) failures.push(f("missing_slot", `Не заполнен слот: ${d} ${MEAL_LABELS[t]}`));
  }

  const generated = meals.filter((m) => m.source === "generated");

  for (const m of meals) {
    const recipe = m.recipe_id ? ctx.recipes.get(m.recipe_id) : undefined;
    const ids = (m.ingredients ?? []).map((l) => l.ingredient_id).filter(Boolean) as string[];
    const v = recipe
      ? recipeViolations(recipe, m.meal_type, ctx.rules, ctx.index, "hard")
      : ingredientViolations(ids, ctx.rules, ctx.index, null, "hard");
    if (recipe) v.push(...ingredientViolations(ids, ctx.rules, ctx.index, recipe.tags, "hard"));
    const unique = new Map(v.map((x) => [x.message, x]));
    for (const x of unique.values()) {
      const target = m.source === "manual" ? warnings : failures;
      target.push({ ...x, message: `${m.meal_date} ${MEAL_LABELS[m.meal_type]}: ${x.message}` });
    }
    if (m.source === "generated" && recipe && ctx.blacklist?.includes(recipe.id)) {
      failures.push(f("blacklisted", `«${recipe.title}» отмечено как «больше не предлагать»`));
    }
    if (recipe && m.source === "generated") {
      const missing = recipe.equipment.filter((e) => !s.equipment.includes(e));
      if (missing.length) failures.push(f("equipment", `«${recipe.title}» требует недоступную технику: ${missing.join(", ")}`));
    }
  }

  for (const d of dates) {
    const lunch = slots.get(`${d}|lunch`);
    const kg = childAtKindergarten(d, s);
    if (lunch && lunch.source === "generated") {
      if (kg) {
        if (lunch.portions?.child !== KINDERGARTEN_LABEL || lunch.eaters.includes("child")) {
          failures.push(f("child_kindergarten", `${d}: детский обед должен быть «${KINDERGARTEN_LABEL}»`));
        }
      } else if (!lunch.eaters.includes("child") || !lunch.portion_grams?.child) {
        failures.push(f("child_weekend_lunch", `${d}: в выходной у ребёнка должен быть обед дома`));
      }
    }
    for (const t of MEAL_TYPES) {
      const m = slots.get(`${d}|${t}`);
      if (!m || m.source !== "generated") continue;
      const expected = eatersFor(d, t, s);
      for (const e of expected) if (!m.eaters.includes(e)) failures.push(f("missing_eater", `${d} ${MEAL_LABELS[t]}: не назначена порция (${e})`));
      const recipe = m.recipe_id ? ctx.recipes.get(m.recipe_id) : undefined;
      if (recipe && m.eaters.includes("child") && !recipe.child_ok) {
        failures.push(f("child_unsuitable", `${d} ${MEAL_LABELS[t]}: «${recipe.title}» не подходит ребёнку`));
      }
    }
    if (s.wife_snacks >= 1 && !slots.get(`${d}|snack1`)?.eaters?.includes("wife") && slots.get(`${d}|snack1`)?.source === "generated") {
      failures.push(f("wife_snack", `${d}: у жены нет первого перекуса`));
    }
    if (s.wife_snacks >= 2 && !slots.get(`${d}|snack2`)?.eaters?.includes("wife") && slots.get(`${d}|snack2`)?.source === "generated") {
      failures.push(f("wife_snack", `${d}: у жены нет второго перекуса`));
    }
  }

  for (const m of generated) {
    if (!MAIN_MEAL_TYPES.includes(m.meal_type)) continue;
    for (const [eater, grams] of Object.entries(m.portion_grams ?? {})) {
      const r = s.portion_ranges[eater as keyof typeof s.portion_ranges];
      if (r && (grams! < r.min || grams! > r.max)) {
        failures.push(f("portion_bounds", `${m.meal_date} ${MEAL_LABELS[m.meal_type]}: порция ${eater} ${grams} г вне диапазона ${r.min}–${r.max} г`));
      }
    }
  }

  for (const t of MAIN_MEAL_TYPES) {
    for (let i = 0; i < 7; i++) {
      const m = slots.get(`${dates[i]}|${t}`);
      if (!m || m.source !== "generated") continue;
      const group = batchGroupOf(i);
      const expectedKey = batchKey(ctx.week_start, group, t);
      const partners = group.map((gi) => slots.get(`${dates[gi]}|${t}`)).filter(Boolean) as PlannedMeal[];
      const allGenerated = partners.every((p) => p.source === "generated");
      if (group.length === 1) {
        if (m.batch_key && m.batch_key !== expectedKey) failures.push(f("batch_sunday", `Воскресенье (${t}) должно готовиться отдельно`));
        continue;
      }
      if (allGenerated) {
        if (m.batch_key !== expectedKey) failures.push(f("batch_key", `${m.meal_date} ${MEAL_LABELS[t]}: неверная партия`));
        const recipeIds = new Set(partners.map((p) => p.recipe_id));
        if (recipeIds.size !== 1) failures.push(f("batch_mismatch", `${m.meal_date} ${MEAL_LABELS[t]}: блюда двухдневной партии различаются`));
      }
    }
  }
  for (const m of generated) {
    if (!MAIN_MEAL_TYPES.includes(m.meal_type) && m.batch_key) failures.push(f("batch_non_main", `${m.meal_date} ${MEAL_LABELS[m.meal_type]}: завтраки и перекусы не готовятся партиями`));
  }

  const rep = s.repetition;
  const countBy = (list: PlannedMeal[]) => {
    const c = new Map<string, number>();
    for (const m of list) if (m.recipe_id) c.set(m.recipe_id, (c.get(m.recipe_id) ?? 0) + 1);
    return c;
  };
  for (const [id, n] of countBy(meals.filter((m) => m.meal_type === "breakfast"))) {
    if (n > rep.max_same_breakfast) failures.push(f("repeat_breakfast", `Завтрак «${ctx.recipes.get(id)?.title ?? id}» повторяется ${n} раз (лимит ${rep.max_same_breakfast})`));
  }
  for (const [id, n] of countBy(meals.filter((m) => m.meal_type === "snack1" || m.meal_type === "snack2"))) {
    if (n > rep.max_same_snack) failures.push(f("repeat_snack", `Перекус «${ctx.recipes.get(id)?.title ?? id}» повторяется ${n} раз (лимит ${rep.max_same_snack})`));
  }
  const mainEvents = cookingEvents(meals.filter((m) => MAIN_MEAL_TYPES.includes(m.meal_type)));
  for (const [id, n] of countBy(mainEvents)) {
    if (n > rep.max_main_batches_per_recipe) failures.push(f("repeat_main", `Основное блюдо «${ctx.recipes.get(id)?.title ?? id}» готовится ${n} раз (лимит ${rep.max_main_batches_per_recipe})`));
  }
  const sideCounts = new Map<string, number>();
  for (const e of mainEvents) {
    const side = e.recipe_id ? ctx.recipes.get(e.recipe_id)?.side : null;
    if (side) sideCounts.set(side, (sideCounts.get(side) ?? 0) + 1);
  }
  for (const [side, n] of sideCounts) {
    const max = rep.max_side_batches[side];
    if (max !== undefined && n > max) failures.push(f("repeat_side", `Гарнир «${side}» встречается ${n} раз (лимит ${max})`));
  }
  const tagCounts = new Map<string, number>();
  for (const e of cookingEvents(meals)) {
    const r = e.recipe_id ? ctx.recipes.get(e.recipe_id) : undefined;
    for (const t of r?.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    const ingTags = new Set<string>();
    for (const l of e.ingredients ?? []) for (const t of (l.ingredient_id && ctx.index.get(l.ingredient_id)?.tags) || []) ingTags.add(t);
    for (const t of ingTags) if (!r?.tags.includes(t)) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  }
  const soupMax = Math.min(rep.max_soups_per_week, tagLimits(ctx.rules, "hard").get("soup") ?? Infinity);
  if ((tagCounts.get("soup") ?? 0) > soupMax) failures.push(f("soup_limit", `Суп ${tagCounts.get("soup")} раз за неделю (лимит ${soupMax})`));
  for (const [tag, max] of tagLimits(ctx.rules, "hard")) {
    if (tag === "soup") continue;
    if ((tagCounts.get(tag) ?? 0) > max) failures.push(f("tag_limit", `«${tag}» встречается ${tagCounts.get(tag)} раз (лимит ${max})`));
  }

  const totals = weeklyTotals(meals);
  failures.push(...capViolations(totals, ctx.caps, ctx.index));
  for (const m of generated) for (const l of m.ingredients) {
    if (l.unit !== "pcs" && l.amount > 1500) failures.push(f("slot_quantity", `${m.meal_date} ${MEAL_LABELS[m.meal_type]}: ${l.name} ${l.amount} ${l.unit} на один приём — нереалистично`));
  }

  if (ctx.shopping) {
    const used = new Map<string, number>();
    for (const a of ctx.shopping.allocations) used.set(a.inventory_id, (used.get(a.inventory_id) ?? 0) + a.amount);
    for (const item of ctx.inventory) {
      const u = used.get(item.id) ?? 0;
      const ing = item.ingredient_id ? ctx.index.get(item.ingredient_id) : undefined;
      const have = ing ? toDefaultUnit(ing, Number(item.quantity), String(item.unit)) ?? Number(item.quantity) : Number(item.quantity);
      if (u > have + 0.01) failures.push(f("inventory_overuse", `Из остатков «${item.name}» использовано больше, чем есть`));
    }
    const { requirements } = aggregateRequirements(meals);
    const reqTotal = requirements.reduce((a, r) => a + r.amount, 0);
    const shopTotal = ctx.shopping.lines.reduce((a, l) => a + l.required, 0);
    if (Math.abs(reqTotal - shopTotal) > 0.5 * ctx.shopping.lines.length + 0.5) {
      failures.push(f("shopping_mismatch", "Список покупок не сходится с меню"));
    }
    for (const l of ctx.shopping.lines) {
      if (Math.abs(l.required - l.from_inventory - l.to_buy) > 0.2) failures.push(f("shopping_line", `Ошибка расчёта покупки: ${l.name}`));
    }
    if (ctx.shopping.budget_status === "over") {
      failures.push(f("budget", `Оценка покупок ${Math.round(ctx.shopping.estimated_cost_rub)} ₽ больше бюджета ${s.weekly_budget_rub} ₽`, { estimated: ctx.shopping.estimated_cost_rub }));
    } else if (ctx.shopping.budget_status === "unverified") {
      const w = f("budget_unverified", `Бюджет не подтверждён: нет цены у ${ctx.shopping.unpriced_count} продукт(ов)`);
      if (s.allow_unverified_budget) warnings.push(w);
      else failures.push(w);
    }
  }

  if (s.kcal_day_ranges) {
    for (const [eater, range] of Object.entries(s.kcal_day_ranges)) {
      if (!range) continue;
      const perDay = approxKcalPerDay(meals, eater as "husband" | "wife" | "child", ctx);
      if (perDay !== null && (perDay < range.min || perDay > range.max)) {
        failures.push(f("kcal_range", `Примерная калорийность (${eater}) ≈${Math.round(perDay)} ккал/день вне заданного диапазона ${range.min}–${range.max}`));
      }
    }
  }

  return { ok: failures.length === 0, failures, warnings };
}

/** Very approximate: proportional share of each meal's kcal by portion grams. Null when data missing. */
export function approxKcalPerDay(meals: PlannedMeal[], eater: "husband" | "wife" | "child", ctx: Pick<ValidationContext, "index">): number | null {
  let kcal = 0;
  for (const m of meals) {
    const grams = m.portion_grams?.[eater];
    if (!grams) continue;
    const total = Object.values(m.portion_grams ?? {}).reduce((a, b) => a + (b ?? 0), 0);
    if (!total) continue;
    let mealKcal = 0;
    for (const l of m.ingredients) {
      const ing = l.ingredient_id ? ctx.index.get(l.ingredient_id) : undefined;
      if (!ing || ing.kcal_per_100g == null) return null;
      const g = ing.default_unit === "pcs" ? (ing.grams_per_piece ?? 0) * l.amount : l.amount;
      mealKcal += (g * ing.kcal_per_100g) / 100;
    }
    kcal += mealKcal * (grams / total);
  }
  return kcal / 7;
}
