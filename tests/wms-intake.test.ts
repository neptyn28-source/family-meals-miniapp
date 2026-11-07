import test from "node:test";
import assert from "node:assert/strict";
import { analyzeItem, BASE_CATEGORIES, parseIntake } from "../supabase/functions/home-wms-api/intake.ts";

test("ответ модели разбирается в профиль вещи", () => {
  const d = parseIntake({
    name: "Зимняя куртка", category: "одежда", usage: "rare", weight: "medium",
    can_hang: true, can_fold: true, hazardous: false, width_cm: 60, height_cm: 90, depth_cm: 15,
  }, "", BASE_CATEGORIES);
  assert.equal(d.category, "Одежда");
  assert.equal(d.usage, "rare");
  assert.deepEqual(d.size, { width: 60, height: 90, depth: 15 });
  assert.equal(d.canHang, true);
  assert.equal(d.usageGuessed, true);
});

test("химия и лекарства опасны всегда, даже если модель сказала иначе", () => {
  const d = parseIntake({ name: "Таблетки", category: "Лекарства", usage: "monthly", weight: "light", can_hang: false, can_fold: false, hazardous: false }, "", BASE_CATEGORIES);
  assert.equal(d.hazardous, true);
});

test("неизвестная категория и мусор в полях заменяются осторожными значениями", () => {
  const d = parseIntake({ name: "", category: "Космос", usage: "always", weight: "tons", width_cm: -5 }, "старый фен", BASE_CATEGORIES);
  assert.equal(d.name, "Старый фен");
  assert.equal(d.category, null);
  assert.equal(d.usage, "monthly");
  assert.equal(d.weight, "light");
  assert.equal(d.size, null);
});

test("без ключа Gemini приёмка работает по одному описанию", async () => {
  const d = await analyzeItem({ text: "дрель", photo: null }, BASE_CATEGORIES, undefined, "m");
  assert.equal(d.name, "Дрель");
  assert.equal(d.aiUsed, false);
});

test("фото уходит в Gemini вместе с описанием, ответ разбирается", async () => {
  let sent: any = null;
  const fake = async (_url: string, init: RequestInit) => {
    sent = JSON.parse(String(init.body));
    const text = JSON.stringify({ name: "Дрель", category: "Инструменты", usage: "monthly", weight: "heavy", can_hang: false, can_fold: false, hazardous: true });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
  };
  const d = await analyzeItem({ text: "", photo: { mime: "image/jpeg", data: "AAAA" } }, BASE_CATEGORIES, "key", "m", fake);
  assert.equal(sent.contents[0].parts[1].inline_data.mime_type, "image/jpeg");
  assert.equal(d.category, "Инструменты");
  assert.equal(d.weight, "heavy");
  assert.equal(d.aiUsed, true);
});

test("ошибка Gemini не ломает приёмку", async () => {
  const fail = async () => new Response("quota", { status: 429 });
  const d = await analyzeItem({ text: "плед", photo: null }, BASE_CATEGORIES, "key", "m", fail);
  assert.equal(d.name, "Плед");
  assert.equal(d.aiUsed, false);
});
