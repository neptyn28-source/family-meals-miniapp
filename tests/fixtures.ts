import type { PlannerInput } from "../supabase/functions/_shared/planner/types.ts";
import { INGREDIENTS, PRICES } from "../supabase/seed/ingredients.ts";
import { RECIPES } from "../supabase/seed/recipes.ts";
import { DEFAULT_CAPS, DEFAULT_RULES, DEFAULT_SETTINGS } from "../supabase/seed/family_defaults.ts";

export const WEEK = "2026-09-28"; // Monday

export function baseInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    family_id: "11111111-1111-1111-1111-111111111111",
    week_start: WEEK,
    settings: structuredClone(DEFAULT_SETTINGS),
    rules: DEFAULT_RULES.map((r) => r.rule),
    caps: structuredClone(DEFAULT_CAPS),
    inventory: [],
    ingredients: INGREDIENTS,
    prices: PRICES,
    recipes: RECIPES,
    feedback: { recipe_scores: {}, blacklist: [] },
    existing: [],
    ...overrides,
  };
}
