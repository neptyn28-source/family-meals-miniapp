import test from "node:test";
import assert from "node:assert/strict";
import { shapeWmsItems, type WmsItemRow } from "../supabase/functions/home-wms-api/items.ts";

function row(name: string, loc: [string, number] | null, mod: [string, number] = ["Шкаф", 0], cell: [string, number, number] = ["Полка 1", 0, 120]): WmsItemRow {
  return {
    id: name,
    name,
    category: "Разное",
    quantity: 1,
    usage_frequency: "weekly",
    wms_cells: loc
      ? {
        label: cell[0],
        position: cell[1],
        height_from_floor_cm: String(cell[2]),
        zone_type: "hot",
        wms_modules: { name: mod[0], position: mod[1], wms_locations: { name: loc[0], position: loc[1] } },
      }
      : null,
  };
}

test("вещи идут по порядку комнат, мебели и полок, а не по алфавиту", () => {
  const items = shapeWmsItems([
    row("Носки", ["Спальня", 3], ["Шкаф-купе", 8], ["Полка 3", 2, 93]),
    row("Аптечка", ["Прихожая", 0], ["Шкаф-купе", 2], ["Полка 6", 5, 191]),
    row("Футболки", ["Спальня", 3], ["Шкаф-купе", 8], ["Полка 4", 3, 116]),
    row("Ключи", ["Прихожая", 0], ["Шкаф-купе", 2], ["Полка 4", 3, 138]),
  ]);
  assert.deepEqual(items.map((i) => i.name), ["Ключи", "Аптечка", "Носки", "Футболки"]);
});

test("место вещи собирается из комнаты, мебели и полки; высота — число", () => {
  const [item] = shapeWmsItems([row("Аптечка", ["Прихожая", 0], ["Шкаф-купе — секция 2", 2], ["Полка 6", 5, 191])]);
  assert.deepEqual(item.place, {
    cellId: null,
    location: "Прихожая",
    module: "Шкаф-купе — секция 2",
    shelf: "Полка 6",
    heightFromFloor: 191,
    zone: "hot",
  });
  assert.equal(item.usage, "weekly");
});

test("вещь, у которой удалили полку, не теряется и стоит в конце", () => {
  const items = shapeWmsItems([row("Без места", null), row("Ключи", ["Прихожая", 0])]);
  assert.deepEqual(items.map((i) => i.name), ["Ключи", "Без места"]);
  assert.equal(items[1].place, null);
});

test("у вещи есть профиль, чтобы разложить её позже", () => {
  const r = { ...row("Гладильная доска", null), weight_class: "medium", width_cm: 38, height_cm: 140, depth_cm: 8, can_fold: false, hazardous: false };
  const [item] = shapeWmsItems([r]);
  assert.equal(item.place, null);
  assert.equal(item.profile.weight, "medium");
  assert.equal(item.profile.canFold, false);
  assert.equal(JSON.stringify(item.profile.size), JSON.stringify({ width: 38, height: 140, depth: 8 }));
});
