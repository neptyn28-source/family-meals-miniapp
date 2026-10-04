import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyInitData } from "../_shared/telegram.ts";
import {
  AI_MENU_FORMAT,
  AiMenuValidationError,
  normalizeIngredientName,
  parseAiMenuPlan,
  type AiMenuIngredient,
  type AiMenuPlan,
} from "../_shared/ai-menu.ts";
import {
  IngredientIndex,
  stateCompatible,
  toDefaultUnit,
} from "../_shared/planner/normalize.ts";
import type {
  Ingredient,
  IngredientPrice,
  InventoryItem,
} from "../_shared/planner/types.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MEAL_TYPES = ["breakfast", "snack1", "lunch", "snack2", "dinner"] as const;
const SORT: Record<string, number> = {
  breakfast: 10,
  snack1: 20,
  lunch: 30,
  snack2: 40,
  dinner: 50,
};

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

function serviceKey(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.default) return String(parsed.default);
  } catch {
    // legacy plain key
  }
  return raw;
}

function isDate(v: unknown): v is string {
  return typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v + "T00:00:00Z"));
}

function cleanGoal(v: unknown) {
  const value = String(v ?? "");
  return ["lose", "maintain", "gain"].includes(value) ? value : "maintain";
}

function cleanPositive(v: unknown, max: number) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > max) return null;
  return Math.round(n * 10) / 10;
}

function profileFromSettings(settings: any) {
  const p = settings?.ai_profile ?? {};
  return {
    husband: {
      weight_kg: cleanPositive(p?.husband?.weight_kg, 400),
      height_cm: cleanPositive(p?.husband?.height_cm, 260),
      goal: cleanGoal(p?.husband?.goal),
    },
    wife: {
      weight_kg: cleanPositive(p?.wife?.weight_kg, 400),
      height_cm: cleanPositive(p?.wife?.height_cm, 260),
      goal: cleanGoal(p?.wife?.goal),
    },
    child: {
      age_years: cleanPositive(p?.child?.age_years, 18),
    },
  };
}

function goalLabel(goal: string) {
  return ({ lose: "снижение веса", maintain: "поддержание", gain: "набор веса" } as Record<string, string>)[goal] || goal;
}

function stateLabel(state: string) {
  return ({
    raw: "сырое",
    cooked: "готовое",
    semi_finished: "полуфабрикат",
    frozen: "замороженное",
    dry: "сухое",
    canned: "консервы",
  } as Record<string, string>)[state] || state;
}

function dateLabel(date: string | null | undefined) {
  return date ? String(date) : "не указан";
}

function buildExportPrompt(args: {
  weekStart: string;
  family: any;
  members: any[];
  settings: any;
  profile: ReturnType<typeof profileFromSettings>;
  rules: any[];
  inventory: any[];
  feedback: any[];
}) {
  const { weekStart, family, members, settings, profile, rules, inventory, feedback } = args;
  const hard = rules.filter((x) => x.enabled && x.rule_type === "hard");
  const preferences = rules.filter((x) => x.enabled && x.rule_type !== "hard");

  const uniqueDescriptions = (rows: any[]) => {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = String(row.description ?? "").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const memberNames = new Map(members.map((m) => [String(m.id), m]));

  const feedbackLines = feedback.map((x) => {
    const m = memberNames.get(String(x.member_id));
    const person = m ? `${m.role === "wife" ? "жена" : m.role === "husband" ? "муж" : m.role}: ${m.name}` : "член семьи";
    const parts = [
      x.taste ? `вкус=${x.taste}` : null,
      x.portion ? `порция=${x.portion}` : null,
      x.satiety != null ? `сытость=${x.satiety}/10` : null,
      x.strong_hunger ? "сильный голод после" : null,
      x.snack_eaten ? "перекус съеден" : null,
      x.leftovers ? "были остатки" : null,
      x.action ? `действие=${x.action}` : null,
      x.comment ? `комментарий: ${x.comment}` : null,
    ].filter(Boolean).join("; ");
    return `- ${x.title_snapshot} — ${person} — ${parts || "без деталей"}`;
  });

  const inventoryLines = inventory.length
    ? inventory.map((x) =>
        `- ${x.name}: ${x.quantity} ${x.unit}; состояние=${stateLabel(x.state)}; срочно=${x.urgent ? "да" : "нет"}; открыт=${x.opened ? "да" : "нет"}; срок=${dateLabel(x.use_by)}${x.note ? `; заметка=${x.note}` : ""}`
      )
    : ["- Остатков нет."];

  const hardLines = uniqueDescriptions(hard).map((x) => `- ${x.description}`);
  const prefLines = uniqueDescriptions(preferences).map((x) => `- ${x.description}`);

  const husbandName = members.find((x) => x.role === "husband")?.name || "Муж";
  const wifeName = members.find((x) => x.role === "wife")?.name || "Жена";

  return `ЗАДАЧА ДЛЯ CHATGPT: СОСТАВИТЬ СЕМЕЙНОЕ МЕНЮ

Ты составляешь меню как повар и планировщик питания. Бот НЕ выбирает блюда и НЕ определяет порции: это твоя работа.
Бот после твоего ответа сам посчитает покупки по блоку JSON, вычтет остатки и округлит до упаковок.

Целевая неделя начинается: ${weekStart}.
Бюджет семьи: ${family.budget_weekly ?? settings?.weekly_budget_rub ?? 8000} RUB в неделю.
Магазины: ${(settings?.stores ?? []).join(", ") || "не указаны"}.
Техника: ${(settings?.equipment ?? []).join(", ") || "не указана"}.

СОСТАВ СЕМЬИ И ЦЕЛИ
- ${husbandName} (муж): вес ${profile.husband.weight_kg ?? "не указан"} кг; рост ${profile.husband.height_cm ?? "не указан"} см; цель — ${goalLabel(profile.husband.goal)}.
- ${wifeName} (жена): вес ${profile.wife.weight_kg ?? "не указан"} кг; рост ${profile.wife.height_cm ?? "не указан"} см; цель — ${goalLabel(profile.wife.goal)}.
- Ребёнок: возраст ${profile.child.age_years ?? "не указан"} года/лет.
- Дни детского сада: ${(settings?.kindergarten_weekdays ?? [1,2,3,4,5]).join(", ")} (ISO: 1=пн ... 7=вс).
- Перекусов у жены в день: ${settings?.wife_snacks ?? 2}.
- Перекусов у мужа в день: ${settings?.husband_snacks ?? 0}.

ЖЁСТКИЕ ПРАВИЛА — НАРУШАТЬ НЕЛЬЗЯ
${hardLines.length ? hardLines.join("\n") : "- Дополнительных жёстких правил нет."}

ПРЕДПОЧТЕНИЯ
${prefLines.length ? prefLines.join("\n") : "- Дополнительных предпочтений нет."}

ТЕКУЩИЕ ОСТАТКИ ДОМА
${inventoryLines.join("\n")}

ПОСЛЕДНИЕ ОТЗЫВЫ
${feedbackLines.length ? feedbackLines.join("\n") : "- Отзывов пока нет."}

КАК НУЖНО СОСТАВИТЬ МЕНЮ
- Сделай меню на 7 дней: завтрак, перекус 1, обед, перекус 2, ужин.
- Порции мужа и жены подбирай по их весу, цели и отзывам о сытости/порциях. Не используй старые автоматические диапазоны как главный источник истины.
- Для ребёнка укажи отдельную детскую порцию и адаптацию блюда. В будни его обед может быть "Обед в детском саду" с external=true.
- Учитывай остатки при выборе блюд, особенно скоропортящиеся/urgent, но не пытайся сам вычитать их из списка покупок — это сделает бот.
- Двухдневную готовку для обедов/ужинов оформляй ОДНИМ cook_block на всю партию. Ингредиенты в этом блоке — ОБЩЕЕ количество сырья на все перечисленные servings, один раз.
- Завтраки и перекусы не объединяй в двухдневные batch-блоки.
- Ингредиенты указывай в сыром/покупном виде и точных g/ml/pcs.
- Если одно блюдо готовится один раз на Пн+Вт, не дублируй его ингредиенты вторым блоком.
- Сначала дай обычное понятное меню и короткие рецепты для человека.
- В САМОМ КОНЦЕ обязательно дай ровно один JSON code block без комментариев внутри. Бот импортирует именно его.

ОБЯЗАТЕЛЬНЫЙ JSON-КОНТРАКТ
format всегда "${AI_MENU_FORMAT}".
week_start всегда "${weekStart}".
days — ровно 7 последовательных дней.
В каждом дне обязательны breakfast, snack1, lunch, snack2, dinner.
Для еды дома у meal должен быть cook_block_id.
Для еды вне дома: external=true и cook_block_id=null.
portions содержит понятные порции husband/wife/child.
cook_blocks описывают каждую готовку ровно один раз.
Каждый cook_block перечисляет все слоты, которые он кормит, в serves.
ingredients — суммарное количество сырья на ВЕСЬ cook_block.
unit только g, ml или pcs.
state только raw, cooked, semi_finished, frozen, dry или canned.

СХЕМА:
{
  "format": "${AI_MENU_FORMAT}",
  "week_start": "${weekStart}",
  "summary": "короткая логика недели",
  "days": [
    {
      "date": "${weekStart}",
      "meals": {
        "breakfast": {
          "title": "название",
          "cook_block_id": "mon-breakfast",
          "external": false,
          "portions": {"husband":"...", "wife":"...", "child":"..."},
          "notes": ""
        },
        "snack1": {"title":"...", "cook_block_id":"mon-snack1", "external":false, "portions":{"husband":"...","wife":"...","child":"..."}, "notes":""},
        "lunch": {"title":"...", "cook_block_id":"mon-tue-lunch", "external":false, "portions":{"husband":"...","wife":"...","child":"..."}, "notes":""},
        "snack2": {"title":"...", "cook_block_id":"mon-snack2", "external":false, "portions":{"husband":"...","wife":"...","child":"..."}, "notes":""},
        "dinner": {"title":"...", "cook_block_id":"mon-tue-dinner", "external":false, "portions":{"husband":"...","wife":"...","child":"..."}, "notes":""}
      }
    }
  ],
  "cook_blocks": [
    {
      "id": "mon-tue-lunch",
      "title": "название блюда",
      "serves": [
        {"date":"${weekStart}","meal_type":"lunch"}
      ],
      "ingredients": [
        {"name":"куриная грудка","amount":900,"unit":"g","state":"raw"}
      ],
      "recipe": {
        "steps":["шаг 1","шаг 2"],
        "ready_output":"общий выход готовой партии",
        "child_adaptation":"что отделить ребёнку до соли/соуса/специй",
        "seasoning":"точное количество соли и специй для взрослой части"
      }
    }
  ]
}

КРИТИЧЕСКИ ВАЖНО: JSON должен полностью соответствовать фактическому человеческому меню выше. Не добавляй в JSON продукты или блюда, которых нет в меню, и не пропускай ингредиенты, нужные для готовки.`;
}

function makeIngredientIndex(catalogRows: any[], aliasRows: any[]) {
  const aliases = new Map<string, string[]>();
  for (const a of aliasRows) {
    const list = aliases.get(String(a.ingredient_id)) ?? [];
    list.push(String(a.alias_norm));
    aliases.set(String(a.ingredient_id), list);
  }
  const ingredients: Ingredient[] = catalogRows.map((x) => ({
    id: String(x.id),
    canonical_name: String(x.canonical_name),
    category: String(x.category),
    tags: Array.isArray(x.tags) ? x.tags : [],
    default_unit: x.default_unit,
    grams_per_piece: x.grams_per_piece == null ? null : Number(x.grams_per_piece),
    kcal_per_100g: x.kcal_per_100g == null ? null : Number(x.kcal_per_100g),
    aliases: aliases.get(String(x.id)) ?? [],
    active: Boolean(x.active),
  }));
  return { ingredients, index: new IngredientIndex(ingredients) };
}

function priceFor(
  prices: IngredientPrice[],
  ingredientId: string,
  preferredStore: string | null,
) {
  const rows = prices.filter((x) => x.ingredient_id === ingredientId && x.price_rub > 0 && x.package_amount > 0);
  if (!rows.length) return null;
  const preferred = preferredStore ? rows.filter((x) => x.store === preferredStore) : [];
  const candidates = preferred.length ? preferred : rows;
  return candidates.sort((a, b) => a.price_rub / a.package_amount - b.price_rub / b.package_amount)[0];
}

async function calculateShopping(args: {
  db: any;
  familyId: string;
  weekId: string;
  plan: AiMenuPlan;
  settings: any;
}) {
  const { db, familyId, weekId, plan, settings } = args;
  const [catalogR, aliasesR, inventoryR, globalPricesR, familyPricesR, oldShoppingR] = await Promise.all([
    db.from("ingredient_catalog").select("*").eq("active", true),
    db.from("ingredient_aliases").select("*"),
    db.from("inventory").select("*").eq("family_id", familyId),
    db.from("ingredient_prices").select("*"),
    db.from("family_ingredient_prices").select("*").eq("family_id", familyId),
    db.from("weekly_shopping_items").select("*").eq("family_id", familyId).eq("week_id", weekId),
  ]);
  for (const x of [catalogR, aliasesR, inventoryR, globalPricesR, familyPricesR, oldShoppingR]) {
    if (x.error) throw x.error;
  }

  const { ingredients, index } = makeIngredientIndex(catalogR.data ?? [], aliasesR.data ?? []);
  const byId = new Map(ingredients.map((x) => [x.id, x]));

  const overridden = new Set((familyPricesR.data ?? []).map((x: any) => `${x.ingredient_id}|${x.store}`));
  const prices: IngredientPrice[] = [
    ...(globalPricesR.data ?? [])
      .filter((x: any) => !overridden.has(`${x.ingredient_id}|${x.store}`))
      .map((x: any) => ({
        ingredient_id: String(x.ingredient_id),
        store: String(x.store),
        price_rub: Number(x.price_rub),
        package_amount: Number(x.package_amount),
        package_unit: x.package_unit,
        manually_verified_at: x.manually_verified_at ?? null,
      })),
    ...(familyPricesR.data ?? []).map((x: any) => ({
      ingredient_id: String(x.ingredient_id),
      store: String(x.store),
      price_rub: Number(x.price_rub),
      package_amount: Number(x.package_amount),
      package_unit: x.package_unit,
      manually_verified_at: x.manually_verified_at,
    })),
  ];

  type Requirement = {
    key: string;
    ingredient_id: string | null;
    name: string;
    amount: number;
    unit: string;
    state: string;
  };
  const reqMap = new Map<string, Requirement>();

  for (const block of plan.cook_blocks) {
    for (const line of block.ingredients) {
      const ingredientId = index.resolve(line.name);
      const ing = ingredientId ? byId.get(ingredientId) : undefined;
      if (ing) {
        const converted = toDefaultUnit(ing, Number(line.amount), line.unit);
        if (converted == null) {
          throw new AiMenuValidationError([
            `Нельзя преобразовать ${line.name}: ${line.amount} ${line.unit} в ${ing.default_unit}. Исправь единицу в меню.`,
          ]);
        }
        const key = `${ingredientId}|${ing.default_unit}|${line.state}`;
        const row = reqMap.get(key) ?? {
          key,
          ingredient_id: ingredientId,
          name: ing.canonical_name,
          amount: 0,
          unit: ing.default_unit,
          state: line.state,
        };
        row.amount += converted;
        reqMap.set(key, row);
      } else {
        const normalized = normalizeIngredientName(line.name);
        const key = `name:${normalized}|${line.unit}|${line.state}`;
        const row = reqMap.get(key) ?? {
          key,
          ingredient_id: null,
          name: line.name,
          amount: 0,
          unit: line.unit,
          state: line.state,
        };
        row.amount += Number(line.amount);
        reqMap.set(key, row);
      }
    }
  }

  const stock = (inventoryR.data ?? []).map((x: any) => ({
    id: String(x.id),
    ingredient_id: x.ingredient_id ? String(x.ingredient_id) : index.resolve(String(x.name)),
    name_norm: normalizeIngredientName(String(x.name)),
    quantity: Math.max(0, Number(x.quantity) || 0),
    unit: String(x.unit),
    state: String(x.state),
    urgent: Boolean(x.urgent),
  })).sort((a: any, b: any) => Number(b.urgent) - Number(a.urgent));

  const rows: any[] = [];
  let estimated = 0;
  let unpriced = 0;
  let unverified = 0;

  for (const req of reqMap.values()) {
    let need = req.amount;
    let fromHome = 0;
    const ing = req.ingredient_id ? byId.get(req.ingredient_id) : undefined;

    for (const item of stock) {
      if (need <= 1e-9 || item.quantity <= 1e-9) continue;
      const sameProduct = req.ingredient_id
        ? item.ingredient_id === req.ingredient_id
        : item.name_norm === normalizeIngredientName(req.name);
      if (!sameProduct || !stateCompatible(req.state, item.state)) continue;

      let available = item.quantity;
      let backFactor = 1;
      if (ing) {
        const converted = toDefaultUnit(ing, item.quantity, item.unit);
        if (converted == null) continue;
        available = converted;
        backFactor = item.quantity / converted;
      } else if (item.unit !== req.unit) {
        continue;
      }

      const use = Math.min(need, available);
      need -= use;
      fromHome += use;
      item.quantity -= use * backFactor;
    }

    const toBuy = Math.max(0, need);
    let packages: number | null = null;
    let packageQuantity: number | null = null;
    let purchaseQuantity: number | null = null;
    let price: number | null = null;
    let store: string | null = null;
    let priceKnown = toBuy <= 1e-9;
    let priceVerified = toBuy <= 1e-9;

    if (toBuy > 1e-9 && ing) {
      const p = priceFor(prices, ing.id, settings?.preferred_store ?? null);
      if (p) {
        const pack = toDefaultUnit(ing, p.package_amount, p.package_unit);
        if (pack && pack > 0) {
          packages = Math.ceil(toBuy / pack - 1e-9);
          packageQuantity = pack;
          purchaseQuantity = packages * pack;
          price = Math.round(packages * p.price_rub * 100) / 100;
          store = p.store;
          priceKnown = true;
          priceVerified = Boolean(p.manually_verified_at);
          estimated += price;
          if (!priceVerified) unverified++;
        }
      }
    }
    if (toBuy > 1e-9 && !priceKnown) unpriced++;

    rows.push({
      family_id: familyId,
      week_id: weekId,
      item_key: req.key,
      ingredient_id: req.ingredient_id,
      product_name: req.name,
      required_quantity: Math.round(req.amount * 1000) / 1000,
      home_quantity: Math.round(fromHome * 1000) / 1000,
      to_buy: Math.round(toBuy * 1000) / 1000,
      package_quantity: packageQuantity,
      packages,
      purchase_quantity: purchaseQuantity,
      unit: req.unit,
      state: req.state,
      store,
      estimated_price: price,
      price_known: priceKnown,
      price_verified: priceVerified,
    });
  }

  const old = new Map((oldShoppingR.data ?? []).map((x: any) => [String(x.item_key), x]));
  for (const row of rows) {
    const prev: any = old.get(row.item_key);
    const same =
      prev &&
      Math.abs(Number(prev.to_buy) - Number(row.to_buy)) < 0.001 &&
      Math.abs(Number(prev.purchase_quantity ?? 0) - Number(row.purchase_quantity ?? 0)) < 0.001;
    row.purchased = Boolean(same && prev.purchased);
    row.purchased_by = row.purchased ? prev.purchased_by : null;
    row.purchased_at = row.purchased ? prev.purchased_at : null;
    row.updated_at = new Date().toISOString();
  }

  const budget = Number(settings?.weekly_budget_rub ?? 8000);
  const status = estimated > budget
    ? "over"
    : unpriced > 0
    ? "unverified"
    : "within";

  return {
    rows,
    estimated_cost_rub: Math.round(estimated * 100) / 100,
    budget_rub: budget,
    budget_status: status,
    unpriced_count: unpriced,
    unverified_price_count: unverified,
  };
}

async function main(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ ok: false, error: "Method not allowed" }, 405);

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const secretRaw = Deno.env.get("SUPABASE_SECRET_KEYS") ?? "";
    if (!botToken || !supabaseUrl || !secretRaw) throw new Error("Server secrets are missing");

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};

    const auth = await verifyInitData(body?.initData, botToken);
    if (!auth.ok) {
      return reply({ ok: false, error: auth.error, message: "Telegram-авторизация не прошла" }, 401);
    }

    const db = createClient(supabaseUrl, serviceKey(secretRaw), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const memberR = await db
      .from("family_members")
      .select("*")
      .eq("telegram_user_id", auth.user.id)
      .eq("active", true)
      .maybeSingle();
    if (memberR.error) throw memberR.error;
    if (!memberR.data) return reply({ ok: false, error: "not_invited", message: "Вы не подключены к семье." }, 403);

    const member = memberR.data;
    const familyId = String(member.family_id);

    const settingsRow = async () => {
      const r = await db.from("family_settings").select("*").eq("family_id", familyId).maybeSingle();
      if (r.error) throw r.error;
      if (!r.data) throw new Error("Настройки семьи не инициализированы");
      return r.data;
    };

    if (action === "profile.get") {
      const [settings, members] = await Promise.all([
        settingsRow(),
        db.from("family_members").select("id,name,role,active").eq("family_id", familyId).eq("active", true),
      ]);
      if (members.error) throw members.error;
      return reply({
        ok: true,
        profile: profileFromSettings(settings.settings),
        members: members.data ?? [],
      });
    }

    if (action === "profile.update") {
      const settings = await settingsRow();
      const profile = {
        husband: {
          weight_kg: cleanPositive(payload?.husband?.weight_kg, 400),
          height_cm: cleanPositive(payload?.husband?.height_cm, 260),
          goal: cleanGoal(payload?.husband?.goal),
        },
        wife: {
          weight_kg: cleanPositive(payload?.wife?.weight_kg, 400),
          height_cm: cleanPositive(payload?.wife?.height_cm, 260),
          goal: cleanGoal(payload?.wife?.goal),
        },
        child: {
          age_years: cleanPositive(payload?.child?.age_years, 18),
        },
      };
      const next = { ...(settings.settings ?? {}), ai_profile: profile };
      const r = await db.from("family_settings").update({
        settings: next,
        updated_at: new Date().toISOString(),
        updated_by: auth.user.id,
      }).eq("family_id", familyId).select("*").single();
      if (r.error) throw r.error;
      return reply({ ok: true, profile });
    }

    if (action === "ai.export") {
      const weekStart = String(payload.week_start ?? "");
      if (!isDate(weekStart)) return reply({ ok: false, error: "invalid_week_start", message: "Нужен понедельник YYYY-MM-DD." }, 400);

      const [familyR, settings, membersR, rulesR, inventoryR, feedbackR] = await Promise.all([
        db.from("families").select("*").eq("id", familyId).single(),
        settingsRow(),
        db.from("family_members").select("id,name,role,active").eq("family_id", familyId).eq("active", true),
        db.from("family_rules").select("*").eq("family_id", familyId).eq("enabled", true).order("created_at"),
        db.from("inventory").select("*").eq("family_id", familyId).order("urgent", { ascending: false }).order("added_at", { ascending: false }),
        db.from("weekly_meal_feedback").select("*").eq("family_id", familyId).order("updated_at", { ascending: false }).limit(80),
      ]);
      for (const x of [familyR, membersR, rulesR, inventoryR, feedbackR]) if (x.error) throw x.error;

      const prompt = buildExportPrompt({
        weekStart,
        family: familyR.data,
        members: membersR.data ?? [],
        settings: settings.settings ?? {},
        profile: profileFromSettings(settings.settings),
        rules: rulesR.data ?? [],
        inventory: inventoryR.data ?? [],
        feedback: feedbackR.data ?? [],
      });

      return reply({
        ok: true,
        prompt_version: "ai-menu-prompt-v1",
        menu_format: AI_MENU_FORMAT,
        prompt,
      });
    }

    if (action === "ai.import") {
      const text = String(payload.text ?? "");
      let plan: AiMenuPlan;
      try {
        plan = parseAiMenuPlan(text);
      } catch (error) {
        if (error instanceof AiMenuValidationError) {
          return reply({
            ok: false,
            error: "menu_validation",
            message: error.message,
            issues: error.issues,
          }, 422);
        }
        throw error;
      }

      let weekR = await db.from("weekly_plans")
        .select("*")
        .eq("family_id", familyId)
        .eq("week_start", plan.week_start)
        .maybeSingle();
      if (weekR.error) throw weekR.error;
      if (!weekR.data) {
        weekR = await db.from("weekly_plans").insert({
          family_id: familyId,
          week_start: plan.week_start,
          status: "draft",
        }).select("*").single();
        if (weekR.error) throw weekR.error;
      }
      const week = weekR.data;
      const weekId = String(week.id);
      const settings = await settingsRow();

      const shopping = await calculateShopping({
        db,
        familyId,
        weekId,
        plan,
        settings: settings.settings ?? {},
      });

      const blockById = new Map(plan.cook_blocks.map((b) => [b.id, b]));
      const mealRows: any[] = [];

      for (const day of plan.days) {
        for (const mealType of MEAL_TYPES) {
          const meal = day.meals[mealType];
          const block = meal.cook_block_id ? blockById.get(meal.cook_block_id) : null;
          const blockServes = block?.serves ?? [];
          const batchDay = block
            ? blockServes.findIndex((x) => x.date === day.date && x.meal_type === mealType) + 1
            : null;
          const recipe = block?.recipe ?? { steps: [], ready_output: "", child_adaptation: "", seasoning: "" };
          const ingredients = block?.ingredients ?? [];

          mealRows.push({
            week_id: weekId,
            meal_date: day.date,
            meal_type: mealType,
            title: meal.title,
            batch_key: meal.cook_block_id,
            portions: meal.portions,
            ingredients: ingredients.map((x: AiMenuIngredient) => ({
              ingredient_id: null,
              name: x.name,
              amount: x.amount,
              unit: x.unit,
              state: x.state,
            })),
            recipe,
            notes: [
              meal.notes,
              block && block.serves.length > 1
                ? `Ингредиенты в карточке — на всю партию ${block.title}, готовится один раз на ${block.serves.length} приёма пищи.`
                : "",
            ].filter(Boolean).join(" "),
            sort_order: SORT[mealType],
            source: "ai_import",
            locked: true,
            recipe_key: null,
            batch_day: batchDay || null,
            eaters: Object.keys(meal.portions ?? {}),
            portion_grams: {},
            updated_at: new Date().toISOString(),
          });
        }
      }

      const mealUpsert = await db.from("weekly_meals").upsert(mealRows, {
        onConflict: "week_id,meal_date,meal_type",
      });
      if (mealUpsert.error) throw mealUpsert.error;

      const clearBlocks = await db.from("ai_menu_cook_blocks").delete().eq("family_id", familyId).eq("week_id", weekId);
      if (clearBlocks.error) throw clearBlocks.error;
      if (plan.cook_blocks.length) {
        const blockInsert = await db.from("ai_menu_cook_blocks").insert(
          plan.cook_blocks.map((b) => ({
            family_id: familyId,
            week_id: weekId,
            block_key: b.id,
            title: b.title,
            serves: b.serves,
            ingredients: b.ingredients,
            recipe: b.recipe,
          })),
        );
        if (blockInsert.error) throw blockInsert.error;
      }

      const clearShopping = await db.from("weekly_shopping_items").delete().eq("family_id", familyId).eq("week_id", weekId);
      if (clearShopping.error) throw clearShopping.error;
      if (shopping.rows.length) {
        const shoppingInsert = await db.from("weekly_shopping_items").insert(shopping.rows);
        if (shoppingInsert.error) throw shoppingInsert.error;
      }

      const importAudit = await db.from("ai_menu_imports").insert({
        family_id: familyId,
        week_id: weekId,
        schema_version: AI_MENU_FORMAT,
        payload: plan,
        imported_by: member.id,
      });
      if (importAudit.error) throw importAudit.error;

      const weekUpdate = await db.from("weekly_plans").update({
        status: "draft",
        validation_ok: true,
        estimated_cost: shopping.estimated_cost_rub,
        budget_status: shopping.budget_status,
        planner_version: null,
        ai_import_version: AI_MENU_FORMAT,
        imported_at: new Date().toISOString(),
        notes: plan.summary || "Меню импортировано из ChatGPT. Покупки рассчитаны ботом.",
        updated_at: new Date().toISOString(),
      }).eq("id", weekId).eq("family_id", familyId).select("*").single();
      if (weekUpdate.error) throw weekUpdate.error;

      return reply({
        ok: true,
        week: weekUpdate.data,
        imported_meals: mealRows.length,
        cook_blocks: plan.cook_blocks.length,
        shopping: {
          estimated_cost_rub: shopping.estimated_cost_rub,
          budget_rub: shopping.budget_rub,
          budget_status: shopping.budget_status,
          unpriced_count: shopping.unpriced_count,
          unverified_price_count: shopping.unverified_price_count,
        },
      });
    }

    return reply({ ok: false, error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    return reply({
      ok: false,
      error: error instanceof Error ? error.message : "Server error",
    }, 500);
  }
}

Deno.serve(main);
