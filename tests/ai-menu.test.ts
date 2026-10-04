import test from "node:test";
import assert from "node:assert/strict";
import {
  AI_MENU_FORMAT,
  AiMenuValidationError,
  aggregateAiCookBlocks,
  parseAiMenuPlan,
  validateAiMenuPlan,
} from "../supabase/functions/_shared/ai-menu.ts";

function validPlan() {
  const week = "2026-10-05";
  const dates = ["2026-10-05","2026-10-06","2026-10-07","2026-10-08","2026-10-09","2026-10-10","2026-10-11"];
  const days = dates.map((date, i) => {
    const meals: Record<string, any> = {};
    for (const type of ["breakfast","snack1","lunch","snack2","dinner"]) {
      const external = type === "lunch" && i < 5;
      const id = external ? null : `${date}-${type}`;
      meals[type] = {
        title: external ? "Обед в детском саду" : `Блюдо ${date} ${type}`,
        cook_block_id: id,
        external,
        portions: { husband: "нормальная", wife: "нормальная", child: external ? "детский сад" : "детская" },
        notes: "",
      };
    }
    return { date, meals };
  });

  // Merge Mon/Tue dinner into one cooking block to prove no shopping double-count.
  days[0].meals.dinner.cook_block_id = "mon-tue-dinner";
  days[1].meals.dinner.cook_block_id = "mon-tue-dinner";

  const cook_blocks: any[] = [];
  for (const day of days) {
    for (const type of ["breakfast","snack1","lunch","snack2","dinner"]) {
      const meal = day.meals[type];
      if (meal.external) continue;
      if (meal.cook_block_id === "mon-tue-dinner") continue;
      cook_blocks.push({
        id: meal.cook_block_id,
        title: meal.title,
        serves: [{ date: day.date, meal_type: type }],
        ingredients: [{ name: "рис белый", amount: 100, unit: "g", state: "dry" }],
        recipe: { steps: ["Приготовить"], ready_output: "", child_adaptation: "", seasoning: "" },
      });
    }
  }
  cook_blocks.push({
    id: "mon-tue-dinner",
    title: "Курица с рисом",
    serves: [
      { date: dates[0], meal_type: "dinner" },
      { date: dates[1], meal_type: "dinner" },
    ],
    ingredients: [
      { name: "куриная грудка", amount: 900, unit: "g", state: "raw" },
      { name: "рис белый", amount: 360, unit: "g", state: "dry" },
    ],
    recipe: { steps: ["Приготовить один раз на два дня"], ready_output: "", child_adaptation: "", seasoning: "" },
  });

  return { format: AI_MENU_FORMAT, week_start: week, summary: "Тест", days, cook_blocks };
}

test("AI menu parser accepts fenced JSON", () => {
  const text = "Вот меню:\n\n\x60\x60\x60json\n" + JSON.stringify(validPlan()) + "\n\x60\x60\x60";
  const parsed = parseAiMenuPlan(text);
  assert.equal(parsed.week_start, "2026-10-05");
  assert.equal(parsed.days.length, 7);
});

test("AI menu validates all 35 slots", () => {
  const p = validPlan();
  delete p.days[0].meals.breakfast;
  assert.throws(() => validateAiMenuPlan(p), AiMenuValidationError);
});

test("AI menu rejects missing cook block", () => {
  const p = validPlan();
  p.days[2].meals.breakfast.cook_block_id = "missing";
  assert.throws(() => validateAiMenuPlan(p), /не найден/);
});

test("AI menu rejects duplicate serving blocks", () => {
  const p = validPlan();
  p.cook_blocks.push({
    id: "duplicate",
    title: "Ошибка",
    serves: [{ date: "2026-10-05", meal_type: "dinner" }],
    ingredients: [{ name: "рис", amount: 1, unit: "g", state: "dry" }],
    recipe: { steps: [], ready_output: "", child_adaptation: "", seasoning: "" },
  });
  assert.throws(() => validateAiMenuPlan(p), /обслуживается сразу/);
});

test("two-day cook block is counted exactly once", () => {
  const p = validateAiMenuPlan(validPlan());
  const totals = aggregateAiCookBlocks(p);
  const chicken = totals.find((x) => x.name === "куриная грудка");
  assert.equal(chicken?.amount, 900);
});

test("wrong week_start weekday is rejected", () => {
  const p = validPlan();
  p.week_start = "2026-10-06";
  assert.throws(() => validateAiMenuPlan(p), /понедельником/);
});
