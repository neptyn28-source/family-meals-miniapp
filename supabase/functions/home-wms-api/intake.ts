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
    "can_fold — мягкая ли вещь, которую можно сложить или сжать как ткань (одежда, пледы, сумки из ткани). Жёсткие складные вещи (гладильная доска, стремянка, стул, сушилка, коляска, самокат) — false: у них складываются только ножки, а длина остаётся;",
    "hazardous — опасна ли для ребёнка 2 лет: бытовая химия, лекарства, острое, батарейки, мелкие детали;",
    "width_cm, height_cm, depth_cm — примерные габариты в сантиметрах, как вещь лежит или висит; складную жёсткую вещь — в сложенном виде (гладильная доска сложенная ≈ 120–140 × 35–40 × 5–8). Оцени их обязательно, даже если есть только название: возьми типичный размер такой вещи.",
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
    // Жёсткие складные вещи модель путает с мягкими: доска «складывается», но только ножками.
    canFold: r.can_fold === true && !RIGID_FOLDING.test(name.toLowerCase()),
    // Опасность лучше перестраховать: категории химии и лекарств опасны всегда.
    hazardous: r.hazardous === true || category === "Бытовая химия" || category === "Лекарства",
    size,
    usageGuessed: USAGES.includes(r.usage as Usage),
    aiUsed: Object.keys(r).length > 0,
  };
}

/** Складываются, но не сжимаются: длина остаётся прежней. */
export const RIGID_FOLDING = /гладильн|стремянк|лестниц|стул|табурет|сушилк|коляск|самокат|велосипед|раскладушк|мольберт|столик|ёлк|елк|зонт|удочк|лыж|сноуборд|санк/;

export function fallbackName(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t ? (t[0].toUpperCase() + t.slice(1)).slice(0, 120) : "Вещь";
}

export type IntakeInput = { text: string; photo: { mime: string; data: string } | null };
export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** Запасная модель Gemini (умнее, но медленнее), если основная lite перегружена у Google или не отвечает. */
export const BACKUP_MODEL = "gemini-flash-latest";
/** Модели Groq — второй бесплатный поставщик, если Gemini недоступен совсем. */
export const GROQ_MODELS = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b"];

/** Ключи ИИ: строка — только ключ Gemini (как раньше), объект — Gemini и/или Groq. */
export type AiKeys = string | { gemini?: string; groq?: string; groqModel?: string } | undefined;

function keysOf(keys: AiKeys): { gemini?: string; groq?: string; groqModel?: string } {
  return typeof keys === "string" ? { gemini: keys } : keys ?? {};
}

export function hasAi(keys: AiKeys): boolean {
  const k = keysOf(keys);
  return !!(k.gemini || k.groq);
}

const RETRY_STATUSES = [404, 429, 500, 502, 503, 504];
/** Gemini перегружен или кончилась квота — запасная модель Gemini обычно тоже не ответит; если есть Groq — сразу к нему. */
const OVERLOAD_STATUSES = [429, 503];
/** Меньше этого времени на запрос не тратим: ответ всё равно не успеет прийти. */
const MIN_CALL_MS = 1500;

export type AskOpts = { temperature: number; timeoutMs: number; budgetMs?: number; label: string };

/** Сколько можно ждать очередной запрос: не дольше timeoutMs и не дольше общего срока. 0 — время вышло. */
export function callTimeout(deadline: number, timeoutMs: number, now = Date.now()): number {
  const left = Math.min(timeoutMs, deadline - now);
  return left < MIN_CALL_MS ? 0 : left;
}

/**
 * Запрос к ИИ с JSON-ответом. Сначала Gemini (основная модель, потом запасная), потом Groq.
 * Gemini просим думать недолго; если модель не понимает эту настройку — повторяем без неё.
 */
export async function askGemini(
  parts: unknown[],
  schema: unknown,
  keys: AiKeys,
  model: string,
  opts: AskOpts,
  fetcher: Fetcher = fetch,
): Promise<unknown | null> {
  const k = keysOf(keys);
  // Общий срок на все попытки: человек ждёт ответа на экране, дальше — ручной ввод/правила.
  const deadline = Date.now() + (opts.budgetMs ?? opts.timeoutMs * 2);
  if (k.gemini) {
    const call = (m: string, thinking: boolean) => {
      const ms = callTimeout(deadline, opts.timeoutMs);
      if (!ms) throw new Error("deadline");
      const generationConfig: Record<string, unknown> = {
        temperature: opts.temperature,
        responseMimeType: "application/json",
        responseSchema: schema,
      };
      if (thinking) generationConfig.thinkingConfig = { thinkingLevel: "low" };
      return fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": k.gemini! },
        body: JSON.stringify({ contents: [{ parts }], generationConfig }),
        signal: AbortSignal.timeout(ms),
      });
    };
    for (const m of [...new Set([model, BACKUP_MODEL])]) {
      try {
        let res = await call(m, true);
        if (res.status === 400) {
          console.error(`${opts.label} ${m}: thinking config rejected`, (await res.text()).slice(0, 300));
          res = await call(m, false);
        }
        if (!res.ok) {
          console.error(`${opts.label} ${m} failed`, res.status, (await res.text()).slice(0, 300));
          if (OVERLOAD_STATUSES.includes(res.status) && k.groq) break;
          if (RETRY_STATUSES.includes(res.status)) continue;
          break;
        }
        const data = await res.json();
        return JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "null");
      } catch (err) {
        console.error(`${opts.label} ${m} failed`, err);
        if (!callTimeout(deadline, opts.timeoutMs)) break;
      }
    }
  }
  if (k.groq) return askGroq(parts, schema, k.groq, k.groqModel, opts, deadline, fetcher);
  return null;
}

/** Groq (совместим с OpenAI). Понимает только текст: фото без описания ему не передать. */
async function askGroq(
  parts: unknown[],
  schema: unknown,
  apiKey: string,
  preferred: string | undefined,
  opts: AskOpts,
  deadline: number,
  fetcher: Fetcher,
): Promise<unknown | null> {
  const text = parts.map((p) => (p as { text?: string })?.text).filter(Boolean).join("\n");
  if (!text) return null;
  // Groq отдаёт только JSON-объект, поэтому список заворачиваем в { items: [...] }.
  const isArray = (schema as { type?: string })?.type === "ARRAY";
  const shape = isArray ? { type: "OBJECT", properties: { items: schema }, required: ["items"] } : schema;
  const prompt = text + "\n\nОтветь строго одним JSON-объектом по этой схеме (типы в стиле Google): " + JSON.stringify(shape);
  for (const m of [...new Set([preferred, ...GROQ_MODELS].filter((x): x is string => !!x))]) {
    const ms = callTimeout(deadline, opts.timeoutMs);
    if (!ms) {
      console.error(`${opts.label}: время на ИИ вышло`);
      return null;
    }
    try {
      const res = await fetcher("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: m,
          temperature: opts.temperature,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "Отвечай только JSON, без пояснений вокруг. Тексты внутри JSON — по-русски." },
            { role: "user", content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(ms),
      });
      if (!res.ok) {
        console.error(`${opts.label} groq ${m} failed`, res.status, (await res.text()).slice(0, 300));
        if (RETRY_STATUSES.includes(res.status) || res.status === 400) continue;
        return null;
      }
      const data = await res.json();
      const parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "null");
      return isArray ? (parsed?.items ?? null) : parsed;
    } catch (err) {
      console.error(`${opts.label} groq ${m} failed`, err);
    }
  }
  return null;
}

/** Запрос к Gemini. Без ключа или при ошибке возвращает черновик без ИИ — приёмка всё равно работает. */
export async function analyzeItem(
  input: IntakeInput,
  categories: string[],
  apiKey: AiKeys,
  model: string,
  fetcher: Fetcher = fetch,
): Promise<IntakeDraft> {
  if (!hasAi(apiKey)) return parseIntake(null, input.text, categories);
  const parts: unknown[] = [{ text: intakePrompt(input.text, categories) }];
  if (input.photo) parts.push({ inline_data: { mime_type: input.photo.mime, data: input.photo.data } });
  const raw = await askGemini(parts, INTAKE_SCHEMA, apiKey, model, { temperature: 0, timeoutMs: 9000, budgetMs: 15000, label: "AI intake" }, fetcher);
  return parseIntake(raw, input.text, categories);
}
