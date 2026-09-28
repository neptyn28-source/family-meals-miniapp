import { test } from "node:test";
import assert from "node:assert/strict";
import { computeInitDataHash, verifyInitData } from "../supabase/functions/_shared/telegram.ts";
import { AccessError, MemoryDb, resolveMembership, scoped } from "../supabase/functions/_shared/scope.ts";

const TOKEN = "123456:TEST-TOKEN-NOT-REAL";
const now = 1_790_000_000;

async function signed(fields: Record<string, string>, token = TOKEN) {
  const p = new URLSearchParams(fields);
  p.set("hash", await computeInitDataHash(p, token));
  return p.toString();
}

test("25. valid Telegram initData accepted, invalid signature rejected", async () => {
  const good = await signed({ auth_date: String(now - 60), user: JSON.stringify({ id: 42, first_name: "S" }), query_id: "q" });
  const ok = await verifyInitData(good, TOKEN, { now });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.user.id, 42);

  const forged = await signed({ auth_date: String(now - 60), user: JSON.stringify({ id: 42 }) }, "999:OTHER");
  assert.deepEqual(await verifyInitData(forged, TOKEN, { now }), { ok: false, error: "bad_hash" });

  const tampered = good.replace("%22id%22%3A42", "%22id%22%3A43");
  assert.notEqual(tampered, good);
  assert.equal((await verifyInitData(tampered, TOKEN, { now })).ok, false);

  assert.deepEqual(await verifyInitData("", TOKEN, { now }), { ok: false, error: "missing" });
});

test("expired initData rejected, missing user rejected", async () => {
  const old = await signed({ auth_date: String(now - 3 * 86400), user: JSON.stringify({ id: 1 }) });
  assert.deepEqual(await verifyInitData(old, TOKEN, { now }), { ok: false, error: "expired" });
  const noUser = await signed({ auth_date: String(now) });
  assert.deepEqual(await verifyInitData(noUser, TOKEN, { now }), { ok: false, error: "no_user" });
});

test("24. family isolation: family A cannot read or change family B data even with its UUIDs", async () => {
  const db = new MemoryDb();
  await db.insert("family_members", { telegram_user_id: 1, family_id: "fam-A", role: "husband" });
  await db.insert("family_members", { telegram_user_id: 2, family_id: "fam-B", role: "husband" });
  const weekB = await db.insert("weekly_plans", { id: "week-B", family_id: "fam-B", week_start: "2026-09-28" });
  await db.insert("inventory", { id: "inv-B", family_id: "fam-B", name: "говядина" });
  await db.insert("family_rules", { id: "rule-B", family_id: "fam-B", description: "x" });

  const { family_id } = await resolveMembership(db, 1);
  assert.equal(family_id, "fam-A");
  const a = scoped(db, family_id);

  assert.deepEqual(await a.select("weekly_plans", { id: weekB.id }), []);
  assert.deepEqual(await a.select("inventory", { id: "inv-B" }), []);
  // even an explicit family_id in the filter is ignored
  assert.deepEqual(await a.select("family_rules", { id: "rule-B", family_id: "fam-B" }), []);
  assert.equal(await a.remove("inventory", { id: "inv-B" }), 0);
  assert.deepEqual(await a.update("family_rules", { id: "rule-B" }, { description: "hacked", family_id: "fam-A" }), []);
  // inserts are forced into the caller's family
  const created = await a.insert("inventory", { name: "рис", family_id: "fam-B" });
  assert.equal(created.family_id, "fam-A");
  // B still intact
  assert.equal((await db.select("family_rules", { id: "rule-B" }))[0].description, "x");
  // non family tables are refused
  await assert.rejects(() => a.select("families", {}), AccessError);
  // unknown user is not invited
  await assert.rejects(() => resolveMembership(db, 999), (e: AccessError) => e.code === "not_invited");
});
