import test from "node:test";
import assert from "node:assert/strict";
const assertEquals = (a: unknown, b: unknown, m?: string) => assert.deepEqual(a, b, m);
import { choosePlacements, pickFromAnswer, placementPrompt } from "../supabase/functions/home-wms-api/ai-placement.ts";
import { suggestPlacements } from "../supabase/functions/home-wms-api/placement.ts";
import type { CellInfo, ItemProfile } from "../supabase/functions/home-wms-api/placement.ts";

const cell = (id: string, location: string, module: string, extra: Partial<CellInfo> = {}): CellInfo => ({
  id, location, module, shelf: "Полка 1", heightFromFloor: 60, width: 60, depth: 50, height: 40, zone: "warm",
  storageType: "shelf", allowedCategories: null, items: [], ...extra,
});
const CELLS = [
  cell("sink", "Ванная", "Тумба под раковиной", { items: [{ category: "Бытовая химия", name: "Порошок" }] }),
  cell("desk", "Спальня", "Компьютерный стол", { items: [{ category: "Техника", name: "Роутер" }] }),
  cell("hall", "Прихожая", "Шкаф-купе"),
];
const PRINTER: ItemProfile = {
  name: "Принтер", category: "Техника", usage: "monthly", weight: "medium",
  canHang: false, canFold: false, hazardous: false, size: { width: 45, height: 25, depth: 35 },
};
const answer = (body: unknown) => () =>
  Promise.resolve(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] })));

test("Gemini выбирает место и объясняет своими словами", async () => {
  const candidates = suggestPlacements(PRINTER, CELLS, 80);
  const deskNo = candidates.findIndex((c) => c.cellId === "desk") + 1;
  const res = await choosePlacements(PRINTER, candidates, CELLS, "key", "m", answer([{ number: deskNo, reason: "Рядом с роутером, сухо" }]));
  assertEquals(res.map((r) => [r.cellId, r.by, r.reasons[0]]), [["desk", "ai", "Рядом с роутером, сухо"]]);
});

test("Номера не из списка и повторы отбрасываются", () => {
  const candidates = suggestPlacements(PRINTER, CELLS, 80);
  const res = pickFromAnswer([{ number: 99, reason: "x" }, { number: 1, reason: "a" }, { number: 1, reason: "b" }], candidates);
  assertEquals(res.length, 1);
});

test("Gemini недоступен — места по правилам", async () => {
  const candidates = suggestPlacements(PRINTER, CELLS, 80);
  const failing = () => Promise.resolve(new Response("boom", { status: 500 }));
  const res = await choosePlacements(PRINTER, candidates, CELLS, "key", "m", failing);
  assertEquals(res.every((r) => r.by === "rules"), true);
  assertEquals(res.length, Math.min(3, candidates.length));
  assertEquals((await choosePlacements(PRINTER, candidates, CELLS, undefined, "m")).every((r) => r.by === "rules"), true);
});

test("В подсказке модели есть комнаты, соседи и факт про холодный балкон", () => {
  const candidates = suggestPlacements(PRINTER, CELLS, 80);
  const text = placementPrompt(PRINTER, candidates, new Map(CELLS.map((c) => [c.id, c])));
  for (const part of ["Тумба под раковиной", "Роутер", "Балкон не отапливается", "Принтер"]) {
    assertEquals(text.includes(part), true, part);
  }
});

test("Модель не понимает настройку размышлений — повтор без неё", async () => {
  const candidates = suggestPlacements(PRINTER, CELLS, 80);
  const bodies: string[] = [];
  const fetcher = (_url: string, init: RequestInit) => {
    bodies.push(String(init.body));
    if (bodies.length === 1) return Promise.resolve(new Response("bad thinking", { status: 400 }));
    return answer([{ number: 1, reason: "ок" }])();
  };
  const res = await choosePlacements(PRINTER, candidates, CELLS, "key", "m", fetcher);
  assertEquals(bodies.length, 2);
  assertEquals(bodies[0].includes("thinkingConfig"), true);
  assertEquals(bodies[1].includes("thinkingConfig"), false);
  assertEquals(res[0].by, "ai");
});

test("Основная модель перегружена — отвечает запасная", async () => {
  const candidates = suggestPlacements(PRINTER, CELLS, 80);
  const urls: string[] = [];
  const fetcher = (url: string) => {
    urls.push(url);
    if (urls.length === 1) return Promise.resolve(new Response("busy", { status: 503 }));
    return answer([{ number: 1, reason: "ок" }])();
  };
  const res = await choosePlacements(PRINTER, candidates, CELLS, "key", "main-model", fetcher);
  assertEquals(urls.length, 2);
  assertEquals(urls[0].includes("main-model"), true);
  assertEquals(urls[1].includes("gemini-flash-latest"), true);
  assertEquals(res[0].by, "ai");
});

test("Gemini перегружен совсем — отвечает Groq", async () => {
  const candidates = suggestPlacements(PRINTER, CELLS, 80);
  const urls: string[] = [];
  let groqBody = "";
  const fetcher = (url: string, init: RequestInit) => {
    urls.push(url);
    if (url.includes("googleapis")) return Promise.resolve(new Response("busy", { status: 503 }));
    groqBody = String(init.body);
    return Promise.resolve(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ items: [{ number: 1, reason: "сухо и под рукой" }] }) } }],
    })));
  };
  const res = await choosePlacements(PRINTER, candidates, CELLS, { gemini: "g", groq: "q" }, "m", fetcher);
  assertEquals(urls.filter((u) => u.includes("googleapis")).length, 1); // при 503 запасную Gemini не ждём
  assertEquals(urls.at(-1), "https://api.groq.com/openai/v1/chat/completions");
  assertEquals(groqBody.includes("json_object"), true);
  assertEquals([res[0].by, res[0].reasons[0]], ["ai", "сухо и под рукой"]);
});

test("Только ключ Groq — тоже работает", async () => {
  const candidates = suggestPlacements(PRINTER, CELLS, 80);
  const fetcher = () => Promise.resolve(new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify({ items: [{ number: 1, reason: "ок" }] }) } }],
  })));
  const res = await choosePlacements(PRINTER, candidates, CELLS, { groq: "q" }, "m", fetcher);
  assertEquals(res[0].by, "ai");
});
