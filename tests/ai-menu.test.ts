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
        portion_components: external
          ? { husband: [], wife: [], child: [] }
          : {
              husband: [{ name: "готовое блюдо", amount: 300, unit: "g" }],
              wife: [{ name: "готовое блюдо", amount: 250, unit: "g" }],
              child: [{ name: "готовое блюдо", amount: 150, unit: "g" }],
            },
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
        recipe: {
          steps: ["Промыть 100 г риса 30 секунд.", "Варить рис 15 минут на слабом огне под крышкой."],
          ready_output: "≈280 г готового риса",
          child_adaptation: "Ребёнку подать без соли.",
          seasoning: "Соль 1 г после отделения детской части.",
        },
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
    recipe: {
      steps: [
        "Нарезать 900 г куриной грудки, сковороду разогреть 2 минуты.",
        "Обжаривать грудку 10 минут на среднем огне; 360 г риса варить 15 минут под крышкой.",
        "Вторую половину охладить за 60 минут и убрать в холодильник; разогреть 5 минут на сковороде.",
      ],
      ready_output: "4 взрослые порции",
      child_adaptation: "Ребёнку отделить курицу до соли.",
      seasoning: "Соль 4 г на взрослую часть.",
    },
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
    recipe: {
      steps: ["Промыть 1 г риса 30 секунд.", "Варить 15 минут на слабом огне."],
      ready_output: "тестовая порция",
      child_adaptation: "Ребёнку без соли.",
      seasoning: "Соль 1 г.",
    },
  });
  assert.throws(() => validateAiMenuPlan(p), /обслуживается сразу/);
});

test("AI menu requires component portion breakdown for home meals", () => {
  const p = validPlan();
  delete p.days[5].meals.dinner.portion_components.wife;
  assert.throws(() => validateAiMenuPlan(p), /раскладка portion_components\.wife/);
});

test("AI menu rejects vague seasoning instructions", () => {
  const p = validPlan();
  const block = p.cook_blocks.find((x) => x.id === "mon-tue-dinner");
  block.recipe.seasoning = "Соль по вкусу.";
  assert.throws(() => validateAiMenuPlan(p), /нельзя по вкусу/);
});


test("AI menu rejects main-meal recipes without heat mode", () => {
  const p = validPlan();
  const block = p.cook_blocks.find((x) => x.id === "mon-tue-dinner");
  block.recipe.steps = [
    "Нарезать 900 г куриной грудки за 4 минуты.",
    "Готовить курицу 10 минут.",
    "Рис 360 г варить 15 минут и подать.",
  ];
  assert.throws(() => validateAiMenuPlan(p), /силу огня, температуру, мощность или режим/);
});

test("AI menu requires cooling storage and reheating for multi-day main meals", () => {
  const p = validPlan();
  const block = p.cook_blocks.find((x) => x.id === "mon-tue-dinner");
  block.recipe.steps = [
    "Нарезать 900 г куриной грудки за 4 минуты.",
    "Обжаривать грудку 10 минут на среднем огне; 360 г риса варить 15 минут на слабом огне.",
    "Разделить готовую партию на четыре порции за 2 минуты.",
  ];
  assert.throws(() => validateAiMenuPlan(p), /охлаждение второй части/);
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
