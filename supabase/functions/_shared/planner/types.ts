// Shared planner types. Pure TypeScript: runs in Deno (Edge Functions) and Node (tests).

export type MealType = "breakfast" | "snack1" | "lunch" | "snack2" | "dinner";
export const MEAL_TYPES: MealType[] = ["breakfast", "snack1", "lunch", "snack2", "dinner"];
export const MAIN_MEAL_TYPES: MealType[] = ["lunch", "dinner"];

export type Eater = "husband" | "wife" | "child";
export const EATERS: Eater[] = ["husband", "wife", "child"];

export type Unit = "g" | "ml" | "pcs";
export type IngredientState = "raw" | "cooked" | "semi_finished" | "frozen" | "dry" | "canned";

export interface Ingredient {
  id: string; // stable slug, e.g. "potato"
  canonical_name: string;
  category: string; // vegetable, meat, dairy, grain, fruit, fat, sauce, spice, convenience ...
  tags: string[]; // e.g. ["poultry","chicken"] — used by rules
  default_unit: Unit;
  grams_per_piece?: number | null; // for g <-> pcs conversion
  kcal_per_100g?: number | null;
  aliases: string[];
  active: boolean;
}

export interface IngredientPrice {
  ingredient_id: string;
  store: string;
  price_rub: number;
  package_amount: number;
  package_unit: Unit;
  manually_verified_at?: string | null;
}

export interface RecipeIngredient {
  ingredient_id: string;
  amount: number; // per ONE reference serving (see Recipe.ref_portion_g), in ingredient default_unit
  state: IngredientState;
  optional?: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  meal_types: MealType[];
  tags: string[];
  side?: string | null; // rice | pasta | potato | buckwheat | bulgur | bread | none
  active: boolean;
  batchable: boolean;
  batch_days: number;
  equipment: string[];
  cook_minutes: number;
  ref_portion_g: number; // cooked grams of one reference serving the ingredient amounts describe
  ingredients: RecipeIngredient[];
  steps: string[];
  child_adaptation: string;
  seasoning: string;
  child_ok: boolean;
}

export type WeightMode = "maintain" | "mild_loss" | "custom";

export interface FamilySettings {
  weekly_budget_rub: number;
  weight_mode: WeightMode;
  // main-dish (lunch/dinner) cooked-portion ranges in grams
  portion_ranges: Record<Eater, { min: number; max: number }>;
  custom_portions?: Partial<Record<Eater, number>> | null;
  // share of a reference serving for breakfast/snacks
  small_meal_factor: Record<Eater, number>;
  wife_snacks: number; // 0..2
  husband_snacks: number; // 0..2
  child_home_snacks: boolean; // child gets snack2 on days at home
  kindergarten_weekdays: number[]; // ISO weekday 1..7 where child lunches at kindergarten
  stores: string[];
  preferred_store?: string | null;
  equipment: string[];
  repetition: {
    max_same_breakfast: number;
    max_same_snack: number;
    max_main_batches_per_recipe: number;
    max_side_batches: Record<string, number>;
    max_soups_per_week: number;
  };
  kcal_day_ranges?: Partial<Record<Eater, { min: number; max: number }>> | null;
  allow_unverified_budget: boolean;
}

export interface IngredientCap {
  ingredient_id?: string | null;
  category?: string | null;
  max_amount: number;
  unit: Unit;
  enabled: boolean;
}

// Structured, machine-checkable family rule (stored in family_rules.params with rule_kind).
export type StructuredRule =
  | { kind: "ban_ingredient"; ingredient_id: string; severity: "hard" | "preference" }
  | { kind: "ban_ingredient_tag"; tag: string; except_ingredients?: string[]; severity: "hard" | "preference" }
  | { kind: "ban_recipe_tag"; tag: string; severity: "hard" | "preference" }
  | { kind: "ban_recipe"; recipe_id: string; severity: "hard" | "preference" }
  | { kind: "ingredient_only_in_tags"; ingredient_id: string; allowed_tags: string[]; severity: "hard" }
  | { kind: "ban_tag_at_meal_types"; tag: string; meal_types: MealType[]; severity: "hard" | "preference" }
  | { kind: "max_tag_per_week"; tag: string; max: number; severity: "hard" | "preference" }
  | { kind: "prefer_recipe"; recipe_id: string; weight: number; severity: "preference" }
  | { kind: "avoid_recipe"; recipe_id: string; weight: number; severity: "preference" };

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: Unit | string;
  state: IngredientState | string;
  urgent?: boolean;
  ingredient_id?: string | null;
}

export interface MealIngredientLine {
  ingredient_id: string | null;
  name: string;
  amount: number; // consumption for THIS slot on THIS day
  unit: string;
  state: string;
}

export interface PlannedMeal {
  meal_date: string; // YYYY-MM-DD
  meal_type: MealType;
  recipe_id: string | null;
  title: string;
  source: "generated" | "manual";
  locked: boolean;
  batch_key: string | null;
  batch_day: number | null; // 1 or 2 within batch
  eaters: Eater[];
  portions: Partial<Record<Eater, string>>;
  portion_grams: Partial<Record<Eater, number>>;
  ingredients: MealIngredientLine[];
  recipe: { steps: string[]; ready_output: string; child_adaptation: string; seasoning: string } | null;
  notes: string;
}

export interface FeedbackSummary {
  recipe_scores: Record<string, number>; // additive score deltas
  blacklist: string[]; // recipe ids never to suggest
}

export interface PlannerInput {
  family_id: string;
  week_start: string; // Monday
  settings: FamilySettings;
  rules: StructuredRule[];
  caps: IngredientCap[];
  inventory: InventoryItem[];
  ingredients: Ingredient[];
  prices: IngredientPrice[];
  recipes: Recipe[];
  feedback: FeedbackSummary;
  existing: PlannedMeal[]; // current meals of the week
  scope?: { kind: "week" } | { kind: "day"; date: string } | { kind: "meal"; date: string; meal_type: MealType };
  max_attempts?: number;
}

export interface ConstraintFailure {
  code: string;
  message: string; // human readable, Russian
  details?: Record<string, unknown>;
}

export interface ShoppingLine {
  ingredient_id: string | null;
  name: string;
  unit: string;
  state: string;
  required: number;
  from_inventory: number;
  to_buy: number;
  package_amount: number | null;
  package_count: number | null;
  purchase_amount: number | null;
  estimated_cost_rub: number | null;
  store: string | null;
  price_known: boolean;
  price_verified: boolean;
}

export interface ShoppingResult {
  lines: ShoppingLine[];
  allocations: { inventory_id: string; ingredient_id: string; amount: number }[];
  estimated_cost_rub: number;
  priced_count: number;
  unpriced_count: number;
  unverified_price_count: number;
  budget_rub: number;
  budget_status: "within" | "over" | "unverified";
  manual_meals_without_ingredients: number;
}

export interface PlanResult {
  ok: boolean;
  meals: PlannedMeal[];
  shopping: ShoppingResult | null;
  failures: ConstraintFailure[];
  attempts: number;
  planner_version: string;
  stats: Record<string, unknown>;
}
