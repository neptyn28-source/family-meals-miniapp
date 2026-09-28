import type { ConstraintFailure, MealType, Recipe, StructuredRule } from "./types.ts";
import type { IngredientIndex } from "./normalize.ts";

/** Ingredient-level hard check (works for recipes AND manual meals with ingredient lines). */
export function ingredientViolations(
  ingredientIds: string[],
  rules: StructuredRule[],
  index: IngredientIndex,
  recipeTags: string[] | null,
  severity: "hard" | "preference" = "hard",
): ConstraintFailure[] {
  const out: ConstraintFailure[] = [];
  for (const id of ingredientIds) {
    const ing = index.get(id);
    if (!ing) continue;
    for (const rule of rules) {
      if (rule.severity !== severity) continue;
      if (rule.kind === "ban_ingredient" && rule.ingredient_id === id) {
        out.push({ code: "banned_ingredient", message: `Запрещённый продукт: ${ing.canonical_name}`, details: { ingredient_id: id } });
      }
      if (
        rule.kind === "ban_ingredient_tag" &&
        (ing.tags.includes(rule.tag) || ing.category === rule.tag) &&
        !(rule.except_ingredients ?? []).includes(id)
      ) {
        out.push({ code: "banned_ingredient", message: `Запрещённый продукт: ${ing.canonical_name} (${rule.tag})`, details: { ingredient_id: id, tag: rule.tag } });
      }
      if (rule.kind === "ingredient_only_in_tags" && rule.ingredient_id === id) {
        const ok = recipeTags !== null && rule.allowed_tags.some((t) => recipeTags.includes(t));
        if (!ok) {
          out.push({
            code: "ingredient_context",
            message: `${ing.canonical_name} допустим только как: ${rule.allowed_tags.join(", ")}`,
            details: { ingredient_id: id },
          });
        }
      }
    }
  }
  return out;
}

/** Full recipe check against rules of a given severity for a given meal type. */
export function recipeViolations(
  recipe: Recipe,
  mealType: MealType,
  rules: StructuredRule[],
  index: IngredientIndex,
  severity: "hard" | "preference" = "hard",
): ConstraintFailure[] {
  const out = ingredientViolations(recipe.ingredients.map((i) => i.ingredient_id), rules, index, recipe.tags, severity);
  for (const rule of rules) {
    if (rule.severity !== severity) continue;
    if (rule.kind === "ban_recipe" && rule.recipe_id === recipe.id) {
      out.push({ code: "banned_recipe", message: `Блюдо исключено: ${recipe.title}` });
    }
    if (rule.kind === "ban_recipe_tag" && recipe.tags.includes(rule.tag)) {
      out.push({ code: "banned_recipe_tag", message: `Блюдо «${recipe.title}» запрещено правилом (${rule.tag})` });
    }
    if (rule.kind === "ban_tag_at_meal_types" && recipe.tags.includes(rule.tag) && rule.meal_types.includes(mealType)) {
      out.push({ code: "banned_at_meal_type", message: `«${recipe.title}» нельзя в слот ${mealType}` });
    }
  }
  return out;
}

export function preferenceScore(recipe: Recipe, mealType: MealType, rules: StructuredRule[], index: IngredientIndex): number {
  let score = 0;
  score -= 4 * recipeViolations(recipe, mealType, rules, index, "preference").length;
  for (const rule of rules) {
    if (rule.kind === "prefer_recipe" && rule.recipe_id === recipe.id) score += rule.weight;
    if (rule.kind === "avoid_recipe" && rule.recipe_id === recipe.id) score -= rule.weight;
  }
  return score;
}

export function tagLimits(rules: StructuredRule[], severity: "hard" | "preference"): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rules) {
    if (r.kind === "max_tag_per_week" && r.severity === severity) {
      m.set(r.tag, Math.min(m.get(r.tag) ?? Infinity, r.max));
    }
  }
  return m;
}
