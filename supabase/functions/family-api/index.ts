import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyInitData } from "../_shared/telegram.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MEAL_TYPES = new Set(["breakfast", "snack1", "lunch", "snack2", "dinner"]);
const WEEK_STATUSES = new Set(["draft", "approved", "archived"]);
const RULE_TYPES = new Set(["hard", "preference", "feedback"]);
const STATES = new Set(["raw", "cooked", "semi_finished", "frozen", "dry", "canned"]);

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

function secretKey(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.default) return String(parsed.default);
  } catch {
    // legacy plain service-role key
  }
  return raw;
}

function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isoDiffDays(a: string, b: string) {
  return Math.round(
    (new Date(a + "T00:00:00Z").getTime() - new Date(b + "T00:00:00Z").getTime()) /
      86400000,
  );
}

function mergeSettings(current: Record<string, unknown>, patch: Record<string, unknown>) {
  const allowed = new Set([
    "weekly_budget_rub",
    "weight_mode",
    "portion_ranges",
    "custom_portions",
    "small_meal_factor",
    "wife_snacks",
    "husband_snacks",
    "child_home_snacks",
    "kindergarten_weekdays",
    "stores",
    "preferred_store",
    "equipment",
    "repetition",
    "kcal_day_ranges",
    "allow_unverified_budget",
  ]);
  const next = { ...current };
  for (const [k, v] of Object.entries(patch)) if (allowed.has(k)) next[k] = v;

  const budget = Number(next.weekly_budget_rub);
  if (!Number.isFinite(budget) || budget <= 0 || budget > 100000) {
    throw new Error("Некорректный недельный бюджет");
  }
  if (!["maintain", "mild_loss", "custom"].includes(String(next.weight_mode))) {
    throw new Error("Некорректный режим порций");
  }
  for (const k of ["wife_snacks", "husband_snacks"]) {
    const n = Number(next[k]);
    if (!Number.isInteger(n) || n < 0 || n > 2) throw new Error("Перекусов должно быть от 0 до 2");
  }
  const weekdays = next.kindergarten_weekdays;
  if (!Array.isArray(weekdays) || weekdays.some((x) => !Number.isInteger(x) || x < 1 || x > 7)) {
    throw new Error("Некорректные дни детского сада");
  }
  return next;
}

function deriveRule(description: string, ruleType: string) {
  if (ruleType !== "hard" && ruleType !== "preference") return { rule_kind: null, params: null };
  const s = description.toLowerCase().replaceAll("ё", "е");
  const severity = ruleType === "hard" ? "hard" : "preference";
  const exact: Array<[RegExp, string]> = [
    [/апельс/, "orange"],
    [/арахис/, "peanut_butter"],
    [/хумус/, "hummus"],
    [/(бур(ый|ого)|коричнев(ый|ого))\s+рис/, "rice_brown"],
    [/свинин|бекон|ветчин/, "pork"],
    [/индейк/, "turkey"],
    [/лосос|семг|сёмг|треск|минтай|хек|рыб/, "salmon"],
  ];
  const negative = /нельзя|не ест|не едим|без |аллерг|исключ|запрет|не любит|не использовать|не добавлять|никак/.test(s);
  if (!negative) return { rule_kind: null, params: null };
  for (const [re, ingredient_id] of exact) {
    if (re.test(s)) {
      return {
        rule_kind: "ban_ingredient",
        params: { kind: "ban_ingredient", ingredient_id, severity },
      };
    }
  }
  if (/творожн.*запеканк/.test(s)) {
    return {
      rule_kind: "ban_recipe_tag",
      params: { kind: "ban_recipe_tag", tag: "cottage_casserole", severity },
    };
  }
  return { rule_kind: null, params: null };
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
    const initData = body?.initData;
    const action = String(body?.action ?? "bootstrap");
    const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};

    const auth = await verifyInitData(initData, botToken);
    if (!auth.ok) return reply({ ok: false, error: auth.error, message: "Telegram-авторизация не прошла" }, 401);

    const db = createClient(supabaseUrl, secretKey(secretRaw), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existingMember, error: memberLookupError } = await db
      .from("family_members")
      .select("*")
      .eq("telegram_user_id", auth.user.id)
      .eq("active", true)
      .maybeSingle();
    if (memberLookupError) throw memberLookupError;

    let member = existingMember;

    // Join must work before membership exists.
    if (!member && action === "invite.join") {
      const code = String(payload.code ?? "").trim().toUpperCase();
      if (!code) return reply({ ok: false, error: "invite_code_required", message: "Введите код приглашения." }, 400);

      const { data: invite, error } = await db.from("family_invites").select("*").eq("code", code).maybeSingle();
      if (error) throw error;
      if (!invite) return reply({ ok: false, error: "invite_not_found", message: "Такого кода приглашения нет." }, 404);
      if (invite.used_at) return reply({ ok: false, error: "invite_used", message: "Этот код уже использован." }, 409);
      if (new Date(invite.expires_at).getTime() < Date.now()) {
        return reply({ ok: false, error: "invite_expired", message: "Срок действия кода истёк." }, 410);
      }

      const joined = await db.from("family_members").insert({
        family_id: invite.family_id,
        telegram_user_id: auth.user.id,
        name: auth.user.first_name || "Жена",
        role: invite.role || "wife",
        active: true,
      }).select("*").single();
      if (joined.error) throw joined.error;

      const marked = await db.from("family_invites")
        .update({ used_at: new Date().toISOString() })
        .eq("id", invite.id)
        .is("used_at", null);
      if (marked.error) throw marked.error;

      return reply({ ok: true, joined: true, member: joined.data, telegram_user: auth.user });
    }

    // Preserve first-user bootstrap behavior.
    if (!member) {
      const count = await db.from("family_members").select("*", { count: "exact", head: true });
      if (count.error) throw count.error;
      if ((count.count ?? 0) > 0) {
        return reply({ ok: false, error: "not_invited", message: "Вы пока не добавлены в семью." }, 403);
      }

      let family = (await db.from("families").select("*").order("created_at", { ascending: true }).limit(1).maybeSingle()).data;
      if (!family) {
        const created = await db.from("families").insert({ name: "Наша семья", budget_weekly: 8000, currency: "RUB" }).select("*").single();
        if (created.error) throw created.error;
        family = created.data;
      }
      const createdMember = await db.from("family_members").insert({
        family_id: family.id,
        telegram_user_id: auth.user.id,
        name: auth.user.first_name || "Муж",
        role: "husband",
        active: true,
      }).select("*").single();
      if (createdMember.error) throw createdMember.error;
      member = createdMember.data;
    }

    const familyId = member.family_id;

    const familyRow = async () => {
      const r = await db.from("families").select("*").eq("id", familyId).single();
      if (r.error) throw r.error;
      return r.data;
    };

    const weekForFamily = async (weekId: string) => {
      const r = await db.from("weekly_plans").select("*").eq("id", weekId).eq("family_id", familyId).maybeSingle();
      if (r.error) throw r.error;
      if (!r.data) throw new Error("Неделя не найдена");
      return r.data;
    };

    const mealForFamily = async (mealId: string) => {
      const m = await db.from("weekly_meals").select("*").eq("id", mealId).maybeSingle();
      if (m.error) throw m.error;
      if (!m.data) throw new Error("Блюдо не найдено");
      await weekForFamily(String(m.data.week_id));
      return m.data;
    };

    if (action === "bootstrap") {
      const [family, settings] = await Promise.all([
        familyRow(),
        db.from("family_settings").select("settings").eq("family_id", familyId).maybeSingle(),
      ]);
      if (settings.error) throw settings.error;
      return reply({
        ok: true,
        telegram_user: auth.user,
        member,
        family,
        settings: settings.data?.settings ?? null,
      });
    }

    if (action === "invite.create") {
      if (member.role !== "husband") {
        return reply({ ok: false, error: "forbidden", message: "Создать приглашение сейчас может только муж." }, 403);
      }
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = inviteCode();
        const r = await db.from("family_invites").insert({
          family_id: familyId,
          code,
          role: "wife",
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        }).select("*").single();
        if (!r.error) {
          return reply({ ok: true, invite: { code: r.data.code, expires_at: r.data.expires_at, role: r.data.role } });
        }
        if (r.error.code !== "23505") throw r.error;
      }
      throw new Error("Не удалось создать код приглашения");
    }

    if (action === "inventory.list") {
      const r = await db.from("inventory").select("*").eq("family_id", familyId)
        .order("urgent", { ascending: false }).order("added_at", { ascending: false });
      if (r.error) throw r.error;
      return reply({ ok: true, items: r.data ?? [] });
    }

    if (action === "inventory.add") {
      const name = String(payload.name ?? "").trim();
      const quantity = Number(payload.quantity);
      const unit = String(payload.unit ?? "g").trim();
      const state = String(payload.state ?? "raw");
      if (!name) return reply({ ok: false, error: "Product name is required" }, 400);
      if (!Number.isFinite(quantity) || quantity < 0) return reply({ ok: false, error: "Invalid quantity" }, 400);
      if (!STATES.has(state)) return reply({ ok: false, error: "Invalid product state" }, 400);

      const normalized = name.toLowerCase().replaceAll("ё", "е").replace(/[^a-zа-я0-9]+/gi, " ").replace(/\s+/g, " ").trim();
      const alias = await db.from("ingredient_aliases").select("ingredient_id").eq("alias_norm", normalized).maybeSingle();
      if (alias.error) throw alias.error;

      const r = await db.from("inventory").insert({
        family_id: familyId,
        ingredient_id: alias.data?.ingredient_id ?? null,
        name,
        quantity,
        unit,
        state,
        category: payload.category ?? null,
        urgent: Boolean(payload.urgent),
        opened: Boolean(payload.opened),
        frozen: Boolean(payload.frozen),
        use_by: payload.use_by ?? null,
        note: payload.note ?? null,
      }).select("*").single();
      if (r.error) throw r.error;
      return reply({ ok: true, item: r.data });
    }

    if (action === "inventory.delete") {
      const id = String(payload.id ?? "");
      if (!id) return reply({ ok: false, error: "Inventory id is required" }, 400);
      const r = await db.from("inventory").delete().eq("id", id).eq("family_id", familyId);
      if (r.error) throw r.error;
      return reply({ ok: true });
    }

    if (action === "rules.list") {
      const r = await db.from("family_rules").select("*").eq("family_id", familyId).order("created_at", { ascending: true });
      if (r.error) throw r.error;
      return reply({ ok: true, rules: r.data ?? [] });
    }

    if (action === "rules.add") {
      const description = String(payload.description ?? "").trim();
      const ruleType = String(payload.rule_type ?? "preference");
      if (!description) return reply({ ok: false, error: "Rule description is required" }, 400);
      if (!RULE_TYPES.has(ruleType)) return reply({ ok: false, error: "Invalid rule type" }, 400);
      const parsed = deriveRule(description, ruleType);
      const r = await db.from("family_rules").insert({
        family_id: familyId,
        rule_type: ruleType,
        code: `custom_${crypto.randomUUID()}`,
        description,
        enabled: true,
        ...parsed,
      }).select("*").single();
      if (r.error) throw r.error;
      return reply({ ok: true, rule: r.data });
    }

    if (action === "rules.update") {
      const id = String(payload.id ?? "");
      if (!id) return reply({ ok: false, error: "Rule id is required" }, 400);
      const existing = await db.from("family_rules").select("*").eq("id", id).eq("family_id", familyId).maybeSingle();
      if (existing.error) throw existing.error;
      if (!existing.data) return reply({ ok: false, error: "Rule not found" }, 404);

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (payload.description !== undefined) {
        const description = String(payload.description).trim();
        if (!description) return reply({ ok: false, error: "Rule description cannot be empty" }, 400);
        updates.description = description;
      }
      if (payload.enabled !== undefined) updates.enabled = Boolean(payload.enabled);
      if (payload.rule_type !== undefined) {
        const ruleType = String(payload.rule_type);
        if (!RULE_TYPES.has(ruleType)) return reply({ ok: false, error: "Invalid rule type" }, 400);
        updates.rule_type = ruleType;
      }
      if (!String(existing.data.code).startsWith("planner_default_") &&
          (payload.description !== undefined || payload.rule_type !== undefined)) {
        Object.assign(updates, deriveRule(
          String(updates.description ?? existing.data.description),
          String(updates.rule_type ?? existing.data.rule_type),
        ));
      }
      const r = await db.from("family_rules").update(updates).eq("id", id).eq("family_id", familyId).select("*").single();
      if (r.error) throw r.error;
      return reply({ ok: true, rule: r.data });
    }

    if (action === "rules.delete") {
      const id = String(payload.id ?? "");
      if (!id) return reply({ ok: false, error: "Rule id is required" }, 400);
      const existing = await db.from("family_rules").select("id,code").eq("id", id).eq("family_id", familyId).maybeSingle();
      if (existing.error) throw existing.error;
      if (!existing.data) return reply({ ok: true });
      if (String(existing.data.code).startsWith("planner_default_")) {
        const r = await db.from("family_rules").update({ enabled: false, updated_at: new Date().toISOString() }).eq("id", id);
        if (r.error) throw r.error;
      } else {
        const r = await db.from("family_rules").delete().eq("id", id).eq("family_id", familyId);
        if (r.error) throw r.error;
      }
      return reply({ ok: true });
    }

    if (action === "settings.get") {
      const [family, settings, caps, overrides] = await Promise.all([
        familyRow(),
        db.from("family_settings").select("*").eq("family_id", familyId).maybeSingle(),
        db.from("family_ingredient_caps").select("*").eq("family_id", familyId).order("created_at"),
        db.from("family_ingredient_prices").select("*").eq("family_id", familyId).order("ingredient_id"),
      ]);
      if (settings.error) throw settings.error;
      if (caps.error) throw caps.error;
      if (overrides.error) throw overrides.error;
      return reply({
        ok: true,
        family,
        settings: settings.data?.settings ?? null,
        caps: caps.data ?? [],
        price_overrides: overrides.data ?? [],
      });
    }

    if (action === "settings.update") {
      const current = await db.from("family_settings").select("settings").eq("family_id", familyId).maybeSingle();
      if (current.error) throw current.error;
      if (!current.data) return reply({ ok: false, error: "Planner settings are not initialized" }, 409);
      const patch = payload.settings && typeof payload.settings === "object" ? payload.settings : {};
      const next = mergeSettings(current.data.settings ?? {}, patch);
      const updated = await db.from("family_settings").upsert({
        family_id: familyId,
        settings: next,
        updated_at: new Date().toISOString(),
        updated_by: auth.user.id,
      }, { onConflict: "family_id" }).select("*").single();
      if (updated.error) throw updated.error;
      const familyUpdate = await db.from("families").update({ budget_weekly: Number(next.weekly_budget_rub) }).eq("id", familyId);
      if (familyUpdate.error) throw familyUpdate.error;

      if (Array.isArray(payload.caps)) {
        for (const cap of payload.caps) {
          const id = String(cap.id ?? "");
          const max = Number(cap.max_amount);
          if (!id || !Number.isFinite(max) || max < 0) continue;
          const u = await db.from("family_ingredient_caps").update({
            max_amount: max,
            enabled: cap.enabled !== false,
            updated_at: new Date().toISOString(),
          }).eq("id", id).eq("family_id", familyId);
          if (u.error) throw u.error;
        }
      }
      return reply({ ok: true, settings: updated.data.settings });
    }

    if (action === "prices.upsert") {
      const ingredientId = String(payload.ingredient_id ?? "");
      const store = String(payload.store ?? "").trim();
      const price = Number(payload.price_rub);
      const amount = Number(payload.package_amount);
      const unit = String(payload.package_unit ?? "");
      if (!ingredientId || !store || !Number.isFinite(price) || price <= 0 || !Number.isFinite(amount) || amount <= 0 || !["g","ml","pcs"].includes(unit)) {
        return reply({ ok: false, error: "Invalid price data" }, 400);
      }
      const r = await db.from("family_ingredient_prices").upsert({
        family_id: familyId,
        ingredient_id: ingredientId,
        store,
        price_rub: price,
        package_amount: amount,
        package_unit: unit,
        manually_verified_at: new Date().toISOString(),
      }, { onConflict: "family_id,ingredient_id,store" }).select("*").single();
      if (r.error) throw r.error;
      return reply({ ok: true, price: r.data });
    }

    if (action === "week.get") {
      const weekStart = String(payload.week_start ?? "").trim();
      if (!isIsoDate(weekStart)) return reply({ ok: false, error: "Invalid week_start" }, 400);
      let r = await db.from("weekly_plans").select("*").eq("family_id", familyId).eq("week_start", weekStart).maybeSingle();
      if (r.error) throw r.error;
      if (!r.data) {
        r = await db.from("weekly_plans").insert({
          family_id: familyId,
          week_start: weekStart,
          status: "draft",
        }).select("*").single();
        if (r.error) throw r.error;
      }
      const meals = await db.from("weekly_meals").select("*").eq("week_id", r.data.id)
        .order("meal_date", { ascending: true }).order("sort_order", { ascending: true });
      if (meals.error) throw meals.error;
      return reply({ ok: true, week: r.data, meals: meals.data ?? [] });
    }

    if (action === "week.status") {
      const weekId = String(payload.week_id ?? "");
      const status = String(payload.status ?? "");
      if (!weekId || !WEEK_STATUSES.has(status)) return reply({ ok: false, error: "Invalid week status request" }, 400);
      const week = await weekForFamily(weekId);
      if (status === "approved" && !week.validation_ok) {
        return reply({
          ok: false,
          error: "week_not_validated",
          message: "Сначала пересоберите/проверьте неделю: текущий вариант ещё не прошёл валидатор.",
        }, 409);
      }
      const r = await db.from("weekly_plans").update({ status, updated_at: new Date().toISOString() })
        .eq("id", weekId).eq("family_id", familyId).select("*").single();
      if (r.error) throw r.error;
      return reply({ ok: true, week: r.data });
    }

    if (action === "week.meal.save") {
      const weekId = String(payload.week_id ?? "");
      const mealDate = String(payload.meal_date ?? "");
      const mealType = String(payload.meal_type ?? "");
      const title = String(payload.title ?? "").trim();
      if (!weekId || !isIsoDate(mealDate) || !MEAL_TYPES.has(mealType) || !title) {
        return reply({ ok: false, error: "Invalid meal data" }, 400);
      }
      const week = await weekForFamily(weekId);
      const diff = isoDiffDays(mealDate, week.week_start);
      if (diff < 0 || diff > 6) return reply({ ok: false, error: "Meal date is outside this week" }, 400);

      const sort: Record<string, number> = { breakfast: 10, snack1: 20, lunch: 30, snack2: 40, dinner: 50 };
      const r = await db.from("weekly_meals").upsert({
        week_id: weekId,
        meal_date: mealDate,
        meal_type: mealType,
        title,
        sort_order: sort[mealType],
        source: "manual",
        locked: true,
        recipe_key: null,
        batch_key: null,
        batch_day: null,
        eaters: null,
        portion_grams: {},
        portions: {},
        ingredients: [],
        recipe: {},
        notes: "Блюдо изменено вручную.",
        updated_at: new Date().toISOString(),
      }, { onConflict: "week_id,meal_date,meal_type" }).select("*").single();
      if (r.error) throw r.error;
      const invalidated = await db.from("weekly_plans").update({
        status: "draft",
        validation_ok: false,
        budget_status: null,
        estimated_cost: null,
        updated_at: new Date().toISOString(),
      }).eq("id", weekId).eq("family_id", familyId);
      if (invalidated.error) throw invalidated.error;
      return reply({ ok: true, meal: r.data });
    }

    if (action === "week.meal.delete") {
      const id = String(payload.id ?? "");
      if (!id) return reply({ ok: false, error: "Meal id is required" }, 400);
      const meal = await mealForFamily(id);
      const r = await db.from("weekly_meals").delete().eq("id", id);
      if (r.error) throw r.error;
      await db.from("weekly_plans").update({
        status: "draft",
        validation_ok: false,
        budget_status: null,
        estimated_cost: null,
        updated_at: new Date().toISOString(),
      }).eq("id", meal.week_id).eq("family_id", familyId);
      return reply({ ok: true });
    }

    if (action === "shopping.list") {
      const weekId = String(payload.week_id ?? "");
      await weekForFamily(weekId);
      const r = await db.from("weekly_shopping_items").select("*").eq("week_id", weekId).eq("family_id", familyId)
        .order("purchased", { ascending: true }).order("product_name", { ascending: true });
      if (r.error) throw r.error;
      return reply({ ok: true, items: r.data ?? [] });
    }

    if (action === "shopping.purchase") {
      const id = String(payload.id ?? "");
      const purchased = Boolean(payload.purchased);
      const item = await db.from("weekly_shopping_items").select("id,week_id").eq("id", id).eq("family_id", familyId).maybeSingle();
      if (item.error) throw item.error;
      if (!item.data) return reply({ ok: false, error: "Shopping item not found" }, 404);
      const r = await db.from("weekly_shopping_items").update({
        purchased,
        purchased_by: purchased ? member.id : null,
        purchased_at: purchased ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("id", id).eq("family_id", familyId).select("*").single();
      if (r.error) throw r.error;
      return reply({ ok: true, item: r.data });
    }

    if (action === "feedback.list") {
      const weekId = String(payload.week_id ?? "");
      await weekForFamily(weekId);
      const [feedback, members] = await Promise.all([
        db.from("weekly_meal_feedback").select("*").eq("family_id", familyId).eq("week_id", weekId),
        db.from("family_members").select("id,name,role,active").eq("family_id", familyId).eq("active", true),
      ]);
      if (feedback.error) throw feedback.error;
      if (members.error) throw members.error;
      return reply({ ok: true, feedback: feedback.data ?? [], members: members.data ?? [] });
    }

    if (action === "feedback.save") {
      const mealId = String(payload.meal_id ?? "");
      const memberId = String(payload.member_id ?? member.id);
      const meal = await mealForFamily(mealId);
      const target = await db.from("family_members").select("id").eq("id", memberId).eq("family_id", familyId).eq("active", true).maybeSingle();
      if (target.error) throw target.error;
      if (!target.data) return reply({ ok: false, error: "Member not found" }, 404);

      const taste = payload.taste == null ? null : String(payload.taste);
      const portion = payload.portion == null ? null : String(payload.portion);
      const actionValue = payload.action == null ? null : String(payload.action);
      const satiety = payload.satiety == null || payload.satiety === "" ? null : Number(payload.satiety);
      if (taste && !["liked","neutral","disliked"].includes(taste)) return reply({ ok: false, error: "Invalid taste" }, 400);
      if (portion && !["too_much","ok","too_little"].includes(portion)) return reply({ ok: false, error: "Invalid portion" }, 400);
      if (actionValue && !["never","more_often","less_often"].includes(actionValue)) return reply({ ok: false, error: "Invalid feedback action" }, 400);
      if (satiety !== null && (!Number.isInteger(satiety) || satiety < 0 || satiety > 10)) return reply({ ok: false, error: "Invalid satiety" }, 400);

      const r = await db.from("weekly_meal_feedback").upsert({
        family_id: familyId,
        week_id: meal.week_id,
        meal_id: mealId,
        member_id: memberId,
        taste,
        portion,
        satiety,
        snack_eaten: payload.snack_eaten == null ? null : Boolean(payload.snack_eaten),
        strong_hunger: payload.strong_hunger == null ? null : Boolean(payload.strong_hunger),
        leftovers: payload.leftovers == null ? null : Boolean(payload.leftovers),
        action: actionValue,
        comment: payload.comment == null ? null : String(payload.comment).slice(0, 2000),
        updated_at: new Date().toISOString(),
      }, { onConflict: "meal_id,member_id" }).select("*").single();
      if (r.error) throw r.error;
      return reply({ ok: true, feedback: r.data });
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
