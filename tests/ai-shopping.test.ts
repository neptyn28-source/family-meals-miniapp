import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeAiShopping } from "../supabase/functions/_shared/ai-shopping.ts";
import { IngredientIndex, normalizeName } from "../supabase/functions/_shared/planner/normalize.ts";
import { INGREDIENTS, PRICES } from "../supabase/seed/ingredients.ts";

const WEEK = "2026-10-19"; // Monday; Mon–Wed are bought on Sunday, Thu–Sun on Thursday

// Seed catalog in the shape ai-menu-api reads from ingredient_catalog / ingredient_aliases.
const catalogRows = INGREDIENTS.map((i) => ({
  id: i.id,
  canonical_name: i.canonical_name,
  category: i.category,
  tags: i.tags,
  default_unit: i.default_unit,
  grams_per_piece: i.grams_per_piece,
  kcal_per_100g: i.kcal_per_100g,
  active: i.active,
}));
const aliasRows = INGREDIENTS.flatMap((i) =>
  [...new Set([i.canonical_name, ...i.aliases].map(normalizeName))].map((alias_norm) => ({ alias_norm, ingredient_id: i.id }))
);

type Line = { name: string; amount: number; unit: string; state?: string; use?: string };

function block(id: string, date: string, ingredients: Line[]) {
  return {
    id,
    title: id,
    serves: [{ date, meal_type: "snack1" }],
    ingredients: ingredients.map((x) => ({ state: "raw", use: "cooking", ...x })),
    recipe: { steps: [], ready_output: "", child_adaptation: "", seasoning: "" },
  };
}

function shop(blocks: ReturnType<typeof block>[], inventory: any[] = []) {
  return computeAiShopping({
    familyId: "f",
    weekId: "w",
    plan: { format: "family-meal-plan-v3", week_start: WEEK, summary: "", days: [], cook_blocks: blocks } as any,
    settings: { weekly_budget_rub: 7800 },
    catalogRows,
    aliasRows,
    inventoryRows: inventory.map((x, n) => ({ id: "inv" + n, state: "raw", usage_mode: "any", urgent: false, ...x })),
    globalPriceRows: PRICES,
    familyPriceRows: [],
    oldShoppingRows: [],
  });
}

const only = (rows: any[], ingredientId: string) => {
  const found = rows.filter((r) => r.ingredient_id === ingredientId);
  assert.equal(found.length, 1, `expected one shopping row for ${ingredientId}`);
  return found[0];
};

test("Активиа: 870 г дома под другим названием покрывают 870 г в меню — покупать нечего", () => {
  const { rows } = shop(
    [block("mon-snacks", "2026-10-19", [{ name: "Активиа питьевая со злаками", amount: 870, unit: "g", use: "direct" }])],
    [{ name: "Активиа", quantity: 870, unit: "g" }],
  );
  const r = only(rows, "activia_drink_grains");
  assert.equal(r.home_quantity, 870);
  assert.equal(r.to_buy, 0);
  assert.equal(r.packages, null);
  assert.equal(r.purchase_quantity, null);
});

test("Активиа: 600 г без запасов → одна бутылка 870 г, цена и магазин не выдумываются", () => {
  const { rows, unpriced_count } = shop([
    block("tue-snack", "2026-10-20", [{ name: "Активия", amount: 600, unit: "g", use: "direct" }]),
  ]);
  const r = only(rows, "activia_drink_grains");
  assert.equal(r.to_buy, 600);
  assert.equal(r.package_quantity, 870);
  assert.equal(r.packages, 1);
  assert.equal(r.purchase_quantity, 870);
  assert.equal(r.estimated_price, null);
  assert.equal(r.store, null);
  assert.equal(unpriced_count, 1);
});

test("Активиа: излишек воскресной бутылки переходит на четверг, вторую бутылку не покупаем", () => {
  const { rows } = shop([
    block("tue-snack", "2026-10-20", [{ name: "Активиа", amount: 600, unit: "g", use: "direct" }]),
    block("fri-snack", "2026-10-23", [{ name: "Активиа", amount: 270, unit: "g", use: "direct" }]),
  ]);
  const sunday = rows.find((r) => r.ingredient_id === "activia_drink_grains" && r.shopping_trip === "sunday");
  const thursday = rows.find((r) => r.ingredient_id === "activia_drink_grains" && r.shopping_trip === "thursday");
  assert.equal(sunday.packages, 1);
  assert.equal(thursday.home_quantity, 270);
  assert.equal(thursday.to_buy, 0);
  assert.equal(thursday.packages, null);
});

test("Активиа: 1000 г за неделю → две бутылки по 870 г, а не 1000 г", () => {
  const { rows } = shop([
    block("mon-snacks", "2026-10-19", [{ name: "питьевая активиа", amount: 1000, unit: "g", use: "direct" }]),
  ]);
  const r = only(rows, "activia_drink_grains");
  assert.equal(r.packages, 2);
  assert.equal(r.purchase_quantity, 1740);
});

test("Кефир: 550 г дома покрывают 550 мл в меню (жидкость, г = мл)", () => {
  const { rows } = shop(
    [block("mon-pancakes", "2026-10-19", [{ name: "кефир 1%", amount: 550, unit: "ml" }])],
    [{ name: "Кефир", quantity: 550, unit: "g" }],
  );
  const r = only(rows, "kefir");
  assert.equal(r.home_quantity, 550);
  assert.equal(r.to_buy, 0);
});

test("Кефир: 1000 мл без запасов → две упаковки по 900 мл по самой дешёвой цене", () => {
  const { rows } = shop([block("tue-pancakes", "2026-10-20", [{ name: "кефир", amount: 1000, unit: "ml" }])]);
  const r = only(rows, "kefir");
  assert.equal(r.package_quantity, 900);
  assert.equal(r.packages, 2);
  assert.equal(r.purchase_quantity, 1800);
  assert.equal(r.store, "Чижик");
  assert.equal(r.estimated_price, 158);
});

test("Куриный фарш с опечаткой «Фарш куринный» в остатках вычитается из покупок", () => {
  const { rows } = shop(
    [block("tue-meatballs", "2026-10-20", [{ name: "куриный фарш", amount: 680, unit: "g" }])],
    [{ name: "Фарш куринный", quantity: 734, unit: "g" }],
  );
  const r = only(rows, "chicken_mince");
  assert.equal(r.home_quantity, 680);
  assert.equal(r.to_buy, 0);
});

test("«Говядина нежирная», «цветная капуста», «кукуруза консервированная» находятся в каталоге", () => {
  const { rows } = shop([
    block("tue-dinner", "2026-10-20", [
      { name: "говядина нежирная", amount: 750, unit: "g" },
      { name: "цветная капуста", amount: 650, unit: "g" },
      { name: "кукуруза консервированная", amount: 130, unit: "g", state: "canned" },
    ]),
  ]);
  const beef = only(rows, "beef");
  assert.equal(beef.packages, 2);
  assert.ok(beef.estimated_price > 0);
  assert.equal(only(rows, "cauliflower").to_buy, 650);
  assert.equal(only(rows, "corn_canned").to_buy, 130);
  assert.ok(rows.every((r) => r.ingredient_id !== null));
});

test("Миграция каталога согласована с сидом: каждый алиас нормализован и ведёт к тому же продукту", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/20261108180000_catalog_activia_and_missing_aliases.sql", import.meta.url),
    "utf8",
  );
  const pairs = [...sql.matchAll(/\('([^']+)', '([a-z_]+)'\)/g)].map((m) => [m[1], m[2]]);
  assert.ok(pairs.length >= 20);
  const index = new IngredientIndex(INGREDIENTS);
  for (const [alias, id] of pairs) {
    assert.equal(normalizeName(alias), alias, `alias "${alias}" must be stored normalized`);
    assert.equal(index.resolve(alias), id, `alias "${alias}" resolves differently in the seed`);
  }
});
