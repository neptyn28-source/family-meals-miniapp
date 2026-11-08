// Визуальный план «Хранения»: чистые функции без обращения к базе (тестируются node --test).

export type ModuleForGrouping = { id: string; name: string; location_id: string; position: number };
export type FurnitureDraft = { location_id: string; name: string; position: number; module_ids: string[] };

const SECTION = /\s+—\s+секция\s+(\d+)\s*$/i;
// Секции с такими названиями — одинаковые отдельные предметы (две тумбочки у кровати), а не один шкаф.
const TWINS: [RegExp, string][] = [[/прикроватные\s+тумбочки/i, "Прикроватная тумбочка"]];

/** Как называется предмет мебели, к которому относится секция. */
export function furnitureName(moduleName: string): string {
  const m = moduleName.match(SECTION);
  if (!m) return moduleName.trim();
  const base = moduleName.slice(0, m.index).trim();
  const twin = TWINS.find(([re]) => re.test(base));
  return twin ? `${twin[1]} ${m[1]}` : base;
}

/** Секции без предмета собираются в предметы: «Шкаф-купе — секция 1/2/3» → один «Шкаф-купе». */
export function groupModules(modules: ModuleForGrouping[]): FurnitureDraft[] {
  const out: FurnitureDraft[] = [];
  const sorted = [...modules].sort((a, b) => a.position - b.position);
  for (const m of sorted) {
    const name = furnitureName(m.name).slice(0, 80);
    let f = out.find((x) => x.location_id === m.location_id && x.name === name);
    if (!f) {
      f = { location_id: m.location_id, name, position: m.position, module_ids: [] };
      out.push(f);
    }
    f.module_ids.push(m.id);
  }
  return out;
}

export type FurnitureUpdate = {
  id: string;
  x_m: number | null;
  y_m: number | null;
  width_cm: number | null;
  depth_cm: number | null;
  rotation: number;
  list_only: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function num(v: unknown, min: number, max: number): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) throw new Error("bad_furniture");
  return Math.round(v * 1000) / 1000;
}

/** Проверяет правку предмета с экрана. Бросает Error("bad_furniture") на любое неверное поле. */
export function parseFurnitureUpdate(p: Record<string, unknown>): FurnitureUpdate {
  if (typeof p.id !== "string" || !UUID.test(p.id)) throw new Error("bad_furniture");
  const x = num(p.x, -5, 100), y = num(p.y, -5, 100);
  if ((x === null) !== (y === null)) throw new Error("bad_furniture");
  const rotation = p.rotation ?? 0;
  if (!Number.isInteger(rotation) || (rotation as number) < 0 || (rotation as number) > 3) throw new Error("bad_furniture");
  const listOnly = p.listOnly ?? false;
  if (typeof listOnly !== "boolean" || (listOnly && x !== null)) throw new Error("bad_furniture");
  return {
    id: p.id,
    x_m: x,
    y_m: y,
    width_cm: num(p.width, 10, 600),
    depth_cm: num(p.depth, 10, 400),
    rotation: rotation as number,
    list_only: listOnly,
  };
}
