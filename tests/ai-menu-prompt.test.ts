import test from "node:test";
import assert from "node:assert/strict";
import { buildExportPrompt, dailyTarget } from "../supabase/functions/_shared/ai-menu-prompt.ts";

const profile = {
  husband: { weight_kg: 87.7, height_cm: 181, age_years: 28, goal: "lose", weight_loss_pace: "faster", training_frequency: "3-4" },
  wife: { weight_kg: 65.5, height_cm: 168, age_years: 27, goal: "lose", weight_loss_pace: "faster", training_frequency: "3-4" },
  child: { age_years: 2 },
};

const prompt = (extra: Record<string, unknown> = {}) => buildExportPrompt({
  weekStart: "2026-11-16",
  family: { budget_weekly: 7800 },
  members: [{ id: "1", role: "husband", name: "Муж" }, { id: "2", role: "wife", name: "Жена" }],
  settings: {},
  profile,
  rules: [],
  inventory: [],
  feedback: [],
  ...extra,
});

test("Промт адресован Claude, а не ChatGPT", () => {
  const text = prompt();
  assert.match(text, /ЗАДАЧА ДЛЯ CLAUDE/);
  assert.doesNotMatch(text, /ChatGPT/);
});

test("Блюда прошлых недель попадают в промт как запрет повторов", () => {
  const text = prompt({
    recentDishes: [
      { week_start: "2026-11-09", title: "Говядина с овощами и белым рисом", meal_types: ["lunch", "lunch"] },
      { week_start: "2026-11-02", title: "Сырники с яблоком", meal_types: ["breakfast"] },
    ],
  });
  assert.match(text, /Неделя 2026-11-09: Говядина с овощами и белым рисом \(обед\)/);
  assert.ok(text.indexOf("Неделя 2026-11-09") < text.indexOf("Неделя 2026-11-02"), "свежая неделя первой");
});

test("Печень, грибы, зал, худеем и цели для жены и мужа — в промте", () => {
  const text = prompt();
  for (const part of ["Печень — ровно 1 готовка", "Грибы", "МЫ ХОДИМ В ЗАЛ", "Порции НЕ увеличивай", "либидо", "потенции"]) {
    assert.ok(text.includes(part), part);
  }
});

test("Ориентир калорий: дефицит и белок по весу", () => {
  assert.deepEqual(dailyTarget(profile.husband, "male"), { kcal: 1800, protein: 160 });
  assert.deepEqual(dailyTarget(profile.wife, "female"), { kcal: 1400, protein: 105 });
  assert.equal(dailyTarget({ weight_kg: 80 }, "male"), null);
});
