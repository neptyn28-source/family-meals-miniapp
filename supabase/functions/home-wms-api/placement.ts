// Home WMS: умное размещение по 5S — система сама выбирает полку для вещи.
// Чистая функция без доступа к базе, её проверяют unit-тесты.
//
// Порядок решения:
// 1. Отсекаем места, куда вещь нельзя: не влезает, опасное ниже 150 см (в доме маленький ребёнок),
//    тяжёлое выше 150 см, на штангу — только то, что можно повесить, чужая категория у полки.
// 2. Оставшиеся места оцениваем баллами: зона по частоте (частое — под руку, редкое — далеко),
//    вес (тяжёлое — вниз), соседство (к таким же вещам), заполненность полки.

export type Usage = "daily" | "weekly" | "monthly" | "rare";
export type Weight = "light" | "medium" | "heavy";
export type StorageType = "shelf" | "drawer" | "rod" | "hook" | "bulky";
export type Zone = "hot" | "warm" | "cold";

export type Size = { width: number; height: number; depth: number };

export type ItemProfile = {
  name: string;
  category: string | null;
  usage: Usage;
  weight: Weight;
  canHang: boolean;
  canFold: boolean;
  hazardous: boolean;
  size: Size | null;
};

export type CellInfo = {
  id: string;
  location: string;
  module: string;
  shelf: string;
  heightFromFloor: number;
  width: number | null;
  depth: number | null;
  height: number | null;
  zone: Zone;
  storageType: StorageType;
  allowedCategories: string[] | null;
  items: StoredItem[];
};

/** Вещь, которая уже лежит в ячейке. Размеры есть не у всех — тогда считаем типовой объём. */
export type StoredItem = {
  category: string | null;
  name?: string;
  quantity?: number | null;
  width_cm?: number | string | null;
  height_cm?: number | string | null;
  depth_cm?: number | string | null;
};

export type Suggestion = {
  cellId: string;
  location: string;
  module: string;
  shelf: string;
  heightFromFloor: number;
  zone: Zone;
  storageType: StorageType;
  mode: "hang" | "put";
  score: number;
  reasons: string[];
  /** Кто выбрал место: Gemini или баллы по правилам. */
  by?: "ai" | "rules";
};

/** Выше этой высоты двухлетний ребёнок не дотянется даже со стула у шкафа. */
export const CHILD_SAFE_HEIGHT = 150;

const ZONE_SCORE: Record<Usage, Record<Zone, number>> = {
  daily: { hot: 30, warm: 12, cold: -25 },
  weekly: { hot: 15, warm: 25, cold: -5 },
  monthly: { hot: -5, warm: 15, cold: 20 },
  rare: { hot: -20, warm: 5, cold: 30 },
};

const ZONE_TEXT: Record<Zone, string> = { hot: "под рукой", warm: "дотянуться", cold: "далеко" };
const USAGE_TEXT: Record<Usage, string> = {
  daily: "каждый день",
  weekly: "раз в неделю",
  monthly: "раз в месяц",
  rare: "редко",
};

function norm(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase().replaceAll("ё", "е");
}

function volume(s: Size): number {
  return s.width * s.height * s.depth;
}

/** Объём вещи без размеров: коробка обуви/стопка одежды ~ 30×20×12 см. */
export const UNKNOWN_ITEM_CM3 = 7200;
/** Вещи не укладываются вплотную: реально занять можно ~85% объёма полки. */
const PACKING = 0.85;
/** На штанге одна вешалка занимает ~5 см. */
const HANGER_CM = 5;

function storedVolume(i: StoredItem): number {
  const w = Number(i.width_cm), h = Number(i.height_cm), d = Number(i.depth_cm);
  const one = w > 0 && h > 0 && d > 0 ? w * h * d : UNKNOWN_ITEM_CM3;
  return one * Math.max(1, Number(i.quantity) || 1);
}

/**
 * Заполненность ячейки: сколько места уже занято (0…1+) и сколько можно положить ещё.
 * Полки и ящики — по объёму, штанга — по числу вешалок. null — у ячейки нет размеров.
 */
export function cellFill(cell: Pick<CellInfo, "storageType" | "width" | "height" | "depth" | "items">):
  { ratio: number; free: number; capacity: number; unit: "cm3" | "hangers" } | null {
  if (cell.storageType === "rod" || cell.storageType === "hook") {
    if (!cell.width) return null;
    const capacity = Math.max(1, Math.floor(cell.width / HANGER_CM));
    const used = cell.items.reduce((a, i) => a + Math.max(1, Number(i.quantity) || 1), 0);
    return { ratio: used / capacity, free: capacity - used, capacity, unit: "hangers" };
  }
  if (cell.width == null || cell.height == null || cell.depth == null) return null;
  const capacity = cell.width * cell.height * cell.depth * PACKING;
  const used = cell.items.reduce((a, i) => a + storedVolume(i), 0);
  return { ratio: used / capacity, free: capacity - used, capacity, unit: "cm3" };
}

/** Толщина полки, см. */
export const BOARD_CM = 2;

/**
 * Полезная высота ячеек одной секции — по высотам от пола, а не по записанной высоте
 * (её часто вписывают с запасом, и тогда полки «налезают» друг на друга).
 * - полка/ящик под другой полкой: до этой полки (минус доска);
 * - полка под штангой: записанная высота, но не выше штанги (над ней висит одежда);
 * - самая верхняя полка: записанная высота (над ней доски нет);
 * - штанга: записанное место под вешалки, но не ниже верха полки или штанги под ней.
 */
export function clearHeights(cells: { id: string; from: number; height: number | null; type: string }[]): Map<string, number | null> {
  const out = new Map<string, number | null>();
  const sorted = [...cells].sort((a, b) => a.from - b.from);
  const isHang = (c: { type: string }) => c.type === "rod" || c.type === "hook";
  const round = (v: number) => Math.round(v * 10) / 10;
  for (const c of sorted) {
    const above = sorted.find((o) => o.from > c.from);
    const below = [...sorted].reverse().find((o) => o.from < c.from);
    if (isHang(c)) {
      // пол под вешалками: верх полки под штангой или чуть выше нижней штанги
      const floor = !below ? 0 : isHang(below) ? below.from + 3 : below.from + (out.get(below.id) ?? 0) + BOARD_CM;
      const want = c.height && c.height > 0 ? c.height : 100;
      out.set(c.id, round(Math.max(5, Math.min(want, c.from - floor))));
    } else if (above && !isHang(above)) {
      out.set(c.id, round(Math.max(3, above.from - BOARD_CM - c.from)));
    } else if (above) {
      const room = above.from - 3 - c.from;
      out.set(c.id, round(Math.max(3, c.height && c.height > 0 ? Math.min(c.height, room) : room / 2)));
    } else {
      out.set(c.id, c.height);
    }
  }
  return out;
}

/** Твёрдая вещь влезает, если её стороны (в любом повороте) не больше сторон ячейки. */
function fitsRigid(item: Size, cell: Size): boolean {
  const a = [item.width, item.height, item.depth].sort((x, y) => x - y);
  const b = [cell.width, cell.height, cell.depth].sort((x, y) => x - y);
  return a.every((v, i) => v <= b[i]);
}

function cellSize(cell: CellInfo): Size | null {
  if (cell.width == null || cell.depth == null || cell.height == null) return null;
  return { width: cell.width, height: cell.height, depth: cell.depth };
}

type Verdict = { ok: false } | { ok: true; mode: "hang" | "put"; reasons: string[]; score: number };

function judge(item: ItemProfile, cell: CellInfo): Verdict {
  const reasons: string[] = [];
  let score = 0;

  // --- Жёсткие запреты ---
  if (item.hazardous && cell.heightFromFloor < CHILD_SAFE_HEIGHT) return { ok: false };
  if (item.weight === "heavy" && cell.heightFromFloor > CHILD_SAFE_HEIGHT) return { ok: false };
  if (cell.allowedCategories?.length && !cell.allowedCategories.map(norm).includes(norm(item.category))) {
    return { ok: false };
  }
  if (cell.storageType === "rod" && !item.canHang) return { ok: false };
  if (cell.storageType === "hook" && (item.weight === "heavy" || (item.size && volume(item.size) > 20000))) {
    return { ok: false };
  }

  const mode: "hang" | "put" = cell.storageType === "rod" || cell.storageType === "hook" ? "hang" : "put";
  const space = cellSize(cell);
  if (item.size && space) {
    if (mode === "hang") {
      // На штанге важна только длина вещи — она должна поместиться в место под вешалками.
      const length = Math.max(item.size.width, item.size.height, item.size.depth);
      if (length > space.height) return { ok: false };
    } else if (item.canFold) {
      // Мягкую вещь можно сложить: достаточно объёма с запасом.
      if (volume(item.size) > volume(space) * 0.7) return { ok: false };
    } else if (!fitsRigid(item.size, space)) {
      return { ok: false };
    }
  } else if (!space && cell.storageType !== "rod") {
    score -= 5;
  }

  // --- Сколько места уже занято другими вещами ---
  const fill = cellFill(cell);
  if (fill) {
    const need = mode === "hang" ? 1 : item.size ? volume(item.size) * (item.canFold ? 0.7 : 1) : UNKNOWN_ITEM_CM3;
    if (need > fill.free) return { ok: false };
    const ratioAfter = (fill.capacity - fill.free + need) / fill.capacity;
    if (fill.ratio >= 0.6) {
      score -= Math.round((fill.ratio - 0.5) * 40);
      reasons.push(`полка уже занята на ${Math.min(99, Math.round(fill.ratio * 100))}%`);
    } else if (ratioAfter > 0.85) score -= 8;
  }

  // --- Баллы ---
  const zoneScore = ZONE_SCORE[item.usage][cell.zone];
  score += zoneScore;
  if (zoneScore >= 20) reasons.push(`${ZONE_TEXT[cell.zone]} — подходит для вещи, которой пользуетесь ${USAGE_TEXT[item.usage]}`);

  if (item.hazardous) reasons.push(`на высоте ${cell.heightFromFloor} см — ребёнок не достанет`);

  // Вес важен, когда вещь лежит: снимать тяжёлое с высоты опасно. На штанге вещь висит, высота штанги — норма.
  if (mode === "put" && item.weight === "heavy") {
    if (cell.heightFromFloor < 40) {
      score += 20;
      reasons.push("тяжёлое — внизу, безопасно доставать");
    } else if (cell.heightFromFloor < 100) score += 5;
    else score -= 15;
  } else if (mode === "put" && item.weight === "medium" && cell.heightFromFloor > 190) {
    score -= 15;
  }

  if (mode === "hang") {
    score += 12;
    reasons.push("можно повесить на вешалку — не помнётся");
  }
  if (cell.storageType === "bulky" && item.usage === "daily") score -= 15;

  const category = norm(item.category);
  const sameHere = category ? cell.items.filter((i) => norm(i.category) === category).length : 0;
  const othersHere = new Set(cell.items.map((i) => norm(i.category)).filter((c) => c && c !== category)).size;
  if (sameHere > 0) {
    score += 25;
    reasons.push(`рядом то же самое (${item.category})`);
  }
  if (othersHere > 0) score -= 10 * othersHere;
  if (cell.items.length === 0) {
    score += 6;
    reasons.push("полка пока свободна");
  } else if (!fill && cell.items.length >= 3) {
    score -= 5 * (cell.items.length - 2);
  }

  return { ok: true, mode, reasons, score };
}

/**
 * Лучшие места для вещи. Соседство по мебели учитывается дополнительно:
 * если в том же шкафу уже лежит та же категория, место получает бонус.
 */
export function suggestPlacements(item: ItemProfile, cells: CellInfo[], limit = 3): Suggestion[] {
  const category = norm(item.category);
  const moduleHasCategory = new Set(
    category
      ? cells.filter((c) => c.items.some((i) => norm(i.category) === category)).map((c) => c.location + "|" + c.module)
      : [],
  );

  const scored: Suggestion[] = [];
  for (const cell of cells) {
    const v = judge(item, cell);
    if (!v.ok) continue;
    let score = v.score;
    const reasons = [...v.reasons];
    if (moduleHasCategory.has(cell.location + "|" + cell.module) && !cell.items.some((i) => norm(i.category) === category)) {
      score += 10;
      reasons.push(`в этом же шкафу уже лежит «${item.category}»`);
    }
    scored.push({
      cellId: cell.id,
      location: cell.location,
      module: cell.module,
      shelf: cell.shelf,
      heightFromFloor: cell.heightFromFloor,
      zone: cell.zone,
      storageType: cell.storageType,
      mode: v.mode,
      score,
      reasons,
    });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.location.localeCompare(b.location, "ru") || a.heightFromFloor - b.heightFromFloor)
    .slice(0, limit);
}
