// Home WMS: вещи на полках в виде, удобном для поиска «где что лежит».
// Чистые функции без доступа к базе — их проверяют unit-тесты.

export type WmsItemRow = {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  usage_frequency: string | null;
  wms_cells: {
    label: string;
    height_from_floor_cm: number | string;
    zone_type: string;
    position: number;
    wms_modules: {
      name: string;
      position: number;
      wms_locations: { name: string; position: number } | null;
    } | null;
  } | null;
};

export type WmsItem = {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  usage: string | null;
  place: {
    location: string;
    module: string;
    shelf: string;
    heightFromFloor: number;
    zone: string;
  } | null;
};

const LAST = Number.MAX_SAFE_INTEGER;

function sortKey(row: WmsItemRow): number[] {
  const cell = row.wms_cells;
  const mod = cell?.wms_modules;
  const loc = mod?.wms_locations;
  if (!cell || !mod || !loc) return [LAST, LAST, LAST];
  return [loc.position, mod.position, cell.position];
}

/** Вещи по порядку комнат, мебели и полок; вещи без полки — в конце. */
export function shapeWmsItems(rows: WmsItemRow[]): WmsItem[] {
  return [...rows]
    .sort((a, b) => {
      const ka = sortKey(a);
      const kb = sortKey(b);
      for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
      return a.name.localeCompare(b.name, "ru");
    })
    .map((row) => {
      const cell = row.wms_cells;
      const mod = cell?.wms_modules;
      const loc = mod?.wms_locations;
      return {
        id: row.id,
        name: row.name,
        category: row.category,
        quantity: row.quantity,
        usage: row.usage_frequency,
        place: cell && mod && loc
          ? {
            location: loc.name,
            module: mod.name,
            shelf: cell.label,
            heightFromFloor: Number(cell.height_from_floor_cm),
            zone: cell.zone_type,
          }
          : null,
      };
    });
}
