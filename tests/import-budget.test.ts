import { test } from "node:test";
import assert from "node:assert/strict";
import { checkImportBudget } from "../supabase/functions/_shared/import-budget.ts";

const base = { hardLimit: true, allowUnverified: true, estimatedRub: 7000, budgetRub: 8000, unpricedCount: 0 };

test("menu within budget passes", () => {
  assert.deepEqual(checkImportBudget(base), { ok: true });
});

test("menu over budget is rejected with the overspend", () => {
  assert.deepEqual(checkImportBudget({ ...base, estimatedRub: 8123.456 }), {
    ok: false,
    code: "budget_exceeded",
    overByRub: 123.46,
  });
});

test("items without price: blocked only when the family did not allow unverified prices", () => {
  assert.deepEqual(checkImportBudget({ ...base, unpricedCount: 3, allowUnverified: false }), {
    ok: false,
    code: "budget_unverified",
    unpricedCount: 3,
  });
  assert.deepEqual(checkImportBudget({ ...base, unpricedCount: 3, allowUnverified: true }), { ok: true });
});

test("soft limit never blocks", () => {
  assert.deepEqual(
    checkImportBudget({ ...base, hardLimit: false, estimatedRub: 99999, unpricedCount: 5, allowUnverified: false }),
    { ok: true },
  );
});
