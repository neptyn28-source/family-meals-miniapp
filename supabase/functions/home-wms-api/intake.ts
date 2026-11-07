// Home WMS: приёмка вещи — Gemini по фото и/или описанию определяет, что это за вещь.
// Здесь только запрос к модели и разбор ответа; сеть передаётся снаружи, чтобы проверять тестами.

import type { ItemProfile, Size, Usage, Weight } from "./placement.ts";

export const BASE_CATEGORIES = [
  "Одежда", "Обувь", "Детское", "Игрушки", "Продукты", "Посуда", "Бытовая химия", "Лекарства", "Гигиена",
  "Косметика", "Текстиль", "Документы", "Канцелярия", "Техника", "Инструменты", "Уборка", "Стирка", "Сумки",
  "Сезонное", "Аквариум", "Хозяйство", "Мелочи",
];

const USAGES: Usage[] = ["daily", "weekly", "monthly", "rare"];
const WEIGHTS: Weight[] = ["light", "medium", "heavy"];

/** Черновик вещи: то, что система поняла сама. Частоту и вес потом подтверждает человек. */
export type IntakeDraft = ItemProfile & { usageGuessed: boolean; aiUsed: boolean };

export function intakePrompt(text: string, categories: string[]): string {
  return [
    "Ты — кладовщик домашнего склада. По фото и/или описанию определи одну вещь, которую хотят убрать на хранение.",
    "Верни JSON. Поля:",
    "name — короткое название вещи по-русски, с заглавной буквы;",
    `category — ровно одна категория из списка: ${categories.join(", ")};`,
    "usage — как часто такой вещью обычно пользуются: daily, weekly, monthly или rare (сезонное — rare);",
    "weight — light (до 1 кг), medium (1–5 кг) или heavy (больше 5 кг);",
    "can_hang — можно ли хранить на вешалке на штанге (одежда, сумки);",
    "can_fold — мягкая ли вещь, можно ли её сложить или сжать (ткань, одежда, пледы);",
    "hazardous — опасна ли для ребёнка 2 лет: бытовая химия, лекарства, острое, батарейки, мелкие детали;",
    "width_cm, height_cm, depth_cm — примерные габариты в сантиметрах, как вещь лежит или висит. Оцени их обязательно, даже если есть только название: возьми типичный размер такой вещи.",
    text ? `Описание от человека: «${text}».` : "Описания нет — только фото.",
  ].join("\n");
}

export const INTAKE_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    category: { type: "STRING" },
    usage: { type: "STRING", enum: USAGES },
    weight: { type: "STRING", enum: WEIGHTS },
    can_hang: { type: "BOOLEAN" },
    can_fold: { type: "BOOLEAN" },
    hazardous: { type: "BOOLEAN" },
    width_cm: { type: "NUMBER" },
    height_cm: { type: "NUMBER" },
    depth_cm: { type: "NUMBER" },
  },
  required: ["name", "category", "usage", "weight", "can_hang", "can_fold", "hazardous", "width_cm", "height_cm", "depth_cm"],
};

function cm(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 400 ? Math.round(n) : null;
}

/** Разбор ответа модели: всё, что не подходит, заменяется осторожными значениями по умолчанию. */
export function parseIntake(raw: unknown, text: string, categories: string[]): IntakeDraft {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name = typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, 120) : fallbackName(text);
  const category = categories.find((c) => c.toLowerCase() === String(r.category ?? "").trim().toLowerCase()) ?? null;
  const usage = USAGES.includes(r.usage as Usage) ? (r.usage as Usage) : "monthly";
  const weight = WEIGHTS.includes(r.weight as Weight) ? (r.weight as Weight) : "light";
  const w = cm(r.width_cm), h = cm(r.height_cm), d = cm(r.depth_cm);
  const size: Size | null = w && h && d ? { width: w, height: h, depth: d } : null;
  return {
    name,
    category,
    usage,
    weight,
    canHang: r.can_hang === true,
    canFold: r.can_fold === true,
    // Опасность лучше перестраховать: категории химии и лекарств опасны всегда.
    hazardous: r.hazardous === true || category === "Бытовая химия" || category === "Лекарства",
    size,
    usageGuessed: USAGES.includes(r.usage as Usage),
    aiUsed: Object.keys(r).length > 0,
  };
}

export function fallbackName(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t ? (t[0].toUpperCase() + t.slice(1)).slice(0, 120) : "Вещь";
}

export type IntakeInput = { text: string; photo: { mime: string; data: string } | null };
export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** Запрос к Gemini. Без ключа или при ошибке возвращает черновик без ИИ — приёмка всё равно работает. */
export async function analyzeItem(
  input: IntakeInput,
  categories: string[],
  apiKey: string | undefined,
  model: string,
  fetcher: Fetcher = fetch,
): Promise<IntakeDraft> {
  if (!apiKey) return parseIntake(null, input.text, categories);
  const parts: unknown[] = [{ text: intakePrompt(input.text, categories) }];
  if (input.photo) parts.push({ inline_data: { mime_type: input.photo.mime, data: input.photo.data } });
  try {
    const res = await fetcher(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: INTAKE_SCHEMA },
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!res.ok) {
      console.error("Gemini intake failed", res.status, (await res.text()).slice(0, 300));
      return parseIntake(null, input.text, categories);
    }
    const data = await res.json();
    return parseIntake(JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "null"), input.text, categories);
  } catch (err) {
    console.error("Gemini intake failed", err);
    return parseIntake(null, input.text, categories);
  }
}
