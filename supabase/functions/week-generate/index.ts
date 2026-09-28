import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyInitData } from "../_shared/telegram.ts";
import { generatePlan, PLANNER_VERSION } from "../_shared/planner/planner.ts";
import type {
  Ingredient,
  IngredientPrice,
  InventoryItem,
  PlannedMeal,
  Recipe,
  StructuredRule,
} from "../_shared/planner/types.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const SORT: Record<string, number> = { breakfast: 10, snack1: 20, lunch: 30, snack2: 40, dinner: 50 };

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

function secretKey(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.default) return String(parsed.default);
  } catch {
    // legacy plain service role key
  }
  return raw;
}

function n(v: unknown) {
  return Number(v ?? 0);
}

function normalize(v: unknown) {
  return String(v ?? "").toLowerCase().replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/gi, " ").replace(/\s+/g, " ").trim();
}

function legacyStructuredRules(rows: any[]): StructuredRule[] {
  const out: StructuredRule[] = [];
  for (const row of rows) {
    if (row?.params?.kind) {
      out.push(row.params as StructuredRule);
      continue;
    }
    if (!row?.enabled || !["hard", "preference"].includes(row.rule_type)) continue;
    const s = normalize(row.description);
    const severity = row.rule_type === "hard" ? "hard" : "preference";
    const negative = /нельзя|не ест|не едим|без |аллерг|исключ|запрет|не любит|не использовать|не добавлять|никак/.test(s);
    if (!negative) continue;
    const bans: Array<[RegExp, string]> = [
      [/апельс/, "orange"],
      [/арахис/, "peanut_butter"],
      [/хумус/, "hummus"],
      [/(бурый|бурого|коричневый|коричневого) рис/, "rice_brown"],
      [/свинин|бекон|ветчин/, "pork"],
      [/индейк/, "turkey"],
      [/рыб|лосос|семг|треск|минтай|хек/, "salmon"],
    ];
    const hit = bans.find(([re]) => re.test(s));
    if (hit) out.push({ kind: "ban_ingredient", ingredient_id: hit[1], severity } as StructuredRule);
  }
  const seen = new Set<string>();
  return out.filter((r) => {
    const k = JSON.stringify(r);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function feedbackSummary(rows: any[]) {
  const recipe_scores: Record<string, number> = {};
  const blacklist = new Set<string>();
  for (const x of rows ?? []) {
    const key = x.recipe_key;
    if (!key) continue;
    let delta = 0;
    if (x.taste === "liked") delta += 2;
    if (x.taste === "disliked") delta -= 3;
    if (x.action === "more_often") delta += 3;
    if (x.action === "less_often") delta -= 2;
    if (x.action === "never") blacklist.add(key);
    recipe_scores[key] = (recipe_scores[key] ?? 0) + delta;
  }
  return { recipe_scores, blacklist: [...blacklist] };
}

function dbMeal(row: any): PlannedMeal {
  return {
    meal_date: String(row.meal_date),
    meal_type: row.meal_type,
    recipe_id: row.recipe_key ?? null,
    title: String(row.title),
    source: row.source === "manual" ? "manual" : "generated",
    locked: Boolean(row.locked),
    batch_key: row.batch_key ?? null,
    batch_day: row.batch_day ?? null,
    eaters: Array.isArray(row.eaters) ? row.eaters : [],
    portions: row.portions && typeof row.portions === "object" ? row.portions : {},
    portion_grams: row.portion_grams && typeof row.portion_grams === "object" ? row.portion_grams : {},
    ingredients: Array.isArray(row.ingredients) ? row.ingredients.map((x: any) => ({
      ingredient_id: x.ingredient_id ?? null,
      name: String(x.name ?? ""),
      amount: n(x.amount),
      unit: String(x.unit ?? "g"),
      state: String(x.state ?? "raw"),
    })) : [],
    recipe: row.recipe && typeof row.recipe === "object" && Object.keys(row.recipe).length
      ? row.recipe
      : null,
    notes: String(row.notes ?? ""),
  };
}

async function main(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ ok: false, error: "Method not allowed" }, 405);

  const started = Date.now();
  let familyId: string | null = null;
  let weekId: string | null = null;
  let db: any = null;

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const secretRaw = Deno.env.get("SUPABASE_SECRET_KEYS") ?? "";
    if (!botToken || !supabaseUrl || !secretRaw) throw new Error("Server secrets are missing");

    const body = await req.json().catch(() => ({}));
    weekId = String(body?.week_id ?? "");
    if (!weekId) return reply({ ok: false, error: "week_id is required" }, 400);

    const auth = await verifyInitData(body?.initData, botToken);
    if (!auth.ok) return reply({ ok: false, error: auth.error, message: "Telegram-авторизация не прошла" }, 401);

    db = createClient(supabaseUrl, secretKey(secretRaw), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const member = await db.from("family_members").select("id,family_id").eq("telegram_user_id", auth.user.id).eq("active", true).maybeSingle();
    if (member.error) throw member.error;
    if (!member.data) return reply({ ok: false, error: "not_member" }, 403);
    familyId = String(member.data.family_id);

    const week = await db.from("weekly_plans").select("*").eq("id", weekId).eq("family_id", familyId).maybeSingle();
    if (week.error) throw week.error;
    if (!week.data) return reply({ ok: false, error: "week_not_found" }, 404);

    const [
      settingsR, rulesR, capsR, inventoryR, ingredientsR, aliasesR,
      globalPricesR, familyPricesR, recipesR, recipeIngredientsR,
      existingR, feedbackR,
    ] = await Promise.all([
      db.from("family_settings").select("settings").eq("family_id", familyId).maybeSingle(),
      db.from("family_rules").select("*").eq("family_id", familyId).eq("enabled", true),
      db.from("family_ingredient_caps").select("*").eq("family_id", familyId).eq("enabled", true),
      db.from("inventory").select("*").eq("family_id", familyId),
      db.from("ingredient_catalog").select("*").eq("active", true),
      db.from("ingredient_aliases").select("*"),
      db.from("ingredient_prices").select("*"),
      db.from("family_ingredient_prices").select("*").eq("family_id", familyId),
      db.from("planner_recipes").select("*").eq("active", true),
      db.from("planner_recipe_ingredients").select("*").order("position", { ascending: true }),
      db.from("weekly_meals").select("*").eq("week_id", weekId),
      db.from("weekly_meal_feedback").select("recipe_key,taste,action").eq("family_id", familyId),
    ]);

    for (const x of [settingsR,rulesR,capsR,inventoryR,ingredientsR,aliasesR,globalPricesR,familyPricesR,recipesR,recipeIngredientsR,existingR,feedbackR]) {
      if (x.error) throw x.error;
    }
    if (!settingsR.data?.settings) throw new Error("Настройки планировщика не инициализированы");

    const aliases = new Map<string, string[]>();
    for (const a of aliasesR.data ?? []) {
      const list = aliases.get(String(a.ingredient_id)) ?? [];
      list.push(String(a.alias_norm));
      aliases.set(String(a.ingredient_id), list);
    }

    const ingredients: Ingredient[] = (ingredientsR.data ?? []).map((x: any) => ({
      id: String(x.id),
      canonical_name: String(x.canonical_name),
      category: String(x.category),
      tags: Array.isArray(x.tags) ? x.tags : [],
      default_unit: x.default_unit,
      grams_per_piece: x.grams_per_piece == null ? null : n(x.grams_per_piece),
      kcal_per_100g: x.kcal_per_100g == null ? null : n(x.kcal_per_100g),
      aliases: aliases.get(String(x.id)) ?? [],
      active: Boolean(x.active),
    }));

    const riByRecipe = new Map<string, any[]>();
    for (const ri of recipeIngredientsR.data ?? []) {
      const list = riByRecipe.get(String(ri.recipe_id)) ?? [];
      list.push(ri);
      riByRecipe.set(String(ri.recipe_id), list);
    }

    const recipes: Recipe[] = (recipesR.data ?? []).map((x: any) => ({
      id: String(x.id),
      title: String(x.title),
      meal_types: Array.isArray(x.meal_types) ? x.meal_types : [],
      tags: Array.isArray(x.tags) ? x.tags : [],
      side: x.side ?? null,
      active: Boolean(x.active),
      batchable: Boolean(x.batchable),
      batch_days: n(x.batch_days),
      equipment: Array.isArray(x.equipment) ? x.equipment : [],
      cook_minutes: n(x.cook_minutes),
      ref_portion_g: n(x.ref_portion_g),
      ingredients: (riByRecipe.get(String(x.id)) ?? []).map((ri: any) => ({
        ingredient_id: String(ri.ingredient_id),
        amount: n(ri.amount),
        state: ri.state,
        optional: Boolean(ri.optional),
      })),
      steps: Array.isArray(x.steps) ? x.steps : [],
      child_adaptation: String(x.child_adaptation ?? ""),
      seasoning: String(x.seasoning ?? ""),
      child_ok: Boolean(x.child_ok),
    }));

    const overridden = new Set((familyPricesR.data ?? []).map((x: any) => `${x.ingredient_id}|${x.store}`));
    const prices: IngredientPrice[] = [
      ...(globalPricesR.data ?? [])
        .filter((x: any) => !overridden.has(`${x.ingredient_id}|${x.store}`))
        .map((x: any) => ({
          ingredient_id: String(x.ingredient_id),
          store: String(x.store),
          price_rub: n(x.price_rub),
          package_amount: n(x.package_amount),
          package_unit: x.package_unit,
          manually_verified_at: x.manually_verified_at ?? null,
        })),
      ...(familyPricesR.data ?? []).map((x: any) => ({
        ingredient_id: String(x.ingredient_id),
        store: String(x.store),
        price_rub: n(x.price_rub),
        package_amount: n(x.package_amount),
        package_unit: x.package_unit,
        manually_verified_at: x.manually_verified_at,
      })),
    ];

    const inventory: InventoryItem[] = (inventoryR.data ?? []).map((x: any) => ({
      id: String(x.id),
      ingredient_id: x.ingredient_id ?? null,
      name: String(x.name),
      quantity: n(x.quantity),
      unit: String(x.unit),
      state: String(x.state),
      urgent: Boolean(x.urgent),
    }));

    const rules = legacyStructuredRules(rulesR.data ?? []);
    const caps = (capsR.data ?? []).map((x: any) => ({
      ingredient_id: x.ingredient_id ?? null,
      category: x.category ?? null,
      max_amount: n(x.max_amount),
      unit: x.unit,
      enabled: Boolean(x.enabled),
    }));

    const existing = (existingR.data ?? []).map(dbMeal);
    const scope = body?.scope && typeof body.scope === "object" ? body.scope : { kind: "week" };

    const result = generatePlan({
      family_id: familyId,
      week_start: String(week.data.week_start),
      settings: settingsR.data.settings,
      rules,
      caps,
      inventory,
      ingredients,
      prices,
      recipes,
      feedback: feedbackSummary(feedbackR.data ?? []),
      existing,
      scope,
      max_attempts: 32,
    });

    const warnings = (result.stats?.warnings as unknown[]) ?? [];

    if (!result.ok || !result.shopping) {
      await db.from("weekly_plans").update({
        status: "draft",
        validation_ok: false,
        estimated_cost: result.shopping?.estimated_cost_rub ?? null,
        budget_status: result.shopping?.budget_status ?? null,
        planner_version: PLANNER_VERSION,
        notes: "План не сохранён: валидатор нашёл нарушения.",
        updated_at: new Date().toISOString(),
      }).eq("id", weekId).eq("family_id", familyId);

      await db.from("generation_runs").insert({
        family_id: familyId,
        week_id: weekId,
        scope: scope.kind ?? "week",
        success: false,
        failures: result.failures,
        warnings,
        estimated_cost_rub: result.shopping?.estimated_cost_rub ?? null,
        priced_count: result.shopping?.priced_count ?? null,
        unpriced_count: result.shopping?.unpriced_count ?? null,
        budget_status: result.shopping?.budget_status ?? null,
        attempts: result.attempts,
        planner_version: PLANNER_VERSION,
        duration_ms: Date.now() - started,
      });

      return reply({
        ok: false,
        error: "plan_invalid",
        message: result.failures[0]?.message ?? "Не удалось составить неделю без нарушений.",
        failures: result.failures,
        warnings,
        attempts: result.attempts,
      }, 422);
    }

    const shoppingByIngredient = new Map(
      result.shopping.lines.map((x) => [x.ingredient_id, x]),
    );

    const mealRows = result.meals.map((m) => ({
      week_id: weekId,
      meal_date: m.meal_date,
      meal_type: m.meal_type,
      title: m.title,
      batch_key: m.batch_key,
      portions: m.portions,
      ingredients: m.ingredients.map((line) => ({
        ...line,
        from_inventory: (shoppingByIngredient.get(line.ingredient_id)?.from_inventory ?? 0) > 0,
      })),
      recipe: m.recipe ?? {},
      notes: m.notes || null,
      sort_order: SORT[m.meal_type],
      source: m.source,
      locked: m.locked,
      recipe_key: m.recipe_id,
      batch_day: m.batch_day,
      eaters: m.eaters,
      portion_grams: m.portion_grams,
      updated_at: new Date().toISOString(),
    }));

    const upsertMeals = await db.from("weekly_meals").upsert(mealRows, {
      onConflict: "week_id,meal_date,meal_type",
    }).select("id,meal_date,meal_type");
    if (upsertMeals.error) throw upsertMeals.error;

    const oldShopping = await db.from("weekly_shopping_items").select("*").eq("family_id", familyId).eq("week_id", weekId);
    if (oldShopping.error) throw oldShopping.error;
    const oldMap = new Map((oldShopping.data ?? []).map((x: any) => [String(x.item_key), x]));

    const clearShopping = await db.from("weekly_shopping_items").delete().eq("family_id", familyId).eq("week_id", weekId);
    if (clearShopping.error) throw clearShopping.error;

    const shoppingRows = result.shopping.lines.map((x) => {
      const itemKey = `${x.ingredient_id ?? normalize(x.name)}|${x.unit}|${x.state}`;
      const old = oldMap.get(itemKey);
      const sameNeed = old &&
        Math.abs(n(old.to_buy) - n(x.to_buy)) < 0.001 &&
        Math.abs(n(old.purchase_quantity) - n(x.purchase_amount)) < 0.001;
      return {
        family_id: familyId,
        week_id: weekId,
        item_key: itemKey,
        ingredient_id: x.ingredient_id,
        product_name: x.name,
        required_quantity: x.required,
        home_quantity: x.from_inventory,
        to_buy: x.to_buy,
        package_quantity: x.package_amount,
        packages: x.package_count,
        purchase_quantity: x.purchase_amount,
        unit: x.unit,
        state: x.state,
        store: x.store,
        estimated_price: x.estimated_cost_rub,
        price_known: x.price_known,
        price_verified: x.price_verified,
        purchased: Boolean(sameNeed && old.purchased),
        purchased_by: sameNeed && old.purchased ? old.purchased_by : null,
        purchased_at: sameNeed && old.purchased ? old.purchased_at : null,
        updated_at: new Date().toISOString(),
      };
    });
    if (shoppingRows.length) {
      const insShopping = await db.from("weekly_shopping_items").insert(shoppingRows);
      if (insShopping.error) throw insShopping.error;
    }

    const updateWeek = await db.from("weekly_plans").update({
      status: "draft",
      validation_ok: true,
      estimated_cost: result.shopping.estimated_cost_rub,
      budget_status: result.shopping.budget_status,
      planner_version: PLANNER_VERSION,
      notes: result.shopping.budget_status === "unverified"
        ? "Неделя прошла валидатор; бюджет пока не подтверждён из-за отсутствующих/непроверенных цен."
        : "Неделя составлена детерминированным локальным планировщиком и прошла валидатор.",
      updated_at: new Date().toISOString(),
    }).eq("id", weekId).eq("family_id", familyId);
    if (updateWeek.error) throw updateWeek.error;

    const run = await db.from("generation_runs").insert({
      family_id: familyId,
      week_id: weekId,
      scope: scope.kind ?? "week",
      success: true,
      failures: [],
      warnings,
      estimated_cost_rub: result.shopping.estimated_cost_rub,
      priced_count: result.shopping.priced_count,
      unpriced_count: result.shopping.unpriced_count,
      budget_status: result.shopping.budget_status,
      attempts: result.attempts,
      planner_version: PLANNER_VERSION,
      duration_ms: Date.now() - started,
    });
    if (run.error) throw run.error;

    return reply({
      ok: true,
      generated: result.meals.length,
      planner: "deterministic",
      planner_version: PLANNER_VERSION,
      attempts: result.attempts,
      validation_ok: true,
      shopping: {
        estimated_cost_rub: result.shopping.estimated_cost_rub,
        budget_rub: result.shopping.budget_rub,
        budget_status: result.shopping.budget_status,
        unpriced_count: result.shopping.unpriced_count,
        unverified_price_count: result.shopping.unverified_price_count,
      },
      warnings,
    });
  } catch (error) {
    console.error(error);
    if (db && familyId) {
      try {
        await db.from("generation_runs").insert({
          family_id: familyId,
          week_id: weekId || null,
          scope: "week",
          success: false,
          failures: [{ code: "server_error", message: error instanceof Error ? error.message : "Generation failed" }],
          warnings: [],
          attempts: 0,
          planner_version: PLANNER_VERSION,
          duration_ms: Date.now() - started,
        });
      } catch {
        // logging must not hide the primary error
      }
    }
    return reply({ ok: false, error: error instanceof Error ? error.message : "Generation failed" }, 500);
  }
}

Deno.serve(main);
