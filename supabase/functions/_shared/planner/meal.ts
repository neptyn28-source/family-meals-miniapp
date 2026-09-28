import type { Eater, FamilySettings, MealType, PlannedMeal, Recipe } from "./types.ts";
import { MAIN_MEAL_TYPES } from "./types.ts";
import type { IngredientIndex } from "./normalize.ts";
import { childAtKindergarten, eatersFor, isoWeekday, mainPortionGrams } from "./calendar.ts";

const WD = ["", "пн", "вт", "ср", "чт", "пт", "сб", "вс"];
export const KINDERGARTEN_LABEL = "обед в детском саду";

/** Share of a reference serving each eater gets in this slot. */
export function servingFactors(recipe: Recipe, mealType: MealType, eaters: Eater[], s: FamilySettings) {
  const out: Partial<Record<Eater, { factor: number; grams: number }>> = {};
  for (const e of eaters) {
    if (MAIN_MEAL_TYPES.includes(mealType)) {
      const grams = mainPortionGrams(e, s);
      out[e] = { factor: grams / recipe.ref_portion_g, grams };
    } else {
      const factor = s.small_meal_factor[e];
      out[e] = { factor, grams: Math.round(recipe.ref_portion_g * factor) };
    }
  }
  return out;
}

function roundAmount(value: number, unit: string) {
  return unit === "pcs" ? Math.round(value * 100) / 100 : Math.round(value);
}

export function totalGrams(recipe: Recipe, date: string, mealType: MealType, s: FamilySettings) {
  const f = servingFactors(recipe, mealType, eatersFor(date, mealType, s), s);
  return Object.values(f).reduce((sum, v) => sum + (v?.grams ?? 0), 0);
}

export function buildMeal(args: {
  recipe: Recipe;
  date: string;
  mealType: MealType;
  settings: FamilySettings;
  index: IngredientIndex;
  batch?: { key: string; dates: string[] } | null;
}): PlannedMeal {
  const { recipe, date, mealType, settings: s, index } = args;
  const eaters = eatersFor(date, mealType, s);
  const factors = servingFactors(recipe, mealType, eaters, s);
  const totalFactor = Object.values(factors).reduce((sum, v) => sum + (v?.factor ?? 0), 0);

  const ingredients = recipe.ingredients
    .map((ri) => {
      const ing = index.must(ri.ingredient_id);
      return {
        ingredient_id: ing.id,
        name: ing.canonical_name,
        amount: roundAmount(ri.amount * totalFactor, ing.default_unit),
        unit: ing.default_unit,
        state: ri.state,
      };
    })
    .filter((l) => l.amount > 0);

  const portions: PlannedMeal["portions"] = {};
  const portion_grams: PlannedMeal["portion_grams"] = {};
  for (const e of ["husband", "wife", "child"] as Eater[]) {
    const f = factors[e];
    if (f) {
      portion_grams[e] = f.grams;
      portions[e] = MAIN_MEAL_TYPES.includes(mealType)
        ? `≈${f.grams} г готового блюда`
        : f.factor === 1
        ? `1 порция (≈${f.grams} г)`
        : `${f.factor === 0.5 ? "½" : f.factor.toFixed(2)} порции (≈${f.grams} г)`;
    }
  }
  if (mealType === "lunch" && childAtKindergarten(date, s)) portions.child = KINDERGARTEN_LABEL;

  const dayGrams = Object.values(factors).reduce((sum, v) => sum + (v?.grams ?? 0), 0);
  let notes = "";
  let batchDay: number | null = null;
  let readyOutput = `≈${dayGrams} г на этот приём пищи`;
  if (args.batch && args.batch.dates.length > 1) {
    const all = args.batch.dates.map((d) => totalGrams(recipe, d, mealType, s));
    const total = all.reduce((a, b) => a + b, 0);
    batchDay = args.batch.dates.indexOf(date) + 1;
    const days = args.batch.dates.map((d) => WD[isoWeekday(d)]).join("+");
    notes = batchDay === 1
      ? `Готовится партией на 2 дня (${days}): всего ≈${total} г. Сегодня ≈${all[0]} г, остальное в холодильник (до 48 ч).`
      : `Из партии, приготовленной в ${WD[isoWeekday(args.batch.dates[0])]}. Разогреть ≈${all[batchDay - 1]} г.`;
    readyOutput = `Партия ≈${total} г на ${days}; на этот день ≈${all[batchDay - 1]} г`;
  } else if (args.batch) {
    batchDay = 1;
  }

  return {
    meal_date: date,
    meal_type: mealType,
    recipe_id: recipe.id,
    title: recipe.title,
    source: "generated",
    locked: false,
    batch_key: args.batch?.key ?? null,
    batch_day: batchDay,
    eaters,
    portions,
    portion_grams,
    ingredients,
    recipe: {
      steps: recipe.steps,
      ready_output: readyOutput,
      child_adaptation: recipe.child_adaptation,
      seasoning: recipe.seasoning,
    },
    notes,
  };
}
