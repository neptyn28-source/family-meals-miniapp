import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyInitData } from "../_shared/telegram.ts";
import {
  AI_MENU_FORMAT,
  AiMenuValidationError,
  parseAiMenuPlan,
  type AiMenuIngredient,
  type AiMenuPlan,
} from "../_shared/ai-menu.ts";
import { buildExportPrompt } from "../_shared/ai-menu-prompt.ts";
import { computeAiShopping } from "../_shared/ai-shopping.ts";

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

function cleanEnum(v: unknown, allowed: string[]) { return allowed.includes(String(v ?? "")) ? String(v) : null; }
function cleanNonnegative(v: unknown, max: number) { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isInteger(n) && n >= 0 && n <= max ? n : null; }

function profileFromSettings(settings: any) {
  const p = settings?.ai_profile ?? {};
  return {
    husband: {
      weight_kg: cleanPositive(p?.husband?.weight_kg, 400),
      height_cm: cleanPositive(p?.husband?.height_cm, 260),
      age_years: cleanPositive(p?.husband?.age_years, 100),
      activity: cleanEnum(p?.husband?.activity, ["sedentary","moderate","high"]),
      steps_per_day: cleanNonnegative(p?.husband?.steps_per_day, 50000),
      training_frequency: cleanEnum(p?.husband?.training_frequency, ["0","1-2","3-4","5+"]),
      weight_loss_pace: cleanEnum(p?.husband?.weight_loss_pace, ["moderate","faster"]) ?? "moderate",
      special_circumstances: cleanEnum(p?.husband?.special_circumstances, ["pregnancy_lactation","medical"]),

      goal: cleanGoal(p?.husband?.goal),
    },
    wife: {
      weight_kg: cleanPositive(p?.wife?.weight_kg, 400),
      height_cm: cleanPositive(p?.wife?.height_cm, 260),
      age_years: cleanPositive(p?.wife?.age_years, 100),
      activity: cleanEnum(p?.wife?.activity, ["sedentary","moderate","high"]),
      steps_per_day: cleanNonnegative(p?.wife?.steps_per_day, 50000),
      training_frequency: cleanEnum(p?.wife?.training_frequency, ["0","1-2","3-4","5+"]),
      weight_loss_pace: cleanEnum(p?.wife?.weight_loss_pace, ["moderate","faster"]) ?? "moderate",
      special_circumstances: cleanEnum(p?.wife?.special_circumstances, ["pregnancy_lactation","medical"]),

      goal: cleanGoal(p?.wife?.goal),
    },
    child: {
      age_years: cleanPositive(p?.child?.age_years, 18),
    },
  };
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

  return computeAiShopping({
    familyId,
    weekId,
    plan,
    settings,
    catalogRows: catalogR.data ?? [],
    aliasRows: aliasesR.data ?? [],
    inventoryRows: inventoryR.data ?? [],
    globalPriceRows: globalPricesR.data ?? [],
    familyPriceRows: familyPricesR.data ?? [],
    oldShoppingRows: oldShoppingR.data ?? [],
  });
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
      age_years: cleanPositive(payload?.husband?.age_years, 100),
      activity: cleanEnum(payload?.husband?.activity, ["sedentary","moderate","high"]),
      steps_per_day: cleanNonnegative(payload?.husband?.steps_per_day, 50000),
      training_frequency: cleanEnum(payload?.husband?.training_frequency, ["0","1-2","3-4","5+"]),
      weight_loss_pace: cleanEnum(payload?.husband?.weight_loss_pace, ["moderate","faster"]) ?? "moderate",
      special_circumstances: cleanEnum(payload?.husband?.special_circumstances, ["pregnancy_lactation","medical"]),

          goal: cleanGoal(payload?.husband?.goal),
        },
        wife: {
          weight_kg: cleanPositive(payload?.wife?.weight_kg, 400),
          height_cm: cleanPositive(payload?.wife?.height_cm, 260),
      age_years: cleanPositive(payload?.wife?.age_years, 100),
      activity: cleanEnum(payload?.wife?.activity, ["sedentary","moderate","high"]),
      steps_per_day: cleanNonnegative(payload?.wife?.steps_per_day, 50000),
      training_frequency: cleanEnum(payload?.wife?.training_frequency, ["0","1-2","3-4","5+"]),
      weight_loss_pace: cleanEnum(payload?.wife?.weight_loss_pace, ["moderate","faster"]) ?? "moderate",
      special_circumstances: cleanEnum(payload?.wife?.special_circumstances, ["pregnancy_lactation","medical"]),

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
        prompt_version: "ai-menu-prompt-v2",
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

      if ((settings.settings?.budget_hard_limit ?? true) && shopping.estimated_cost_rub > shopping.budget_rub) {
        const overBy = Math.round((shopping.estimated_cost_rub - shopping.budget_rub) * 100) / 100;
        const costly = [...shopping.rows]
          .filter((x: any) => Number(x.estimated_price) > 0)
          .sort((a: any, b: any) => Number(b.estimated_price) - Number(a.estimated_price))
          .slice(0, 6)
          .map((x: any) => x.product_name + " ≈" + Math.round(Number(x.estimated_price)) + " ₽");
        return reply({
          ok: false,
          error: "budget_exceeded",
          message: "Меню дороже недельного бюджета на " + overBy + " ₽. Импорт не сохранён.",
          issues: [
            "Лимит: " + shopping.budget_rub + " ₽; расчёт: " + shopping.estimated_cost_rub + " ₽.",
            costly.length ? "Самые дорогие покупки: " + costly.join(", ") + "." : "Упростите меню и используйте больше домашних остатков.",
          ],
          shopping: {
            estimated_cost_rub: shopping.estimated_cost_rub,
            budget_rub: shopping.budget_rub,
            budget_status: shopping.budget_status,
          },
        }, 422);
      }

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
            portion_components: meal.portion_components,
            ingredients: ingredients.map((x: AiMenuIngredient) => ({
              ingredient_id: null,
              name: x.name,
              amount: x.amount,
              unit: x.unit,
              state: x.state,
              use: x.use,
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
