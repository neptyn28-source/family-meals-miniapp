// Home WMS: вещи на полках в виде, удобном для поиска «где что лежит».
// Чистые функции без доступа к базе — их проверяют unit-тесты.

export type WmsItemRow = {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  usage_frequency: string | null;
  cell_id?: string | null;
  weight_class?: string | null;
  width_cm?: number | string | null;
  height_cm?: number | string | null;
  depth_cm?: number | string | null;
  can_hang?: boolean | null;
  can_fold?: boolean | null;
  hazardous?: boolean | null;
  wms_cells: {
    id?: string;
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
  /** Профиль для повторного подбора места (разложить «без места» или переложить). */
  profile: {
    name: string;
    category: string | null;
    usage: string;
    weight: string;
    canHang: boolean;
    canFold: boolean;
    hazardous: boolean;
    size: { width: number; height: number; depth: number } | null;
  };
  place: {
    cellId: string | null;
    location: string;
    module: string;
    shelf: string;
    heightFromFloor: number;
    zone: string;
  } | null;
};

const LAST = Number.MAX_SAFE_INTEGER;

function sizeOf(row: WmsItemRow): WmsItem["profile"]["size"] {
  const d = [row.width_cm, row.height_cm, row.depth_cm].map((v) => (v == null ? NaN : Number(v)));
  return d.every((n) => n > 0) ? { width: d[0], height: d[1], depth: d[2] } : null;
}

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
        profile: {
          name: row.name,
          category: row.category,
          usage: row.usage_frequency || "monthly",
          weight: row.weight_class || "light",
          canHang: row.can_hang === true,
          canFold: row.can_fold === true,
          hazardous: row.hazardous === true,
          size: sizeOf(row),
        },
        place: cell && mod && loc
          ? {
            cellId: cell.id ?? row.cell_id ?? null,
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
