// Home WMS: место для вещи выбирает Gemini.
// Код заранее убирает только невозможное и опасное (не влезает, опасное ниже 150 см, тяжёлое высоко,
// на штангу — только то, что вешается). Из оставшихся мест Gemini сам выбирает лучшие, думая как
// опытный организатор хранения: влажность, холод, удобство, соседство, частота использования.
// Если Gemini недоступен — возвращаем места по баллам из placement.ts.

import type { CellInfo, ItemProfile, Suggestion } from "./placement.ts";
import { askGemini, type Fetcher } from "./intake.ts";

/** Факты о доме, которых модель не может знать сама. */
export const HOUSE_FACTS = [
  "Балкон не отапливается, зимой там мороз.",
  "В семье ребёнок 2 лет — опасное должно быть недоступно.",
  "Живут муж, жена и ребёнок; пользуются местами хранения вместе.",
];

const TYPE_TEXT: Record<string, string> = {
  shelf: "полка",
  drawer: "выдвижной ящик",
  rod: "штанга для вешалок",
  hook: "крючок",
  bulky: "крупный отсек (внутри кровати/дивана/пуфика)",
};
const USAGE_TEXT: Record<string, string> = {
  daily: "каждый день",
  weekly: "раз в неделю",
  monthly: "раз в месяц",
  rare: "редко, по сезону",
};
const WEIGHT_TEXT: Record<string, string> = { light: "лёгкая", medium: "средняя, 1–5 кг", heavy: "тяжёлая, больше 5 кг" };

function size(w: number | null, d: number | null, h: number | null): string {
  return w != null && d != null && h != null ? `${w}×${d}×${h} см (Ш×Г×В)` : "размер не указан";
}

export function placementPrompt(item: ItemProfile, candidates: Suggestion[], cells: Map<string, CellInfo>): string {
  const lines = candidates.map((s, i) => {
    const c = cells.get(s.cellId)!;
    const inside = c.items.map((x) => x.name || x.category).filter(Boolean).slice(0, 5).join("; ");
    const space = c.storageType === "rod"
      ? `штанга на высоте ${c.heightFromFloor} см, места под вешалки вниз ${c.height ?? "?"} см`
      : `${c.heightFromFloor} см от пола, ${size(c.width, c.depth, c.height)}`;
    return `${i + 1}. ${c.location} → ${c.module} → ${c.shelf} | ${TYPE_TEXT[c.storageType] ?? c.storageType} | ${space} | уже лежит: ${inside || "пусто"}`;
  });
  const dims = item.size ? `${item.size.width}×${item.size.depth}×${item.size.height} см` : "неизвестны";
  return [
    "Ты — опытный организатор домашнего хранения по системе 5S. Реши, куда в этой квартире лучше всего убрать вещь.",
    "Думай сам, как думал бы человек: где вещи не испортится (влажность в ванной, туалете и под раковиной или мойкой, холод на балконе),",
    "насколько удобно её доставать с учётом частоты, где лежат похожие вещи, безопасно ли это для ребёнка, не нелепо ли это место для такой вещи.",
    "",
    "Факты о доме:",
    ...HOUSE_FACTS.map((f) => "— " + f),
    "",
    `Вещь: ${item.name}${item.category ? ` (категория: ${item.category})` : ""}.`,
    `Пользуются: ${USAGE_TEXT[item.usage]}. Вес: ${WEIGHT_TEXT[item.weight]}. Примерные размеры: ${dims}.`,
    `${item.canHang ? "Можно повесить на вешалку. " : ""}${item.canFold ? "Мягкая, можно сложить. " : ""}${item.hazardous ? "Опасна для ребёнка." : ""}`,
    "",
    "Возможные места (все физически подходят по размеру и безопасности):",
    ...lines,
    "",
    "Выбери до 3 лучших мест, лучшее — первым. Если подходящих по здравому смыслу меньше трёх, верни меньше.",
    "Для каждого верни номер места из списка и одно короткое объяснение по-русски для семьи — почему именно сюда.",
  ].join("\n");
}

export const PLACEMENT_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: { number: { type: "INTEGER" }, reason: { type: "STRING" } },
    required: ["number", "reason"],
  },
};

/** Ответ модели → подсказки. Номера не из списка и повторы отбрасываются. */
export function pickFromAnswer(raw: unknown, candidates: Suggestion[], limit = 3): Suggestion[] {
  if (!Array.isArray(raw)) return [];
  const picked: Suggestion[] = [];
  const seen = new Set<number>();
  for (const entry of raw) {
    const n = Number((entry as Record<string, unknown>)?.number);
    const reason = String((entry as Record<string, unknown>)?.reason ?? "").trim().slice(0, 300);
    if (!Number.isInteger(n) || n < 1 || n > candidates.length || seen.has(n)) continue;
    seen.add(n);
    picked.push({ ...candidates[n - 1], reasons: reason ? [reason] : candidates[n - 1].reasons, by: "ai" });
    if (picked.length >= limit) break;
  }
  return picked;
}

export async function choosePlacements(
  item: ItemProfile,
  candidates: Suggestion[],
  cells: CellInfo[],
  apiKey: string | undefined,
  model: string,
  fetcher: Fetcher = fetch,
): Promise<Suggestion[]> {
  const fallback = candidates.slice(0, 3).map((s) => ({ ...s, by: "rules" as const }));
  if (!apiKey || candidates.length === 0) return fallback;
  const byId = new Map(cells.map((c) => [c.id, c]));
  const raw = await askGemini(
    [{ text: placementPrompt(item, candidates, byId) }],
    PLACEMENT_SCHEMA,
    apiKey,
    model,
    { temperature: 0.2, timeoutMs: 40000, label: "Gemini placement" },
    fetcher,
  );
  const picked = pickFromAnswer(raw, candidates);
  return picked.length ? picked : fallback;
}
