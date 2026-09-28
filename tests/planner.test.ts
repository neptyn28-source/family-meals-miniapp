import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePlan } from "../supabase/functions/_shared/planner/planner.ts";
import { buildShopping } from "../supabase/functions/_shared/planner/shopping.ts";
import { IngredientIndex } from "../supabase/functions/_shared/planner/normalize.ts";
import { validatePlan, weeklyTotals } from "../supabase/functions/_shared/planner/validator.ts";
import { buildMeal } from "../supabase/functions/_shared/planner/meal.ts";
import { MEAL_TYPES } from "../supabase/functions/_shared/planner/types.ts";
import type { PlannedMeal, Recipe } from "../supabase/functions/_shared/planner/types.ts";
import { INGREDIENTS, PRICES } from "../supabase/seed/ingredients.ts";
import { RECIPES } from "../supabase/seed/recipes.ts";
import { baseInput, WEEK } from "./fixtures.ts";

const index = new IngredientIndex(INGREDIENTS);
const plan = generatePlan(baseInput());
const dates = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"];
const byDay = (d: number, t: string) => plan.meals.find((m) => m.meal_date === dates[d] && m.meal_type === t)!;
const allIngredientIds = (meals: PlannedMeal[]) => meals.flatMap((m) => m.ingredients.map((l) => l.ingredient_id));

const poison: Recipe[] = [
  { ...RECIPES[0], id: "poison_orange", title: "Апельсиновый салат", meal_types: ["breakfast", "snack1", "snack2", "lunch", "dinner"], tags: [], side: null, batchable: true, ingredients: [{ ingredient_id: "orange", amount: 1, state: "raw" }] },
  { ...RECIPES[0], id: "poison_pork", title: "Свинина с рисом", tags: [], ingredients: [{ ingredient_id: "pork", amount: 150, state: "raw" }, { ingredient_id: "rice_white", amount: 60, state: "dry" }] },
  { ...RECIPES[0], id: "poison_fish", title: "Лосось с рисом", tags: [], ingredients: [{ ingredient_id: "salmon", amount: 150, state: "raw" }] },
  { ...RECIPES[0], id: "poison_brown_rice", title: "Курица с бурым рисом", tags: [], ingredients: [{ ingredient_id: "chicken_breast", amount: 120, state: "raw" }, { ingredient_id: "rice_brown", amount: 60, state: "dry" }] },
  { ...RECIPES[0], id: "poison_zucchini_pasta", title: "Паста с кабачком в соусе", tags: ["pasta_dish"], side: "pasta", ingredients: [{ ingredient_id: "pasta", amount: 70, state: "dry" }, { ingredient_id: "zucchini", amount: 100, state: "raw" }] },
  { ...RECIPES[0], id: "poison_turkey", title: "Индейка", tags: [], ingredients: [{ ingredient_id: "turkey", amount: 150, state: "raw" }] },
  { ...RECIPES[0], id: "poison_breakfast_zucchini", title: "Омлет с жареным кабачком", meal_types: ["breakfast"], tags: ["zucchini_side", "fried_zucchini"], batchable: false, ingredients: [{ ingredient_id: "egg", amount: 2, state: "raw" }, { ingredient_id: "zucchini", amount: 100, state: "raw" }] },
];
const poisonScores = Object.fromEntries(poison.map((p) => [p.id, 1000]));
const poisoned = generatePlan(baseInput({ recipes: [...RECIPES, ...poison], feedback: { recipe_scores: poisonScores, blacklist: [] } }));

test("baseline plan is valid", () => assert.equal(plan.ok, true, JSON.stringify(plan.failures)));
test("1. exactly 35 slots", () => assert.equal(plan.meals.length, 35));
test("2. all 7 dates", () => assert.deepEqual([...new Set(plan.meals.map((m) => m.meal_date))].sort(), dates));
test("3. all 5 meal types every day", () => {
  for (const d of dates) assert.deepEqual(plan.meals.filter((m) => m.meal_date === d).map((m) => m.meal_type).sort(), [...MEAL_TYPES].sort());
});
test("4. orange never appears (even when heavily favoured)", () => {
  assert.equal(poisoned.ok, true, JSON.stringify(poisoned.failures));
  assert.ok(!allIngredientIds(poisoned.meals).includes("orange"));
});
test("5. no fish / pork / other poultry", () => {
  const ids = allIngredientIds(poisoned.meals);
  for (const bad of ["pork", "salmon", "white_fish", "turkey", "chicken_thigh"]) assert.ok(!ids.includes(bad), bad);
});
test("6. no brown rice", () => assert.ok(!allIngredientIds(poisoned.meals).includes("rice_brown")));
test("7. zucchini only as separate fried side / fritters, never at breakfast", () => {
  const recipes = new Map([...RECIPES, ...poison].map((r) => [r.id, r]));
  for (const m of poisoned.meals) {
    if (!m.ingredients.some((l) => l.ingredient_id === "zucchini")) continue;
    const tags = recipes.get(m.recipe_id!)!.tags;
    assert.ok(tags.includes("zucchini_side") || tags.includes("zucchini_fritters"), m.title);
    assert.notEqual(m.meal_type, "breakfast");
  }
});
test("8. wife gets snack1 + snack2 every day", () => {
  for (let d = 0; d < 7; d++) {
    assert.ok(byDay(d, "snack1").eaters.includes("wife"));
    assert.ok(byDay(d, "snack2").eaters.includes("wife"));
  }
});
test("9. weekday child lunch = kindergarten", () => {
  for (let d = 0; d < 5; d++) {
    const m = byDay(d, "lunch");
    assert.equal(m.portions.child, "обед в детском саду");
    assert.ok(!m.eaters.includes("child"));
  }
});
test("10. weekend child lunch = real meal", () => {
  for (const d of [5, 6]) {
    const m = byDay(d, "lunch");
    assert.ok(m.eaters.includes("child"));
    assert.ok((m.portion_grams.child ?? 0) > 0);
  }
});
for (const [n, a, b, label] of [[11, 0, 1, "Mon/Tue"], [12, 2, 3, "Wed/Thu"], [13, 4, 5, "Fri/Sat"]] as const) {
  test(`${n}. ${label} lunch/dinner share one batch`, () => {
    for (const t of ["lunch", "dinner"]) {
      const x = byDay(a, t), y = byDay(b, t);
      assert.equal(x.recipe_id, y.recipe_id);
      assert.equal(x.batch_key, y.batch_key);
      assert.ok(x.batch_key);
      assert.deepEqual([x.batch_day, y.batch_day], [1, 2]);
    }
  });
}
test("14. Sunday standalone", () => {
  for (const t of ["lunch", "dinner"]) {
    const sun = byDay(6, t), sat = byDay(5, t);
    assert.notEqual(sun.batch_key, sat.batch_key);
    assert.equal(plan.meals.filter((m) => m.batch_key === sun.batch_key).length, 1);
  }
  for (const m of plan.meals) if (!["lunch", "dinner"].includes(m.meal_type)) assert.equal(m.batch_key, null);
});
test("15. inventory is never over-consumed; planning does not mutate it", () => {
  const inventory = [
    { id: "inv1", name: "Картошка", quantity: 300, unit: "g", state: "raw", urgent: true },
    { id: "inv2", name: "куриное филе", quantity: 500, unit: "g", state: "raw", urgent: false },
    { id: "inv3", name: "яйца", quantity: 3, unit: "pcs", state: "raw" },
  ];
  const snapshot = structuredClone(inventory);
  const r = generatePlan(baseInput({ inventory }));
  assert.equal(r.ok, true, JSON.stringify(r.failures));
  assert.deepEqual(inventory, snapshot);
  const used = new Map<string, number>();
  for (const a of r.shopping!.allocations) used.set(a.inventory_id, (used.get(a.inventory_id) ?? 0) + a.amount);
  assert.ok((used.get("inv1") ?? 0) <= 300);
  assert.ok((used.get("inv2") ?? 0) <= 500);
  assert.ok((used.get("inv3") ?? 0) <= 3);
});
test("16. cooked inventory is not used as raw", () => {
  const meal = buildMeal({ recipe: RECIPES.find((r) => r.id === "beef_stroganoff_buckwheat")!, date: WEEK, mealType: "dinner", settings: baseInput().settings, index });
  const s = buildShopping({ meals: [meal], inventory: [{ id: "c1", name: "говядина", quantity: 5000, unit: "g", state: "cooked" }], index, prices: PRICES, budget_rub: 8000 });
  const beef = s.lines.find((l) => l.ingredient_id === "beef")!;
  assert.equal(beef.from_inventory, 0);
  assert.ok(beef.to_buy > 0);
  const s2 = buildShopping({ meals: [meal], inventory: [{ id: "r1", name: "говядина", quantity: 5000, unit: "g", state: "raw" }], index, prices: PRICES, budget_rub: 8000 });
  assert.equal(s2.lines.find((l) => l.ingredient_id === "beef")!.to_buy, 0);
});
test("17. shopping does not double batch ingredients", () => {
  const settings = baseInput().settings;
  const recipe = RECIPES.find((r) => r.id === "beef_potato_stew_multicooker")!;
  const batch = { key: "k", dates: ["2026-09-28", "2026-09-29"] };
  const d1 = buildMeal({ recipe, date: batch.dates[0], mealType: "dinner", settings, index, batch });
  const d2 = buildMeal({ recipe, date: batch.dates[1], mealType: "dinner", settings, index, batch });
  const single = buildMeal({ recipe, date: batch.dates[0], mealType: "dinner", settings, index });
  const s = buildShopping({ meals: [d1, d2], inventory: [], index, prices: PRICES, budget_rub: 8000 });
  const beef = s.lines.find((l) => l.ingredient_id === "beef")!;
  const perDay = single.ingredients.find((l) => l.ingredient_id === "beef")!.amount;
  assert.equal(beef.required, perDay * 2);
  assert.ok(Math.abs(perDay - (750 / 350) * 110) <= 1);
});
test("18. locked manual meal survives regeneration", () => {
  const manual: PlannedMeal = { ...byDay(2, "dinner"), recipe_id: null, title: "Пицца у бабушки", source: "manual", locked: true, batch_key: null, batch_day: null, ingredients: [] };
  const lockedGenerated: PlannedMeal = { ...byDay(0, "breakfast"), locked: true };
  const r = generatePlan(baseInput({ existing: [...plan.meals.filter((m) => !(m.meal_date === dates[2] && m.meal_type === "dinner")), manual].map((m) => m.meal_date === dates[0] && m.meal_type === "breakfast" ? lockedGenerated : m) }));
  assert.equal(r.ok, true, JSON.stringify(r.failures));
  const kept = r.meals.find((m) => m.meal_date === dates[2] && m.meal_type === "dinner")!;
  assert.equal(kept.title, "Пицца у бабушки");
  assert.equal(kept.source, "manual");
  assert.equal(r.meals.find((m) => m.meal_date === dates[0] && m.meal_type === "breakfast")!.recipe_id, lockedGenerated.recipe_id);
  assert.ok(r.meals.find((m) => m.meal_date === dates[3] && m.meal_type === "dinner")!.recipe_id);
});
test("18b. single-meal regeneration only touches that batch", () => {
  const r = generatePlan(baseInput({ existing: plan.meals, scope: { kind: "meal", date: dates[0], meal_type: "lunch" } }));
  assert.equal(r.ok, true, JSON.stringify(r.failures));
  for (const m of r.meals) {
    const before = plan.meals.find((x) => x.meal_date === m.meal_date && x.meal_type === m.meal_type)!;
    if (m.meal_type === "lunch" && (m.meal_date === dates[0] || m.meal_date === dates[1])) continue;
    assert.equal(m.recipe_id, before.recipe_id);
  }
  assert.equal(r.meals.find((m) => m.meal_date === dates[0] && m.meal_type === "lunch")!.recipe_id, r.meals.find((m) => m.meal_date === dates[1] && m.meal_type === "lunch")!.recipe_id);
});
test("19. budget check works (over budget → plan rejected)", () => {
  const input = baseInput();
  input.settings.weekly_budget_rub = 1500;
  const r = generatePlan({ ...input, max_attempts: 6 });
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.code === "budget"));
  assert.equal(plan.shopping!.budget_status, "within");
  assert.ok(plan.shopping!.estimated_cost_rub <= 8000);
  assert.ok(plan.shopping!.estimated_cost_rub > 0);
});
test("20. unknown price makes budget unverifiable (never 'within')", () => {
  const prices = PRICES.filter((p) => p.ingredient_id !== "beef");
  const r = generatePlan(baseInput({ prices }));
  assert.equal(r.shopping!.budget_status, "unverified");
  assert.ok(r.shopping!.unpriced_count >= 1);
  const beef = r.shopping!.lines.find((l) => l.ingredient_id === "beef");
  if (beef) assert.equal(beef.estimated_cost_rub, null);
  const input = baseInput({ prices });
  input.settings.allow_unverified_budget = false;
  const strict = generatePlan({ ...input, max_attempts: 3 });
  assert.equal(strict.ok, false);
  assert.ok(strict.failures.some((f) => f.code === "budget_unverified"));
});
test("21. weekly potato cap is enforced", () => {
  const input = baseInput();
  input.caps = input.caps.map((c) => c.ingredient_id === "potato" ? { ...c, max_amount: 500 } : c);
  input.feedback.recipe_scores = { draniki_sour_cream: 100, beef_potato_stew_multicooker: 100, beef_patties_mash: 100 };
  const r = generatePlan(input);
  assert.equal(r.ok, true, JSON.stringify(r.failures));
  assert.ok((weeklyTotals(r.meals).get("potato") ?? 0) <= 500);
  assert.ok((weeklyTotals(plan.meals).get("potato") ?? 0) <= 2000);
  const bad = plan.meals.map((m) => m.meal_type === "dinner" ? { ...m, ingredients: [...m.ingredients, { ingredient_id: "potato", name: "картофель", amount: 600, unit: "g", state: "raw" }] } : m);
  const v = validatePlan(bad, { week_start: WEEK, settings: baseInput().settings, rules: baseInput().rules, caps: baseInput().caps, index, recipes: new Map(RECIPES.map((r) => [r.id, r])), inventory: [], shopping: null });
  assert.ok(v.failures.some((f) => f.code === "ingredient_cap"));
});
test("22. repetition limits hold", () => {
  const s = baseInput().settings;
  const count = (types: string[]) => {
    const c = new Map<string, number>();
    for (const m of plan.meals) if (types.includes(m.meal_type)) c.set(m.recipe_id!, (c.get(m.recipe_id!) ?? 0) + 1);
    return c;
  };
  for (const n of count(["breakfast"]).values()) assert.ok(n <= s.repetition.max_same_breakfast);
  for (const n of count(["snack1", "snack2"]).values()) assert.ok(n <= s.repetition.max_same_snack);
  const batches = new Map<string, Set<string>>();
  for (const m of plan.meals) if (m.batch_key) batches.set(m.recipe_id!, (batches.get(m.recipe_id!) ?? new Set()).add(m.batch_key));
  for (const set of batches.values()) assert.ok(set.size <= s.repetition.max_main_batches_per_recipe);
  const bananas = plan.meals.filter((m) => m.recipe_id === "snack_banana").length;
  assert.ok(bananas <= 2);
  const same = plan.meals.map((m) => m.meal_type === "breakfast" ? { ...m, recipe_id: "syrniki_sour_cream" } : m);
  const v = validatePlan(same, { week_start: WEEK, settings: s, rules: baseInput().rules, caps: [], index, recipes: new Map(RECIPES.map((r) => [r.id, r])), inventory: [], shopping: null });
  assert.ok(v.failures.some((f) => f.code === "repeat_breakfast"));
});
test("23. total shopping amounts are realistic for 2 adults + toddler", () => {
  const t = weeklyTotals(plan.meals);
  const g = (id: string) => t.get(id) ?? 0;
  assert.ok(g("potato") <= 2000);
  assert.ok(g("chicken_breast") + g("beef") + g("beef_mince") + g("chicken_mince") <= 4500);
  assert.ok(g("chicken_breast") + g("beef") + g("beef_mince") + g("chicken_mince") >= 1500);
  assert.ok(g("oil") <= 400);
  assert.ok(g("rice_white") <= 1200);
  assert.ok(g("pasta") <= 700);
  for (const m of plan.meals) for (const l of m.ingredients) if (l.unit !== "pcs") assert.ok(l.amount <= 1500, `${m.title}: ${l.name} ${l.amount}`);
  for (const m of plan.meals) if (["lunch", "dinner"].includes(m.meal_type)) {
    assert.ok((m.portion_grams.husband ?? 0) >= 300 && (m.portion_grams.husband ?? 0) <= 400);
    assert.ok((m.portion_grams.wife ?? 0) >= 250 && (m.portion_grams.wife ?? 0) <= 350);
  }
});
test("feedback: blacklist is hard, score shifts preferences", () => {
  const r = generatePlan(baseInput({ feedback: { recipe_scores: {}, blacklist: ["syrniki_sour_cream", "chicken_soy_garlic_rice"] } }));
  assert.equal(r.ok, true);
  assert.ok(!r.meals.some((m) => m.recipe_id === "syrniki_sour_cream" || m.recipe_id === "chicken_soy_garlic_rice"));
  const boosted = generatePlan(baseInput({ feedback: { recipe_scores: { beef_plov_multicooker: 50 }, blacklist: [] } }));
  assert.ok(boosted.meals.some((m) => m.recipe_id === "beef_plov_multicooker"));
});
test("deterministic: same input → same plan", () => {
  const again = generatePlan(baseInput());
  assert.deepEqual(again.meals.map((m) => m.recipe_id), plan.meals.map((m) => m.recipe_id));
});
test("infeasible constraints return a human-readable reason and no plan is claimed ok", () => {
  const input = baseInput();
  input.settings.equipment = [];
  const r = generatePlan({ ...input, max_attempts: 2 });
  assert.equal(r.ok, false);
  assert.ok(r.failures.length > 0);
  assert.ok(r.failures.every((f) => typeof f.message === "string" && f.message.length > 5));
});
test("aliases: normalisation is exact, not substring", () => {
  assert.equal(index.resolve("Картошка"), "potato");
  assert.equal(index.resolve("картофель"), "potato");
  assert.equal(index.resolve("Куриное филе"), "chicken_breast");
  assert.equal(index.resolve("рис"), "rice_white");
  assert.equal(index.resolve("бурый рис"), "rice_brown");
  assert.equal(index.resolve("картофельные чипсы"), null);
});
