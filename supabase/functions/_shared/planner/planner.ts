// Deterministic constraint-based weekly planner. No network, no LLM.
import type {
  ConstraintFailure,
  IngredientCap,
  MealType,
  PlannedMeal,
  PlannerInput,
  PlanResult,
  Recipe,
} from "./types.ts";
import { MAIN_MEAL_TYPES } from "./types.ts";
import { IngredientIndex, resolveInventory } from "./normalize.ts";
import { assertMonday, BATCH_GROUPS, batchGroupOf, batchKey, eatersFor, weekDates } from "./calendar.ts";
import { buildMeal } from "./meal.ts";
import { preferenceScore, recipeViolations, tagLimits } from "./rules.ts";
import { capViolations, validatePlan, weeklyTotals } from "./validator.ts";
import { buildShopping, pickPrice } from "./shopping.ts";
import { toDefaultUnit } from "./normalize.ts";

export const PLANNER_VERSION = "2.0.0";

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const slotKey = (d: string, t: MealType) => `${d}|${t}`;

/** Which existing meals must be kept untouched. */
export function fixedSlots(input: PlannerInput): Map<string, PlannedMeal> {
  const fixed = new Map<string, PlannedMeal>();
  const scope = input.scope ?? { kind: "week" };
  const dates = weekDates(input.week_start);
  let inScope = (_d: string, _t: MealType) => true;
  if (scope.kind === "day") inScope = (d) => d === scope.date;
  if (scope.kind === "meal") {
    const idx = dates.indexOf(scope.date);
    // a lunch/dinner belongs to a 2-day batch: regenerating it regenerates the whole batch
    const batchDates = MAIN_MEAL_TYPES.includes(scope.meal_type) && idx >= 0 ? batchGroupOf(idx).map((i) => dates[i]) : [scope.date];
    inScope = (d, t) => t === scope.meal_type && batchDates.includes(d);
  }
  for (const m of input.existing) {
    if (m.locked || m.source === "manual" || !inScope(m.meal_date, m.meal_type)) fixed.set(slotKey(m.meal_date, m.meal_type), m);
  }
  return fixed;
}

interface Ctx {
  input: PlannerInput;
  index: IngredientIndex;
  recipes: Map<string, Recipe>;
  urgentIds: Set<string>;
  inventoryIds: Set<string>;
}

function recipeCost(recipe: Recipe, ctx: Ctx): number {
  let cost = 0;
  for (const ri of recipe.ingredients) {
    const ing = ctx.index.get(ri.ingredient_id);
    const p = ing ? pickPrice(ctx.input.prices, ing.id, ctx.input.settings.preferred_store) : null;
    if (!p || !ing) continue;
    const pack = toDefaultUnit(ing, p.package_amount, p.package_unit);
    if (pack) cost += (ri.amount / pack) * p.price_rub;
  }
  return cost;
}

function baseScore(recipe: Recipe, mealType: MealType, ctx: Ctx): number {
  let s = preferenceScore(recipe, mealType, ctx.input.rules, ctx.index);
  s += ctx.input.feedback.recipe_scores[recipe.id] ?? 0;
  for (const ri of recipe.ingredients) {
    if (ctx.urgentIds.has(ri.ingredient_id)) s += 3; // use up urgent perishables first
    else if (ctx.inventoryIds.has(ri.ingredient_id)) s += 0.5;
  }
  return s;
}

function candidates(mealType: MealType, ctx: Ctx, needsChild: boolean, needsBatch: boolean): Recipe[] {
  const s = ctx.input.settings;
  return [...ctx.recipes.values()].filter((r) =>
    r.active &&
    r.meal_types.includes(mealType) &&
    !ctx.input.feedback.blacklist.includes(r.id) &&
    r.equipment.every((e) => s.equipment.includes(e)) &&
    (!needsChild || r.child_ok) &&
    (!needsBatch || r.batchable) &&
    recipeViolations(r, mealType, ctx.input.rules, ctx.index, "hard").length === 0
  );
}

interface AttemptState {
  meals: Map<string, PlannedMeal>;
  mainRecipeUse: Map<string, number>;
  sideUse: Map<string, number>;
  tagUse: Map<string, number>;
  smallUse: Map<string, number>;
}

function countEvent(state: AttemptState, recipe: Recipe, main: boolean) {
  if (main) {
    state.mainRecipeUse.set(recipe.id, (state.mainRecipeUse.get(recipe.id) ?? 0) + 1);
    if (recipe.side) state.sideUse.set(recipe.side, (state.sideUse.get(recipe.side) ?? 0) + 1);
  } else {
    state.smallUse.set(recipe.id, (state.smallUse.get(recipe.id) ?? 0) + 1);
  }
  for (const t of recipe.tags) state.tagUse.set(t, (state.tagUse.get(t) ?? 0) + 1);
}

function fitsCaps(state: AttemptState, extra: PlannedMeal[], caps: IngredientCap[], index: IngredientIndex): boolean {
  const totals = weeklyTotals([...state.meals.values(), ...extra]);
  return capViolations(totals, caps, index).length === 0;
}

function attempt(ctx: Ctx, fixed: Map<string, PlannedMeal>, seed: number, costWeight: number): { meals: PlannedMeal[]; failures: ConstraintFailure[] } {
  const { input, index } = ctx;
  const s = input.settings;
  const rand = rng(seed);
  const dates = weekDates(input.week_start);
  const failures: ConstraintFailure[] = [];
  const hardTagLimits = tagLimits(input.rules, "hard");
  const prefTagLimits = tagLimits(input.rules, "preference");
  const state: AttemptState = { meals: new Map(fixed), mainRecipeUse: new Map(), sideUse: new Map(), tagUse: new Map(), smallUse: new Map() };

  const seenEvents = new Set<string>();
  for (const m of fixed.values()) {
    const r = m.recipe_id ? ctx.recipes.get(m.recipe_id) : undefined;
    if (!r) continue;
    const main = MAIN_MEAL_TYPES.includes(m.meal_type);
    const ev = main ? (m.batch_key ?? slotKey(m.meal_date, m.meal_type)) : slotKey(m.meal_date, m.meal_type);
    if (seenEvents.has(ev)) continue;
    seenEvents.add(ev);
    countEvent(state, r, main);
  }

  const ranked = (list: Recipe[], mealType: MealType) =>
    list
      .map((r) => ({ r, score: baseScore(r, mealType, ctx) - costWeight * recipeCost(r, ctx) + rand() * 2.5 }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.r);

  const tagOk = (r: Recipe) => {
    const soupMax = Math.min(s.repetition.max_soups_per_week, hardTagLimits.get("soup") ?? Infinity);
    if (r.tags.includes("soup") && (state.tagUse.get("soup") ?? 0) >= soupMax) return false;
    for (const t of r.tags) {
      const lim = Math.min(hardTagLimits.get(t) ?? Infinity, prefTagLimits.get(t) ?? Infinity);
      if ((state.tagUse.get(t) ?? 0) >= lim) return false;
    }
    const ingTags = new Set(r.ingredients.flatMap((ri) => index.get(ri.ingredient_id)?.tags ?? []));
    for (const t of ingTags) {
      if (r.tags.includes(t)) continue;
      const lim = hardTagLimits.get(t);
      if (lim !== undefined && (state.tagUse.get(t) ?? 0) >= lim) return false;
    }
    return true;
  };

  for (const group of BATCH_GROUPS) {
    const groupDates = group.map((i) => dates[i]);
    const chosenInGroup = new Set<string>();
    for (const t of MAIN_MEAL_TYPES) {
      const open = groupDates.filter((d) => !fixed.has(slotKey(d, t)));
      if (!open.length) {
        for (const d of groupDates) { const m = fixed.get(slotKey(d, t)); if (m?.recipe_id) chosenInGroup.add(m.recipe_id); }
        continue;
      }
      const fixedPartner = groupDates.map((d) => fixed.get(slotKey(d, t))).find(Boolean);
      const key = batchKey(input.week_start, group, t);
      if (fixedPartner?.recipe_id && ctx.recipes.get(fixedPartner.recipe_id)?.batchable && group.length > 1) {
        const r = ctx.recipes.get(fixedPartner.recipe_id)!;
        for (const d of open) state.meals.set(slotKey(d, t), buildMeal({ recipe: r, date: d, mealType: t, settings: s, index, batch: { key, dates: groupDates } }));
        chosenInGroup.add(r.id);
        continue;
      }
      const cookDates = fixedPartner ? open : groupDates;
      const needsChild = cookDates.some((d) => eatersFor(d, t, s).includes("child"));
      const needsBatch = cookDates.length > 1;
      let placed = false;
      for (const r of ranked(candidates(t, ctx, needsChild, needsBatch), t)) {
        if (chosenInGroup.has(r.id)) continue;
        if ((state.mainRecipeUse.get(r.id) ?? 0) >= s.repetition.max_main_batches_per_recipe) continue;
        if (r.side && (state.sideUse.get(r.side) ?? 0) >= (s.repetition.max_side_batches[r.side] ?? Infinity)) continue;
        if (!tagOk(r)) continue;
        const batch = { key: cookDates.length > 1 || group.length === 1 ? key : `${cookDates[0]}:${t}:1d`, dates: cookDates };
        const built = cookDates.map((d) => buildMeal({ recipe: r, date: d, mealType: t, settings: s, index, batch }));
        if (!fitsCaps(state, built, input.caps, index)) continue;
        for (const m of built) state.meals.set(slotKey(m.meal_date, t), m);
        countEvent(state, r, true);
        chosenInGroup.add(r.id);
        placed = true;
        break;
      }
      if (!placed) failures.push({ code: "no_main_candidate", message: `Не удалось подобрать ${t === "lunch" ? "обед" : "ужин"} на ${cookDates.join(", ")}: все подходящие блюда упираются в правила, лимиты повторов или недельные лимиты продуктов` });
    }
  }

  const smallSlots: MealType[] = ["breakfast", "snack1", "snack2"];
  for (const d of dates) {
    const usedToday = new Set<string>();
    for (const t of smallSlots) {
      const k = slotKey(d, t);
      const fixedMeal = fixed.get(k);
      if (fixedMeal) { if (fixedMeal.recipe_id) usedToday.add(fixedMeal.recipe_id); continue; }
      const eaters = eatersFor(d, t, s);
      const limit = t === "breakfast" ? s.repetition.max_same_breakfast : s.repetition.max_same_snack;
      const prevDay = dates[dates.indexOf(d) - 1];
      const prev = prevDay ? state.meals.get(slotKey(prevDay, t))?.recipe_id : null;
      let placed = false;
      for (const r of ranked(candidates(t, ctx, eaters.includes("child"), false), t)) {
        if (usedToday.has(r.id) || r.id === prev) continue;
        if ((state.smallUse.get(r.id) ?? 0) >= limit) continue;
        if (!tagOk(r)) continue;
        const m = buildMeal({ recipe: r, date: d, mealType: t, settings: s, index, batch: null });
        if (!fitsCaps(state, [m], input.caps, index)) continue;
        state.meals.set(k, m);
        countEvent(state, r, false);
        usedToday.add(r.id);
        placed = true;
        break;
      }
      if (!placed) failures.push({ code: "no_small_candidate", message: `Не удалось подобрать ${t === "breakfast" ? "завтрак" : "перекус"} на ${d}` });
    }
  }

  return { meals: [...state.meals.values()], failures };
}

export function generatePlan(input: PlannerInput): PlanResult {
  assertMonday(input.week_start);
  const index = new IngredientIndex(input.ingredients);
  const inventory = resolveInventory(index, input.inventory);
  const recipes = new Map(input.recipes.map((r) => [r.id, r]));
  const ctx: Ctx = {
    input,
    index,
    recipes,
    urgentIds: new Set(inventory.filter((i) => i.urgent && i.ingredient_id).map((i) => i.ingredient_id!)),
    inventoryIds: new Set(inventory.filter((i) => i.ingredient_id).map((i) => i.ingredient_id!)),
  };
  const fixed = fixedSlots(input);
  const maxAttempts = input.max_attempts ?? 24;
  const baseSeed = hashString(`${input.family_id}|${input.week_start}`);

  let best: { meals: PlannedMeal[]; failures: ConstraintFailure[]; shopping: PlanResult["shopping"]; warnings: ConstraintFailure[] } | null = null;
  for (let a = 0; a < maxAttempts; a++) {
    const costWeight = a < 4 ? 0 : 0.02 * (a - 3);
    const res = attempt(ctx, fixed, baseSeed + a * 7919, costWeight);
    const shopping = buildShopping({ meals: res.meals, inventory, index, prices: input.prices, budget_rub: input.settings.weekly_budget_rub, preferred_store: input.settings.preferred_store });
    const v = validatePlan(res.meals, {
      week_start: input.week_start,
      settings: input.settings,
      rules: input.rules,
      caps: input.caps,
      index,
      recipes,
      inventory,
      shopping,
      blacklist: input.feedback.blacklist,
    });
    const failures = [...res.failures, ...v.failures];
    if (!best || failures.length < best.failures.length) best = { meals: res.meals, failures, shopping, warnings: v.warnings };
    if (failures.length === 0) {
      return {
        ok: true,
        meals: sortMeals(res.meals),
        shopping,
        failures: [],
        attempts: a + 1,
        planner_version: PLANNER_VERSION,
        stats: { warnings: v.warnings, fixed_slots: fixed.size },
      };
    }
  }
  return {
    ok: false,
    meals: sortMeals(best!.meals),
    shopping: best!.shopping,
    failures: dedupe(best!.failures),
    attempts: maxAttempts,
    planner_version: PLANNER_VERSION,
    stats: { warnings: best!.warnings, fixed_slots: fixed.size },
  };
}

const ORDER: Record<MealType, number> = { breakfast: 0, snack1: 1, lunch: 2, snack2: 3, dinner: 4 };
function sortMeals(meals: PlannedMeal[]) {
  return [...meals].sort((a, b) => a.meal_date.localeCompare(b.meal_date) || ORDER[a.meal_type] - ORDER[b.meal_type]);
}
function dedupe(list: ConstraintFailure[]) {
  const m = new Map(list.map((x) => [x.message, x]));
  return [...m.values()];
}
