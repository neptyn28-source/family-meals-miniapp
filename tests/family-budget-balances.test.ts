import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchAllPages, sumByEnvelope } from "../supabase/functions/family-budget/balances.ts";

test("budget: sums amounts per envelope, numeric strings included", () => {
  const b = sumByEnvelope([
    { envelope_id: "a", amount: 1000 },
    { envelope_id: "a", amount: "-250" },
    { envelope_id: "b", amount: 5 },
  ]);
  assert.deepEqual(b, { a: 750, b: 5 });
});

test("budget: reads every page, not only the first 80/1000 rows", async () => {
  const rows = Array.from({ length: 2500 }, (_, i) => ({ envelope_id: i % 2 ? "a" : "b", amount: 1 }));
  const calls: Array<[number, number]> = [];
  const all = await fetchAllPages(async (from, to) => {
    calls.push([from, to]);
    return { data: rows.slice(from, to + 1), error: null };
  });
  assert.equal(all.length, 2500);
  assert.deepEqual(calls, [[0, 999], [1000, 1999], [2000, 2999]]);
  assert.deepEqual(sumByEnvelope(all), { a: 1250, b: 1250 });
});

test("budget: exact multiple of page size stops after an empty page", async () => {
  const rows = Array.from({ length: 1000 }, () => ({ envelope_id: "a", amount: 2 }));
  let n = 0;
  const all = await fetchAllPages(async (from, to) => { n++; return { data: rows.slice(from, to + 1), error: null }; });
  assert.equal(all.length, 1000);
  assert.equal(n, 2);
});

test("budget: page error is thrown, not silently treated as zero", async () => {
  const boom = new Error("db down");
  await assert.rejects(fetchAllPages(async () => ({ data: null, error: boom })), /db down/);
});
