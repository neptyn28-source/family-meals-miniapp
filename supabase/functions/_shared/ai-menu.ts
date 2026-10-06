export const AI_MENU_FORMAT = "family-meal-plan-v3";

export const AI_MEAL_TYPES = ["breakfast", "snack1", "lunch", "snack2", "dinner"] as const;
export type AiMealType = typeof AI_MEAL_TYPES[number];

export type AiMenuIngredientUse = "cooking" | "direct";

export interface AiMenuIngredient {
  name: string;
  amount: number;
  unit: "g" | "ml" | "pcs";
  state: "raw" | "cooked" | "semi_finished" | "frozen" | "dry" | "canned";
  use: AiMenuIngredientUse;
}

export function inventoryUsageCompatible(
  inventoryMode: string | null | undefined,
  requirementUse: AiMenuIngredientUse,
): boolean {
  const mode = inventoryMode || "any";
  if (mode === "cooking_only") return requirementUse === "cooking";
  return true;
}

export interface AiMenuPortionComponent {
  name: string;
  amount: number;
  unit: "g" | "ml" | "pcs";
}

export interface AiMenuMeal {
  title: string;
  cook_block_id: string | null;
  external: boolean;
  portions: Record<string, string>;
  portion_components: Record<string, AiMenuPortionComponent[]>;
  notes: string;
}

export interface AiMenuDay {
  date: string;
  meals: Record<AiMealType, AiMenuMeal>;
}

export interface AiMenuCookBlock {
  id: string;
  title: string;
  serves: { date: string; meal_type: AiMealType }[];
  ingredients: AiMenuIngredient[];
  recipe: {
    steps: string[];
    ready_output: string;
    child_adaptation: string;
    seasoning: string;
  };
}

export interface AiMenuPlan {
  format: typeof AI_MENU_FORMAT;
  week_start: string;
  summary: string;
  days: AiMenuDay[];
  cook_blocks: AiMenuCookBlock[];
}

export class AiMenuValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super(issues[0] || "Некорректное меню");
    this.name = "AiMenuValidationError";
    this.issues = issues;
  }
}

function isDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T00:00:00Z"));
}

function addDays(v: string, days: number) {
  const d = new Date(v + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function nonEmpty(v: unknown) {
  return typeof v === "string" && v.trim().length > 0;
}

function cleanText(v: unknown, max = 4000) {
  return String(v ?? "").trim().slice(0, max);
}

function cleanPortions(v: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return result;
  for (const [k, value] of Object.entries(v as Record<string, unknown>)) {
    if (!["husband", "wife", "child"].includes(k)) continue;
    const text = cleanText(value, 500);
    if (text) result[k] = text;
  }
  return result;
}

function cleanPortionComponents(v: unknown, issues: string[], slot: string): Record<string, AiMenuPortionComponent[]> {
  const result: Record<string, AiMenuPortionComponent[]> = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return result;

  for (const role of ["husband", "wife", "child"]) {
    const rawList = (v as Record<string, unknown>)[role];
    if (rawList == null) continue;
    if (!Array.isArray(rawList)) {
      issues.push(slot + ": portion_components." + role + " должен быть массивом.");
      continue;
    }

    const list: AiMenuPortionComponent[] = [];
    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i] as Record<string, unknown>;
      const name = cleanText(item?.name, 200);
      const amount = Number(item?.amount);
      const unit = String(item?.unit ?? "");
      if (!name) issues.push(slot + ": portion_components." + role + "[" + i + "] — пустое название компонента.");
      if (!Number.isFinite(amount) || amount <= 0) issues.push(slot + ": portion_components." + role + "[" + i + "].amount должен быть > 0.");
      if (!["g", "ml", "pcs"].includes(unit)) issues.push(slot + ": portion_components." + role + "[" + i + "].unit должен быть g/ml/pcs.");
      if (name && Number.isFinite(amount) && amount > 0 && ["g", "ml", "pcs"].includes(unit)) {
        list.push({ name, amount, unit: unit as AiMenuPortionComponent["unit"] });
      }
    }
    result[role] = list;
  }
  return result;
}

export function extractAiMenuJson(text: string): unknown {
  const source = String(text ?? "").trim();
  if (!source) throw new AiMenuValidationError(["Вставь JSON меню из ChatGPT."]);

  const attempts: string[] = [source];
  const fence = source.match(/\x60\x60\x60(?:json)?\s*([\s\S]*?)\x60\x60\x60/i);
  if (fence?.[1]) attempts.unshift(fence[1].trim());

  const first = source.indexOf("{");
  const last = source.lastIndexOf("}");
  if (first >= 0 && last > first) attempts.push(source.slice(first, last + 1));

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next representation
    }
  }

  throw new AiMenuValidationError([
    "Не удалось найти корректный JSON. Вставь ответ ChatGPT целиком или блок FAMILY_MEAL_PLAN_JSON.",
  ]);
}

export function validateAiMenuPlan(value: unknown): AiMenuPlan {
  const issues: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AiMenuValidationError(["Корень меню должен быть JSON-объектом."]);
  }
  const raw = value as Record<string, any>;

  if (raw.format !== AI_MENU_FORMAT) {
    issues.push(`format должен быть "${AI_MENU_FORMAT}".`);
  }
  if (!isDate(raw.week_start)) {
    issues.push("week_start должен быть датой YYYY-MM-DD.");
  } else {
    const weekday = new Date(raw.week_start + "T00:00:00Z").getUTCDay();
    if (weekday !== 1) issues.push("week_start должен быть понедельником.");
  }

  const daysRaw = Array.isArray(raw.days) ? raw.days : [];
  if (daysRaw.length !== 7) issues.push("В days должно быть ровно 7 дней.");

  const normalizedDays: AiMenuDay[] = [];
  const slotToBlock = new Map<string, string | null>();

  for (let i = 0; i < daysRaw.length; i++) {
    const day = daysRaw[i] ?? {};
    const expected = isDate(raw.week_start) ? addDays(raw.week_start, i) : null;
    if (!isDate(day.date)) issues.push(`days[${i}].date должен быть YYYY-MM-DD.`);
    else if (expected && day.date !== expected) issues.push(`days[${i}].date должен быть ${expected}.`);

    const mealsRaw = day.meals && typeof day.meals === "object" && !Array.isArray(day.meals) ? day.meals : {};
    const meals = {} as Record<AiMealType, AiMenuMeal>;

    for (const mealType of AI_MEAL_TYPES) {
      const m = mealsRaw[mealType];
      if (!m || typeof m !== "object" || Array.isArray(m)) {
        issues.push(`${day.date || `день ${i + 1}`}: нет слота ${mealType}.`);
        continue;
      }
      if (!nonEmpty(m.title)) issues.push(`${day.date || `день ${i + 1}`} ${mealType}: пустое название.`);

      const external = Boolean(m.external);
      const cookBlockId = m.cook_block_id == null || String(m.cook_block_id).trim() === ""
        ? null
        : String(m.cook_block_id).trim();

      if (!external && !cookBlockId) {
        issues.push(`${day.date || `день ${i + 1}`} ${mealType}: нужен cook_block_id или external=true.`);
      }
      if (external && cookBlockId) {
        issues.push(`${day.date || `день ${i + 1}`} ${mealType}: external-блюдо не должно ссылаться на cook_block_id.`);
      }

      const slotLabel = String(day.date || ("день " + (i + 1))) + " " + mealType;
      const portionComponents = cleanPortionComponents(m.portion_components, issues, slotLabel);
      if (!external) {
        for (const role of ["husband", "wife"]) {
          if (!portionComponents[role]?.length) {
            issues.push(slotLabel + ": нужна раскладка portion_components." + role + " по составляющим блюда.");
          }
        }
      }

      const normalized: AiMenuMeal = {
        title: cleanText(m.title, 500),
        cook_block_id: cookBlockId,
        external,
        portions: cleanPortions(m.portions),
        portion_components: portionComponents,
        notes: cleanText(m.notes, 2000),
      };
      meals[mealType] = normalized;
      if (isDate(day.date)) slotToBlock.set(`${day.date}|${mealType}`, cookBlockId);
    }
    if (isDate(day.date)) normalizedDays.push({ date: day.date, meals });
  }

  const blocksRaw = Array.isArray(raw.cook_blocks) ? raw.cook_blocks : [];
  const normalizedBlocks: AiMenuCookBlock[] = [];
  const blockIds = new Set<string>();
  const servedSlots = new Map<string, string>();

  for (let i = 0; i < blocksRaw.length; i++) {
    const b = blocksRaw[i] ?? {};
    const id = cleanText(b.id, 120);
    if (!id) issues.push(`cook_blocks[${i}].id пустой.`);
    else if (blockIds.has(id)) issues.push(`Повторяется cook_block id "${id}".`);
    else blockIds.add(id);

    if (!nonEmpty(b.title)) issues.push(`cook_blocks[${i}].title пустой.`);

    const servesRaw = Array.isArray(b.serves) ? b.serves : [];
    if (!servesRaw.length) issues.push(`cook_blocks[${i}] не обслуживает ни одного приёма пищи.`);
    const serves: AiMenuCookBlock["serves"] = [];
    for (let j = 0; j < servesRaw.length; j++) {
      const s = servesRaw[j] ?? {};
      if (!isDate(s.date) || !AI_MEAL_TYPES.includes(s.meal_type)) {
        issues.push(`cook_blocks[${i}].serves[${j}] некорректен.`);
        continue;
      }
      const key = `${s.date}|${s.meal_type}`;
      const prev = servedSlots.get(key);
      if (prev) issues.push(`Слот ${key} обслуживается сразу блоками "${prev}" и "${id}".`);
      else servedSlots.set(key, id);
      serves.push({ date: s.date, meal_type: s.meal_type });
    }

    const ingredientsRaw = Array.isArray(b.ingredients) ? b.ingredients : [];
    if (!ingredientsRaw.length) issues.push(`cook_blocks[${i}] не содержит ингредиентов.`);
    const ingredients: AiMenuIngredient[] = [];
    for (let j = 0; j < ingredientsRaw.length; j++) {
      const ing = ingredientsRaw[j] ?? {};
      const amount = Number(ing.amount);
      const unit = String(ing.unit ?? "");
      const state = String(ing.state ?? "raw");
      const use = String(ing.use ?? "");
      if (!nonEmpty(ing.name)) issues.push(`cook_blocks[${i}].ingredients[${j}]: пустое название.`);
      if (!Number.isFinite(amount) || amount <= 0) issues.push(`cook_blocks[${i}].ingredients[${j}]: amount должен быть > 0.`);
      if (!["g", "ml", "pcs"].includes(unit)) issues.push(`cook_blocks[${i}].ingredients[${j}]: unit должен быть g/ml/pcs.`);
      if (!["raw", "cooked", "semi_finished", "frozen", "dry", "canned"].includes(state)) {
        issues.push(`cook_blocks[${i}].ingredients[${j}]: неизвестное состояние ${state}.`);
      }
      if (!["cooking", "direct"].includes(use)) {
        issues.push(`cook_blocks[${i}].ingredients[${j}]: use должен быть cooking или direct.`);
      }
      if (nonEmpty(ing.name) && Number.isFinite(amount) && amount > 0 &&
          ["g", "ml", "pcs"].includes(unit) &&
          ["raw", "cooked", "semi_finished", "frozen", "dry", "canned"].includes(state) &&
          ["cooking", "direct"].includes(use)) {
        ingredients.push({
          name: cleanText(ing.name, 300),
          amount,
          unit: unit as AiMenuIngredient["unit"],
          state: state as AiMenuIngredient["state"],
          use: use as AiMenuIngredient["use"],
        });
      }
    }

    const recipeRaw = b.recipe && typeof b.recipe === "object" && !Array.isArray(b.recipe) ? b.recipe : {};
    const steps = Array.isArray(recipeRaw.steps)
      ? recipeRaw.steps.map((x: unknown) => cleanText(x, 1000)).filter(Boolean).slice(0, 30)
      : [];
    const readyOutput = cleanText(recipeRaw.ready_output, 1000);
    const childAdaptation = cleanText(recipeRaw.child_adaptation, 1500);
    const seasoning = cleanText(recipeRaw.seasoning, 1500);
    const hasMainMeal = serves.some((x) => ["breakfast", "lunch", "dinner"].includes(x.meal_type));

    if (!steps.length) issues.push("cook_blocks[" + i + "].recipe.steps не должен быть пустым.");
    if (hasMainMeal && steps.length < 3) {
      issues.push("cook_blocks[" + i + "]: для завтрака/обеда/ужина нужно минимум 3 подробных шага.");
    }
    const joinedSteps = steps.join(" ");
    if (hasMainMeal && !/\d+(?:[.,]\d+)?\s*(?:мин|сек)/i.test(joinedSteps)) {
      issues.push("cook_blocks[" + i + "]: в рецепте должно быть точное время (например, 8 минут).");
    }
    if (hasMainMeal && !/\d+(?:[.,]\d+)?\s*(?:г|мл|шт\.?)/i.test(joinedSteps)) {
      issues.push("cook_blocks[" + i + "]: в шагах должны быть точные количества продуктов в г/мл/шт.");
    }
    if (hasMainMeal && !/(?:слаб|средн|сильн)\w*\s+огн|огн\w*\s+(?:слаб|средн|сильн)|\d{2,3}\s*°?\s*[cс]|температур|мощност|режим/i.test(joinedSteps)) {
      issues.push("cook_blocks[" + i + "]: укажи силу огня, температуру, мощность или режим техники.");
    }
    if (hasMainMeal && /по вкусу|щепотк|немного|на глаз|примерно|около/i.test(joinedSteps)) {
      issues.push("cook_blocks[" + i + "].recipe.steps: нельзя готовить на глаз; нужны точные количества и время.");
    }
    const isMultiDayMain = hasMainMeal && new Set(serves.map((x) => x.date)).size > 1;
    if (isMultiDayMain && !/охлад/i.test(joinedSteps)) {
      issues.push("cook_blocks[" + i + "]: для партии на несколько дней опиши охлаждение второй части.");
    }
    if (isMultiDayMain && !/холодиль|контейнер|хран/i.test(joinedSteps)) {
      issues.push("cook_blocks[" + i + "]: для партии на несколько дней опиши хранение второй части.");
    }
    if (isMultiDayMain && !/разогр/i.test(joinedSteps)) {
      issues.push("cook_blocks[" + i + "]: для партии на несколько дней опиши точный разогрев второй части.");
    }
    if (!readyOutput) issues.push("cook_blocks[" + i + "].recipe.ready_output обязателен.");
    if (!childAdaptation) issues.push("cook_blocks[" + i + "].recipe.child_adaptation обязателен.");
    if (!seasoning) issues.push("cook_blocks[" + i + "].recipe.seasoning обязателен.");
    if (/по вкусу|щепотк|немного|на глаз|примерно|около/i.test(seasoning)) {
      issues.push("cook_blocks[" + i + "].recipe.seasoning: нельзя по вкусу/на глаз/примерно; укажи точное количество или без соли/специй.");
    }

    normalizedBlocks.push({
      id,
      title: cleanText(b.title, 500),
      serves,
      ingredients,
      recipe: {
        steps,
        ready_output: readyOutput,
        child_adaptation: childAdaptation,
        seasoning,
      },
    });
  }

  for (const [slot, blockId] of slotToBlock) {
    if (!blockId) continue;
    if (!blockIds.has(blockId)) issues.push(`${slot}: cook_block_id "${blockId}" не найден.`);
    if (servedSlots.get(slot) !== blockId) issues.push(`${slot}: блок "${blockId}" должен содержать этот слот в serves.`);
  }
  for (const [slot, blockId] of servedSlots) {
    if (slotToBlock.get(slot) !== blockId) {
      issues.push(`Блок "${blockId}" ссылается на ${slot}, но сам слот на него не ссылается.`);
    }
  }

  if (issues.length) throw new AiMenuValidationError(issues);

  return {
    format: AI_MENU_FORMAT,
    week_start: raw.week_start,
    summary: cleanText(raw.summary, 4000),
    days: normalizedDays,
    cook_blocks: normalizedBlocks,
  };
}

export function parseAiMenuPlan(text: string): AiMenuPlan {
  return validateAiMenuPlan(extractAiMenuJson(text));
}

export function aggregateAiCookBlocks(plan: AiMenuPlan) {
  const map = new Map<string, AiMenuIngredient & { amount: number }>();
  for (const block of plan.cook_blocks) {
    for (const ing of block.ingredients) {
      const key = [normalizeIngredientName(ing.name), ing.unit, ing.state].join("|");
      const row = map.get(key) ?? { ...ing, amount: 0 };
      row.amount += ing.amount;
      map.set(key, row);
    }
  }
  return [...map.values()];
}

export function normalizeIngredientName(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
