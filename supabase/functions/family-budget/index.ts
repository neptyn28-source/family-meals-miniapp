import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { errorBody, HttpError, SERVER_ERROR_TEXT } from "../_shared/http.ts";
const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  keys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
const C = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type,x-device-token",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Cache-Control": "no-store",
};
const J = (x: any, s = 200) =>
  new Response(JSON.stringify(x), {
    status: s,
    headers: { ...C, "content-type": "application/json; charset=utf-8" },
  });
// Errors in the shared format {ok:false, error, code}; database details stay in the logs.
const F = (s: number, code: string, error: string) => J(errorBody(code, error), s);
const must = (r: { error: unknown }) => {
  if (r.error) throw r.error;
};
const H = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
async function member(r: Request) {
  let t = r.headers.get("x-device-token") || "";
  if (t.length < 20) return null;
  let { data } = await db
    .from("fb_members")
    .select("*")
    .eq("device_token_hash", await H(t))
    .maybeSingle();
  return data;
}
const code = () => {
  let a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
    b = new Uint8Array(7);
  crypto.getRandomValues(b);
  return [...b].map((x) => a[x % a.length]).join("");
};
async function seed(h: string, m: string, role: string) {
  let rows = [
    ["Ипотека", "Обязательные", "payment", 4200000],
    ["Детский сад", "Обязательные", "payment", 3000000],
    ["ЖКХ и связь", "Обязательные", "payment", 800000],
    ["Продукты и быт", "Жизнь", "limit", 3200000],
    ["Ребёнок", "Жизнь", "limit", 800000],
    ["Собака", "Жизнь", "limit", 600000],
    ["Аквариумы", "Жизнь", "limit", 150000],
    ["Транспорт и зарядка", "Жизнь", "limit", 200000],
    ["Непредвиденное", "Жизнь", "limit", 975000],
    ["Личное: муж", "Личные", "personal", 500000],
    ["Личное: жена", "Личные", "personal", 400000],
    ["Подушка безопасности", "Накопления", "goal", 0],
    ["Годовые платежи", "Накопления", "goal", 0],
    ["Отпуск", "Накопления", "goal", 0],
    ["Выход из декрета", "Накопления", "goal", 0],
    ["Нераспределённые", "Системный", "system", 0],
  ].map((x: any[], i) => ({
    household_id: h,
    name: x[0],
    group_name: x[1],
    type: x[2],
    plan_amount: x[3],
    goal_amount: x[0] === "Подушка безопасности" ? 45000000 : null,
    owner_member_id:
      x[0] === "Личное: муж" && role === "husband"
        ? m
        : x[0] === "Личное: жена" && role === "wife"
          ? m
          : null,
    sort: i,
  }));
  let { data: e, error } = await db.from("fb_envelopes").insert(rows).select();
  if (error) throw error;
  let n: any = {};
  e!.forEach((z: any) => (n[z.name] = z.id));
  let R: any[] = [];
  let f = (k: string, N: string, v: number, p: number) =>
    R.push({ household_id: h, income_kind: k, envelope_id: n[N], mode: "fixed", value: v, priority: p });
  f("advance", "Ипотека", 4200000, 1);
  f("advance", "Продукты и быт", 1750000, 2);
  f("advance", "Ребёнок", 400000, 3);
  f("advance", "Собака", 300000, 4);
  f("advance", "Аквариумы", 75000, 5);
  f("advance", "Транспорт и зарядка", 100000, 6);
  f("advance", "Личное: муж", 250000, 7);
  f("advance", "Личное: жена", 200000, 8);
  R.push({
    household_id: h,
    income_kind: "advance",
    envelope_id: n["Непредвиденное"],
    mode: "remainder",
    priority: 99,
  });
  f("salary", "Детский сад", 3000000, 1);
  f("salary", "ЖКХ и связь", 800000, 3);
  f("salary", "Продукты и быт", 1750000, 4);
  f("salary", "Ребёнок", 400000, 5);
  f("salary", "Собака", 300000, 6);
  f("salary", "Аквариумы", 75000, 7);
  f("salary", "Транспорт и зарядка", 100000, 8);
  f("salary", "Личное: муж", 250000, 9);
  f("salary", "Личное: жена", 200000, 10);
  R.push({
    household_id: h,
    income_kind: "salary",
    envelope_id: n["Непредвиденное"],
    mode: "remainder",
    priority: 99,
  });
  [
    ["Подушка безопасности", 50],
    ["Годовые платежи", 25],
    ["Отпуск", 15],
    ["Выход из декрета", 10],
  ].forEach((x: any[], i) =>
    R.push({
      household_id: h,
      income_kind: "bonus",
      envelope_id: n[x[0]],
      mode: "percent",
      value: x[1],
      priority: i,
    }),
  );
  await db.from("fb_template_rules").insert(R);
}
// Balances over all live operations (the history list below shows only the latest 80).
async function balances(household: string): Promise<Record<string, number>> {
  let { data, error } = await db.rpc("fb_envelope_balances", { p_household_id: household });
  if (error) throw error;
  let b: Record<string, number> = {};
  (data || []).forEach((x: any) => (b[x.envelope_id] = Number(x.balance)));
  return b;
}
async function state(m: any) {
  let [{ data: h }, { data: E }, { data: O }] = await Promise.all([
    db.from("fb_households").select("name,invite_code").eq("id", m.household_id).single(),
    db
      .from("fb_envelopes")
      .select("*")
      .eq("household_id", m.household_id)
      .neq("status", "archived")
      .order("sort"),
    db
      .from("fb_operations")
      .select("id,envelope_id,amount,kind,op_date,comment,created_at")
      .eq("household_id", m.household_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);
  let b = await balances(m.household_id);
  let e = (E || []).map((x: any) => ({ ...x, balance: b[x.id] || 0, private_other: false }));
  return {
    ok: true,
    household: h,
    member: { name: m.display_name, role: m.role },
    envelopes: e,
    total: e.reduce((s: number, x: any) => s + x.balance, 0),
    operations: O || [],
  };
}
const validAmount = (v: any) =>
  typeof v === "number" && Number.isSafeInteger(v) && v > 0 && v <= 100000000000;
async function api(r: Request) {
  let q: any = {};
  try {
    q = await r.json();
  } catch {}
  let a = q.action;
  if (a === "boot") {
    let m = await member(r);
    return m ? J(await state(m)) : J({ ok: true, setup: true });
  }
  if (a === "create") {
    let t = r.headers.get("x-device-token") || "";
    if (t.length < 20)
      return F(400, "bad_device_token", "Не удалось создать ключ устройства. Обновите страницу.");
    let hh = await H(t),
      c = code(),
      { data: h, error: hError } = await db
        .from("fb_households")
        .insert({ name: q.family || "Наша семья", invite_code: c })
        .select()
        .single(),
      role = q.role === "wife" ? "wife" : "husband";
    if (hError || !h) throw hError || new Error("household insert returned no row");
    let { data: m, error } = await db
      .from("fb_members")
      .insert({ household_id: h.id, display_name: q.name || "Я", role, device_token_hash: hh })
      .select()
      .single();
    if (error) throw error;
    await seed(h.id, m.id, role);
    return J(await state(m));
  }
  if (a === "join") {
    let { data: h } = await db
      .from("fb_households")
      .select("*")
      .eq("invite_code", String(q.code || "").toUpperCase())
      .maybeSingle();
    if (!h) return F(404, "code_not_found", "Код не найден");
    let { data: ms } = await db.from("fb_members").select("role").eq("household_id", h.id);
    if ((ms || []).length >= 2) return F(400, "household_full", "В семье уже два участника");
    let role = (ms || []).some((x: any) => x.role === "husband") ? "wife" : "husband",
      { data: m, error } = await db
        .from("fb_members")
        .insert({
          household_id: h.id,
          display_name: q.name || "Партнёр",
          role,
          device_token_hash: await H(r.headers.get("x-device-token") || ""),
        })
        .select()
        .single();
    if (error) throw error;
    await db
      .from("fb_envelopes")
      .update({ owner_member_id: m.id })
      .eq("household_id", h.id)
      .eq("name", role === "husband" ? "Личное: муж" : "Личное: жена");
    return J(await state(m));
  }
  let m = await member(r);
  if (!m) return F(401, "no_session", "Нет сессии");
  if (a === "join_existing") {
    let codeValue = String(q.code || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z2-9]{7}$/.test(codeValue)) return F(400, "bad_code", "Введите код семьи из 7 символов");
    let { data: target } = await db
      .from("fb_households")
      .select("id")
      .eq("invite_code", codeValue)
      .maybeSingle();
    if (!target) return F(404, "code_not_found", "Код семьи не найден");
    if (target.id === m.household_id) return J(await state(m));
    let { count: membersCount } = await db
      .from("fb_members")
      .select("id", { count: "exact", head: true })
      .eq("household_id", target.id);
    if ((membersCount || 0) >= 2) return F(400, "household_full", "В целевой семье уже два участника");
    let { count: operationsCount } = await db
      .from("fb_operations")
      .select("id", { count: "exact", head: true })
      .eq("household_id", m.household_id);
    let { count: sourceMembers } = await db
      .from("fb_members")
      .select("id", { count: "exact", head: true })
      .eq("household_id", m.household_id);
    if ((operationsCount || 0) > 0 || sourceMembers !== 1)
      return F(
        409,
        "household_has_data",
        "В текущей семье есть данные или другие участники. Автоматический переход заблокирован, чтобы не потерять историю. Обратитесь для безопасного переноса.",
      );
    let { data: existing } = await db.from("fb_members").select("role").eq("household_id", target.id);
    let role = (existing || []).some((x: any) => x.role === "husband") ? "wife" : "husband";
    let { error } = await db
      .from("fb_members")
      .update({ household_id: target.id, role })
      .eq("id", m.id)
      .eq("household_id", m.household_id);
    if (error) throw error;
    await db
      .from("fb_envelopes")
      .update({ owner_member_id: m.id })
      .eq("household_id", target.id)
      .eq("type", "personal")
      .is("owner_member_id", null)
      .eq("name", role === "husband" ? "Личное: муж" : "Личное: жена");
    return J(await state({ ...m, household_id: target.id, role }));
  }
  if (a === "envelope_save") {
    let name = String(q.name || "").trim(),
      group = String(q.group || "").trim(),
      type = String(q.type || "limit");
    if (
      !name ||
      name.length > 80 ||
      !group ||
      group.length > 80 ||
      !["payment", "limit", "personal", "goal"].includes(type)
    )
      return F(400, "bad_envelope", "Проверьте название, группу и тип");
    let plan = q.plan,
      goal = q.goal;
    if (
      !Number.isSafeInteger(plan) ||
      plan < 0 ||
      plan > 100000000000 ||
      !Number.isSafeInteger(goal) ||
      goal < 0 ||
      goal > 100000000000
    )
      return F(400, "bad_plan", "Некорректный план или цель");
    let payload: any = { name, group_name: group, type, plan_amount: plan, goal_amount: goal };
    let result;
    if (q.id) {
      result = await db
        .from("fb_envelopes")
        .update({ name, group_name: group, plan_amount: plan, goal_amount: goal })
        .eq("id", q.id)
        .eq("household_id", m.household_id)
        .neq("type", "system")
        .eq("status", "active")
        .select("id")
        .maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) return F(404, "envelope_not_found", "Конверт не найден");
    } else {
      let { data: last } = await db
        .from("fb_envelopes")
        .select("sort")
        .eq("household_id", m.household_id)
        .order("sort", { ascending: false })
        .limit(1);
      payload.household_id = m.household_id;
      payload.status = "active";
      payload.sort = (last?.[0]?.sort || 0) + 1;
      result = await db.from("fb_envelopes").insert(payload);
      if (result.error) {
        if ((result.error as any).code === "23505")
          return F(409, "envelope_exists", "Конверт с таким названием уже есть");
        throw result.error;
      }
    }
    return J(await state(m));
  }
  if (a === "envelope_adjust") {
    if (!q.id || !Number.isSafeInteger(q.balance) || Math.abs(q.balance) > 100000000000)
      return F(400, "bad_balance", "Некорректный остаток");
    let { data: e } = await db
      .from("fb_envelopes")
      .select("id,type")
      .eq("id", q.id)
      .eq("household_id", m.household_id)
      .eq("status", "active")
      .maybeSingle();
    if (!e || e.type === "system") return F(404, "envelope_not_found", "Конверт не найден");
    let current = (await balances(m.household_id))[q.id] || 0,
      delta = q.balance - current;
    if (delta) {
      let { error } = await db.from("fb_operations").insert({
        household_id: m.household_id,
        envelope_id: q.id,
        amount: delta,
        kind: "adjustment",
        member_id: m.id,
        comment: String(q.comment || "Сверка фактического остатка").slice(0, 300),
      });
      if (error) throw error;
    }
    return J(await state(m));
  }
  if (a === "envelope_archive") {
    let { data: e } = await db
      .from("fb_envelopes")
      .select("id,type")
      .eq("id", q.id)
      .eq("household_id", m.household_id)
      .eq("status", "active")
      .maybeSingle();
    if (!e || e.type === "system") return F(404, "envelope_not_found", "Конверт не найден");
    if (((await balances(m.household_id))[q.id] || 0) !== 0)
      return F(400, "envelope_not_empty", "Сначала переведите остаток в другой конверт");
    let { error } = await db
      .from("fb_envelopes")
      .update({ status: "archived" })
      .eq("id", q.id)
      .eq("household_id", m.household_id);
    if (error) throw error;
    return J(await state(m));
  }
  if (a === "expense") {
    if (!validAmount(q.v)) return F(400, "bad_amount", "Некорректная сумма");
    let { data: e } = await db
      .from("fb_envelopes")
      .select("*")
      .eq("id", q.e)
      .eq("household_id", m.household_id)
      .eq("status", "active")
      .maybeSingle();
    if (!e || e.type === "system") return F(400, "envelope_unavailable", "Конверт недоступен");
    must(
      await db.from("fb_operations").insert({
        household_id: m.household_id,
        envelope_id: e.id,
        amount: -Number(q.v),
        kind: "expense",
        member_id: m.id,
        comment: q.c ? String(q.c).slice(0, 300) : null,
      }),
    );
    return J(await state(m));
  }
  if (a === "personal") {
    if (!validAmount(q.v)) return F(400, "bad_amount", "Некорректная сумма");
    let { data: e } = await db
      .from("fb_envelopes")
      .select("id")
      .eq("household_id", m.household_id)
      .eq("type", "personal")
      .eq("owner_member_id", m.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (!e) return F(400, "no_personal_envelope", "Личный конверт не найден");
    must(
      await db.from("fb_operations").insert({
        household_id: m.household_id,
        envelope_id: e.id,
        amount: Number(q.v),
        kind: "personal_income",
        member_id: m.id,
        comment: q.c ? String(q.c).slice(0, 300) : "Мой доход",
      }),
    );
    return J(await state(m));
  }
  if (a === "transfer") {
    let v = Number(q.v);
    if (!validAmount(q.v) || q.from === q.to) return F(400, "bad_transfer", "Некорректный перевод");
    let { data: es } = await db
      .from("fb_envelopes")
      .select("id,type,owner_member_id")
      .eq("household_id", m.household_id)
      .eq("status", "active")
      .in("id", [q.from, q.to]);
    if (!es || es.length !== 2) return F(404, "envelope_not_found", "Конверт не найден");
    let g = crypto.randomUUID();
    must(
      await db.from("fb_operations").insert([
        {
          household_id: m.household_id,
          envelope_id: q.from,
          amount: -v,
          kind: "transfer_out",
          member_id: m.id,
          transfer_group_id: g,
        },
        {
          household_id: m.household_id,
          envelope_id: q.to,
          amount: v,
          kind: "transfer_in",
          member_id: m.id,
          transfer_group_id: g,
        },
      ]),
    );
    return J(await state(m));
  }
  if (a === "income") {
    if (!validAmount(q.v) || !["advance", "salary", "bonus"].includes(q.kind))
      return F(400, "bad_income", "Некорректный доход");
    let { data: u } = await db
      .from("fb_envelopes")
      .select("id")
      .eq("household_id", m.household_id)
      .eq("name", "Нераспределённые")
      .eq("type", "system")
      .maybeSingle();
    if (!u) return F(500, "no_system_envelope", "Системный конверт не найден");
    let { data: ie, error: ieError } = await db
      .from("fb_income_events")
      .insert({ household_id: m.household_id, kind: q.kind, amount: q.v, member_id: m.id })
      .select()
      .single();
    if (ieError) throw ieError;
    let { error } = await db.from("fb_operations").insert({
      household_id: m.household_id,
      envelope_id: u.id,
      amount: q.v,
      kind: "income_unallocated",
      member_id: m.id,
      income_event_id: ie.id,
      comment: "Доход получен; распределите вручную",
    });
    if (error) {
      // no dangling income event without its operation
      await db.from("fb_income_events").delete().eq("id", ie.id).eq("household_id", m.household_id);
      throw error;
    }
    return J(await state(m));
  }
  if (a === "fund") {
    if (!validAmount(q.v)) return F(400, "bad_amount", "Некорректная сумма");
    let { data: es } = await db
      .from("fb_envelopes")
      .select("id,type")
      .eq("household_id", m.household_id)
      .in("id", [q.from, q.to])
      .eq("status", "active");
    if (
      !es ||
      es.length !== 2 ||
      !es.some((e: any) => e.id === q.from && e.type === "system") ||
      !es.some((e: any) => e.id === q.to && e.type !== "system")
    )
      return F(400, "bad_fund", "Выберите источник и конверт");
    if (((await balances(m.household_id))[q.from] || 0) < q.v)
      return F(400, "not_enough_unallocated", "В «Нераспределённых» не хватает денег");
    let g = crypto.randomUUID(),
      { error } = await db.from("fb_operations").insert([
        {
          household_id: m.household_id,
          envelope_id: q.from,
          amount: -q.v,
          kind: "transfer_out",
          member_id: m.id,
          transfer_group_id: g,
        },
        {
          household_id: m.household_id,
          envelope_id: q.to,
          amount: q.v,
          kind: "transfer_in",
          member_id: m.id,
          transfer_group_id: g,
        },
      ]);
    if (error) throw error;
    return J(await state(m));
  }
  return F(400, "unknown_action", "Неизвестное действие");
}
async function handle(r: Request) {
  try {
    return await api(r);
  } catch (err) {
    if (err instanceof HttpError) return F(err.status, err.code, err.message);
    console.error(err);
    return F(500, "server_error", SERVER_ERROR_TEXT);
  }
}
Deno.serve((r: Request) =>
  r.method === "OPTIONS"
    ? new Response(null, { status: 204, headers: C })
    : r.method === "GET"
      ? J({ ok: true, service: "family-budget-api" })
      : handle(r),
);
