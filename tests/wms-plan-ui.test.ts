import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// wms-plan.js — обычный браузерный скрипт; грузим его в песочницу и берём чистые функции.
const sandbox: { window: Record<string, any> } = { window: {} };
vm.runInNewContext(readFileSync(new URL("../wms-plan.js", import.meta.url), "utf8"), sandbox);
const { kindOf, suggestSize, footprint, snap, searchItems, DRAW } = sandbox.window.WmsPlan._test;

const cell = (from: number, width: number | null, depth: number | null, items: string[] = [], type = "shelf") =>
  ({ id: `c${from}${width}`, label: "Полка", from, width, depth, height: 30, type, items: items.map((n, i) => ({ id: `i${i}`, name: n, quantity: 1 })) });

test("plan ui: furniture picture is chosen by name", () => {
  assert.equal(kindOf("Шкаф-купе"), "wardrobe");
  assert.equal(kindOf("Кровать с подъёмным механизмом"), "bed");
  assert.equal(kindOf("Угловой диван (подъёмный угол с ящиком)"), "sofaCorner");
  assert.equal(kindOf("Диван с внутренними ящиками"), "sofa");
  assert.equal(kindOf("Прикроватная тумбочка 1"), "nightstand");
  assert.equal(kindOf("Навесной шкаф 2"), "wall");
  assert.equal(kindOf("Полка над стиральной машиной"), "wall");
  assert.equal(kindOf("Тумба под раковиной"), "sink");
  assert.equal(kindOf("Компьютерный стол (3 ящика и стеллаж)"), "desk");
  assert.equal(kindOf("Обеденный стол"), "dining");
  assert.equal(kindOf("Тумба под аквариум"), "aquarium");
  assert.equal(kindOf("Шкаф под варочной панелью"), "hob");
  assert.equal(kindOf("Что-то новое"), "cabinet");
  for (const k of Object.keys(DRAW)) assert.match(DRAW[k](1.2, 0.6), /<(rect|circle|ellipse)/, k);
});

test("plan ui: size is suggested from the lowest shelf of each section", () => {
  const wardrobe = { name: "Шкаф-купе", sections: [
    { cells: [cell(8, 62, 70), cell(150, 62, 70, [], "rod")] },
    { cells: [cell(8, 50, 70)] },
    { cells: [cell(118, 53, 70, [], "rod")] },
  ] };
  const s = suggestSize(wardrobe);
  assert.equal(s.width, 175); // 62 + 50 + 53 + 4 стенки по 2 см
  assert.equal(s.depth, 80); // 70 + 8 на двери-купе
  assert.match(s.why, /62 \+ 50 \+ 53/);
  const desk = { name: "Компьютерный стол", sections: [
    { cells: [cell(3, 39, 30), cell(112, 120, 30)] }, { cells: [cell(3, 76, 30)] }, { cells: [cell(3, 32, 46)] },
  ] };
  assert.equal(suggestSize(desk).width, 155); // широкая верхняя полка не раздувает стол
  const bed = { name: "Кровать", sections: [{ cells: [cell(0, 117, 90)] }, { cells: [cell(0, 117, 90)] }] };
  assert.deepEqual([suggestSize(bed).width, suggestSize(bed).depth], [125, 190]);
  assert.deepEqual([suggestSize({ name: "Место под ванной", sections: [{ cells: [] }] }).width], [150]);
});

test("plan ui: rotation swaps the footprint", () => {
  const f = { width: 175, depth: 80, rotation: 0, suggest: { width: 1, depth: 1 } };
  assert.deepEqual({ ...footprint(f) }, { w: 1.75, h: 0.8 });
  assert.deepEqual({ ...footprint({ ...f, rotation: 1 }) }, { w: 0.8, h: 1.75 });
  assert.deepEqual({ ...footprint({ ...f, width: null, suggest: { width: 100, depth: 40 } }) }, { w: 1, h: 0.8 });
});

test("plan ui: furniture sticks to walls and stays inside its room part", () => {
  const parts = [[4.65, 1.81, 1.83, 0.91], [6.48, 1.79, 1.81, 4.27]];
  const r = snap({ x: 6.55, y: 3.0, w: 0.55, h: 1.8 }, parts);
  assert.equal(r.x, 6.48); // 7 см от стены — прилип
  const out = snap({ x: 9.5, y: 7, w: 0.5, h: 0.5 }, parts);
  assert.ok(out.x + out.w <= 6.48 + 1.81 + 1e-9 && out.y + out.h <= 1.79 + 4.27 + 1e-9);
});

test("plan ui: search finds items on any shelf, ignoring case and ё", () => {
  const furniture = [{ name: "Шкаф-купе", sections: [{ cells: [cell(8, 101, 45, ["Лоферы", "Лоферы", "Оксфорды"])] }] }];
  const r = searchItems(furniture, "ЛОФЕР");
  assert.equal(r.length, 1);
  assert.equal(r[0].items.length, 2);
  assert.equal(searchItems(furniture, "  ").length, 0);
});

test("plan ui: new furniture goes to a free spot along a wall, back to the wall", () => {
  const { findSpot } = sandbox.window.WmsPlan._test;
  const bedroom = [[8.39, 2.88, 4.96, 3.06]];
  const first = findSpot(bedroom, { w: 1.75, d: 0.8 }, []);
  assert.deepEqual({ ...first }, { x: 8.39, y: 2.88, rotation: 0 });
  const second = findSpot(bedroom, { w: 1.25, d: 1.9 }, [{ x: 8.39, y: 2.88, w: 1.75, h: 0.8 }]);
  assert.equal(second.rotation, 0);
  assert.ok(second.x >= 8.39 + 1.75 - 1e-9, "не налезает на шкаф");
  const tooBig = findSpot([[0, 0, 1, 1]], { w: 2, d: 2 }, []);
  assert.equal(tooBig, null);
});
