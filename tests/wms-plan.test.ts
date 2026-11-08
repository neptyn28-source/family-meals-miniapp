import { test } from "node:test";
import assert from "node:assert/strict";
import { furnitureName, groupModules, parseFurnitureUpdate } from "../supabase/functions/home-wms-api/plan.ts";

const L1 = "11111111-1111-4111-8111-111111111111";
const L2 = "22222222-2222-4222-8222-222222222222";

test("plan: sections of one cabinet become one piece of furniture", () => {
  assert.equal(furnitureName("Шкаф-купе — секция 2"), "Шкаф-купе");
  assert.equal(furnitureName("Компьютерный стол (3 ящика и стеллаж) — секция 3"), "Компьютерный стол (3 ящика и стеллаж)");
  assert.equal(furnitureName("Комод"), "Комод");
});

test("plan: two identical bedside tables stay two separate pieces", () => {
  assert.equal(furnitureName("Прикроватные тумбочки — секция 1"), "Прикроватная тумбочка 1");
  assert.equal(furnitureName("Прикроватные тумбочки — секция 2"), "Прикроватная тумбочка 2");
});

test("plan: grouping keeps rooms apart and order by position", () => {
  const g = groupModules([
    { id: "m3", name: "Шкаф-купе — секция 2", location_id: L1, position: 3 },
    { id: "m1", name: "Шкаф-купе — секция 1", location_id: L1, position: 1 },
    { id: "m2", name: "Шкаф-купе — секция 1", location_id: L2, position: 0 },
    { id: "m4", name: "Прикроватные тумбочки — секция 1", location_id: L1, position: 4 },
    { id: "m5", name: "Прикроватные тумбочки — секция 2", location_id: L1, position: 5 },
  ]);
  assert.deepEqual(
    g.map((f) => [f.location_id, f.name, f.module_ids]),
    [
      [L2, "Шкаф-купе", ["m2"]],
      [L1, "Шкаф-купе", ["m1", "m3"]],
      [L1, "Прикроватная тумбочка 1", ["m4"]],
      [L1, "Прикроватная тумбочка 2", ["m5"]],
    ],
  );
});

test("plan: furniture update accepts placement, size and rotation", () => {
  const u = parseFurnitureUpdate({ id: L1, x: 8.391234, y: 2.88, width: 175, depth: 80, rotation: 3 });
  assert.deepEqual(u, { id: L1, x_m: 8.391, y_m: 2.88, width_cm: 175, depth_cm: 80, rotation: 3, list_only: false });
  const off = parseFurnitureUpdate({ id: L1, x: null, y: null, width: null, depth: null });
  assert.equal(off.x_m, null);
  assert.equal(off.rotation, 0);
  // «оставить списком»: предмет не на плане и больше не просится на план
  assert.equal(parseFurnitureUpdate({ id: L1, x: null, y: null, listOnly: true }).list_only, true);
});

test("plan: furniture update rejects bad input", () => {
  for (const bad of [
    { id: "nope", x: 1, y: 1 },
    { id: L1, x: 1, y: null },
    { id: L1, x: 1, y: 1, width: 5 },
    { id: L1, x: 1, y: 1, depth: 1000 },
    { id: L1, x: 1, y: 1, rotation: 4 },
    { id: L1, x: "1", y: 1 },
    { id: L1, x: 1, y: 1, listOnly: true },
    { id: L1, x: null, y: null, listOnly: "yes" },
    { id: L1, x: Number.NaN, y: 1 },
  ]) {
    assert.throws(() => parseFurnitureUpdate(bad as Record<string, unknown>), /bad_furniture/, JSON.stringify(bad));
  }
});
