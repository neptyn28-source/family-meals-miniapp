// Default family settings, ingredient caps and structured rules.
// These are only DEFAULTS copied into the family's rows on first use (migration/seed);
// afterwards the database is the source of truth and the user edits them in "Настройки семьи".
import type { FamilySettings, IngredientCap, StructuredRule } from "../functions/_shared/planner/types.ts";

export const DEFAULT_SETTINGS: FamilySettings = {
  weekly_budget_rub: 8000,
  weight_mode: "mild_loss",
  portion_ranges: {
    husband: { min: 300, max: 400 },
    wife: { min: 250, max: 350 },
    child: { min: 120, max: 180 },
  },
  custom_portions: null,
  small_meal_factor: { husband: 1, wife: 1, child: 0.5 },
  wife_snacks: 2,
  husband_snacks: 0,
  child_home_snacks: true,
  kindergarten_weekdays: [1, 2, 3, 4, 5],
  stores: ["Пятёрочка", "Чижик", "ВкусВилл"],
  preferred_store: null,
  equipment: ["stove", "pan", "pot", "multicooker", "electric_grill", "toaster", "mixer"],
  repetition: {
    max_same_breakfast: 2,
    max_same_snack: 2,
    max_main_batches_per_recipe: 1,
    max_side_batches: { rice: 2, pasta: 1, potato: 1, buckwheat: 1, bulgur: 1, bread: 1 },
    max_soups_per_week: 1,
  },
  kcal_day_ranges: null,
  allow_unverified_budget: true,
};

export const DEFAULT_CAPS: IngredientCap[] = [
  { ingredient_id: "potato", max_amount: 2000, unit: "g", enabled: true },
  { ingredient_id: "pasta", max_amount: 700, unit: "g", enabled: true },
  { ingredient_id: "rice_white", max_amount: 1200, unit: "g", enabled: true },
  { ingredient_id: "cheese", max_amount: 450, unit: "g", enabled: true },
  { ingredient_id: "oil", max_amount: 400, unit: "ml", enabled: true },
  { ingredient_id: "butter", max_amount: 150, unit: "g", enabled: true },
  { ingredient_id: "sour_cream", max_amount: 900, unit: "g", enabled: true },
  { ingredient_id: "cream", max_amount: 600, unit: "ml", enabled: true },
  { ingredient_id: "sugar", max_amount: 200, unit: "g", enabled: true },
  { ingredient_id: "soy_sauce", max_amount: 150, unit: "ml", enabled: true },
  { ingredient_id: "banana", max_amount: 4, unit: "pcs", enabled: true },
  { ingredient_id: "apple", max_amount: 5, unit: "pcs", enabled: true },
  { category: "meat", max_amount: 4500, unit: "g", enabled: true },
  { category: "convenience", max_amount: 700, unit: "g", enabled: true },
];

export const DEFAULT_RULES: { rule_type: "hard" | "preference"; description: string; rule: StructuredRule }[] = [
  { rule_type: "hard", description: "Апельсин полностью запрещён", rule: { kind: "ban_ingredient", ingredient_id: "orange", severity: "hard" } },
  { rule_type: "hard", description: "Никакого арахисового масла", rule: { kind: "ban_ingredient_tag", tag: "peanut", severity: "hard" } },
  { rule_type: "hard", description: "Никакого хумуса", rule: { kind: "ban_ingredient", ingredient_id: "hummus", severity: "hard" } },
  { rule_type: "hard", description: "Никаких творожных запеканок", rule: { kind: "ban_recipe_tag", tag: "cottage_casserole", severity: "hard" } },
  { rule_type: "hard", description: "Коричневый рис запрещён, только белый", rule: { kind: "ban_ingredient_tag", tag: "brown_rice", severity: "hard" } },
  { rule_type: "hard", description: "Из птицы — только куриная грудка (и готовый куриный фарш)", rule: { kind: "ban_ingredient_tag", tag: "poultry", except_ingredients: ["chicken_breast", "chicken_mince"], severity: "hard" } },
  { rule_type: "hard", description: "Без свинины", rule: { kind: "ban_ingredient_tag", tag: "pork", severity: "hard" } },
  { rule_type: "hard", description: "Без рыбы", rule: { kind: "ban_ingredient_tag", tag: "fish", severity: "hard" } },
  { rule_type: "hard", description: "Кабачок — только отдельным жареным гарниром или оладьями", rule: { kind: "ingredient_only_in_tags", ingredient_id: "zucchini", allowed_tags: ["zucchini_side", "zucchini_fritters"], severity: "hard" } },
  { rule_type: "hard", description: "Жареный кабачок не на завтрак", rule: { kind: "ban_tag_at_meal_types", tag: "fried_zucchini", meal_types: ["breakfast"], severity: "hard" } },
  { rule_type: "hard", description: "Суп — максимум один раз в неделю", rule: { kind: "max_tag_per_week", tag: "soup", max: 1, severity: "hard" } },
  { rule_type: "hard", description: "Никакого супа с курицей, лапшой, яйцом и лаймом", rule: { kind: "ban_recipe_tag", tag: "chicken_noodle_lime_soup", severity: "hard" } },
  { rule_type: "hard", description: "Без грибной перегрузки: грибы не чаще 1 блюда в неделю", rule: { kind: "max_tag_per_week", tag: "mushroom", max: 1, severity: "hard" } },
  { rule_type: "preference", description: "Полуфабрикаты (чебупели) — не чаще раза в неделю", rule: { kind: "max_tag_per_week", tag: "convenience", max: 1, severity: "preference" } },
  { rule_type: "preference", description: "Не делать частым шаблон «курица-гриль + гречка + огурец/помидор»", rule: { kind: "ban_recipe_tag", tag: "grilled_chicken_buckwheat", severity: "preference" } },
  { rule_type: "preference", description: "Любимые блюда предлагать чаще", rule: { kind: "prefer_recipe", recipe_id: "chicken_soy_garlic_rice", weight: 2, severity: "preference" } },
  { rule_type: "preference", description: "Любимые блюда предлагать чаще", rule: { kind: "prefer_recipe", recipe_id: "beef_teriyaki_rice_zucchini", weight: 2, severity: "preference" } },
  { rule_type: "preference", description: "Сырники — любимый завтрак", rule: { kind: "prefer_recipe", recipe_id: "syrniki_sour_cream", weight: 2, severity: "preference" } },
];
