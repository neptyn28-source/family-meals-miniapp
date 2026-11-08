import test from "node:test";
import assert from "node:assert/strict";
import {
  CHILD_SAFE_HEIGHT,
  suggestPlacements,
  type CellInfo,
  type ItemProfile,
} from "../supabase/functions/home-wms-api/placement.ts";

// Кусок настоящей квартиры: высота от пола, размеры Ш×Г×В, зона и тип места — как в базе.
function cell(id: string, location: string, module: string, h: number, w: number, d: number, ht: number,
  zone: CellInfo["zone"], storageType: CellInfo["storageType"], categories: string[] = []): CellInfo {
  return {
    id, location, module, shelf: id, heightFromFloor: h, width: w, depth: d, height: ht, zone, storageType,
    allowedCategories: null, items: categories.map((category) => ({ category })),
  };
}

const HOME: CellInfo[] = [
  cell("keys", "Прихожая", "Шкаф-купе — секция 2", 138, 68, 31, 13, "hot", "shelf", ["Мелочи"]),
  cell("hall-top", "Прихожая", "Шкаф-купе — секция 2", 222, 74, 40, 36, "cold", "shelf", ["Бытовая химия"]),
  cell("hall-rod", "Прихожая", "Шкаф-купе — секция 1", 193, 101, 45, 110, "cold", "rod", ["Одежда"]),
  cell("hall-low", "Прихожая", "Шкаф-купе — секция 2", 7, 74, 41, 98, "cold", "shelf", ["Уборка"]),
  cell("wash-top", "Ванная", "Полка над стиральной машиной", 183, 25, 25, 23, "warm", "shelf", ["Бытовая химия"]),
  cell("sink", "Кухня", "Шкаф под мойкой", 15, 90, 51, 59, "cold", "shelf", ["Уборка"]),
  cell("bed", "Спальня", "Кровать — секция 1", 0, 117, 90, 26, "cold", "bulky", ["Сезонное"]),
  cell("tshirts", "Спальня", "Шкаф-купе — секция 2", 116, 50, 70, 23, "hot", "shelf", ["Одежда"]),
  cell("tools", "Балкон", "Стеллаж", 30, 103, 51, 89, "cold", "shelf", ["Инструменты"]),
  cell("balcony-mid", "Балкон", "Стеллаж", 124, 103, 51, 39, "hot", "shelf", []),
  cell("desk-drawer", "Спальня", "Компьютерный стол", 53, 32, 46, 10, "warm", "drawer", ["Канцелярия"]),
];

function item(over: Partial<ItemProfile>): ItemProfile {
  return {
    name: "вещь", category: null, usage: "weekly", weight: "light", canHang: false, canFold: false,
    hazardous: false, size: null, ...over,
  };
}

test("опасное (химия, лекарства) никогда не ниже 150 см — в доме маленький ребёнок", () => {
  const tips = suggestPlacements(item({ name: "Средство для плиты", category: "Бытовая химия", hazardous: true, usage: "weekly",
    size: { width: 8, height: 22, depth: 8 } }), HOME, 10);
  assert.ok(tips.length > 0);
  assert.ok(tips.every((t) => t.heightFromFloor >= CHILD_SAFE_HEIGHT));
  assert.ok(!tips.some((t) => t.cellId === "sink"), "под мойкой ребёнок достанет");
  assert.ok(tips[0].reasons.some((r) => r.includes("ребёнок не достанет")));
});

test("тяжёлое (дрель) — вниз и к другим инструментам", () => {
  const [best] = suggestPlacements(item({ name: "Дрель", category: "Инструменты", weight: "heavy", usage: "monthly",
    size: { width: 30, height: 25, depth: 10 } }), HOME);
  assert.equal(best.cellId, "tools");
  assert.ok(best.reasons.some((r) => r.includes("тяжёлое")));
});

test("тяжёлое не кладём выше 150 см", () => {
  const tips = suggestPlacements(item({ name: "Ящик с банками", weight: "heavy", usage: "rare" }), HOME, 20);
  assert.ok(tips.every((t) => t.heightFromFloor <= CHILD_SAFE_HEIGHT));
});

test("ежедневную мелочь — под руку, к таким же мелочам", () => {
  const [best] = suggestPlacements(item({ name: "Запасные ключи", category: "Мелочи", usage: "daily",
    size: { width: 6, height: 2, depth: 4 } }), HOME);
  assert.equal(best.cellId, "keys");
  assert.equal(best.zone, "hot");
});

test("зимнюю куртку не по сезону — повесить на штангу, а не в ящик стола", () => {
  const tips = suggestPlacements(item({ name: "Зимняя куртка", category: "Одежда", usage: "rare", canHang: true, canFold: true,
    size: { width: 60, height: 90, depth: 15 } }), HOME, 5);
  assert.equal(tips[0].cellId, "hall-rod");
  assert.equal(tips[0].mode, "hang");
  assert.ok(!tips.some((t) => t.cellId === "desk-drawer"));
});

test("на штангу — только то, что можно повесить", () => {
  const tips = suggestPlacements(item({ name: "Коробка", category: "Одежда", usage: "rare", size: { width: 30, height: 20, depth: 30 } }), HOME, 20);
  assert.ok(!tips.some((t) => t.storageType === "rod"));
});

test("крупная твёрдая коробка не предлагается туда, куда не влезет", () => {
  const tips = suggestPlacements(item({ name: "Коробка с ёлкой", category: "Сезонное", usage: "rare",
    size: { width: 60, height: 40, depth: 40 } }), HOME, 20);
  for (const t of tips) {
    const c = HOME.find((x) => x.id === t.cellId)!;
    const fits = [60, 40, 40].sort((a, b) => a - b).every((v, i) => v <= [c.width!, c.depth!, c.height!].sort((a, b) => a - b)[i]);
    assert.ok(fits, `${t.cellId} не вмещает 60×40×40`);
  }
  assert.ok(tips.length > 0);
});

test("если у полки задан список категорий, чужое туда не кладём", () => {
  const strict = HOME.map((c) => c.id === "balcony-mid" ? { ...c, allowedCategories: ["Детское"] } : c);
  const tips = suggestPlacements(item({ name: "Плед", category: "Текстиль", usage: "monthly", canFold: true }), strict, 20);
  assert.ok(!tips.some((t) => t.cellId === "balcony-mid"));
});

test("результат ограничен и отсортирован по баллам", () => {
  const tips = suggestPlacements(item({ name: "Книга", usage: "weekly" }), HOME, 3);
  assert.equal(tips.length, 3);
  assert.ok(tips[0].score >= tips[1].score && tips[1].score >= tips[2].score);
});

test("placement: a shelf that is already full is not suggested, a half-full one is marked", async () => {
  const { cellFill } = await import("../supabase/functions/home-wms-api/placement.ts");
  const box = { category: "Обувь", name: "Коробка", quantity: 1, width_cm: 30, height_cm: 12, depth_cm: 20 };
  const base = { location: "Прихожая", module: "Шкаф", shelf: "Полка 1", heightFromFloor: 30, width: 60, depth: 40, height: 30, zone: "hot" as const, storageType: "shelf" as const, allowedCategories: null };
  const full = { ...base, id: "full", items: Array.from({ length: 8 }, () => box) }; // 8 × 7200 = 57600 из 61200
  const half = { ...base, id: "half", shelf: "Полка 2", items: Array.from({ length: 6 }, () => box) }; // ~70%
  assert.ok(cellFill(full)!.ratio > 0.9);
  const shoe = { name: "Ботинки", category: "Обувь", usage: "daily" as const, weight: "light" as const, canHang: false, canFold: false, hazardous: false, size: { width: 32, height: 13, depth: 21 } };
  const res = suggestPlacements(shoe, [full, half]);
  assert.deepEqual(res.map((r) => r.cellId), ["half"]);
  assert.ok(res[0].reasons.some((r) => /занята на \d+%/.test(r)));
  // штанга: вешалки по 5 см
  assert.equal(cellFill({ storageType: "rod", width: 50, height: 100, depth: 50, items: Array.from({ length: 10 }, () => ({ category: null })) })!.free, 0);
});

test("placement: ironing board does not go onto a 1-metre-high space that is narrower than it", () => {
  const cell = { id: "c", location: "Прихожая", module: "Шкаф-купе — секция 1", shelf: "Полка 1", heightFromFloor: 7, width: 74, depth: 41, height: 98, zone: "warm" as const, storageType: "shelf" as const, allowedCategories: null, items: [] };
  const board = { name: "Гладильная доска", category: "Хозяйство", usage: "weekly" as const, weight: "medium" as const, canHang: false, canFold: false, hazardous: false, size: { width: 140, height: 38, depth: 6 } };
  assert.equal(suggestPlacements(board, [cell]).length, 0);
});
