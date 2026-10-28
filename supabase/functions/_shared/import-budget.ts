// Weekly budget gate for an imported AI menu. Pure, so it is covered by unit tests.

export interface ImportBudgetInput {
  hardLimit: boolean;
  /** family_settings.allow_unverified_budget: accept a menu with items that have no known price. */
  allowUnverified: boolean;
  estimatedRub: number;
  budgetRub: number;
  unpricedCount: number;
}

export type ImportBudgetVerdict =
  | { ok: true }
  | { ok: false; code: "budget_exceeded"; overByRub: number }
  | { ok: false; code: "budget_unverified"; unpricedCount: number };

export function checkImportBudget(x: ImportBudgetInput): ImportBudgetVerdict {
  if (!x.hardLimit) return { ok: true };
  if (x.estimatedRub > x.budgetRub) {
    return { ok: false, code: "budget_exceeded", overByRub: Math.round((x.estimatedRub - x.budgetRub) * 100) / 100 };
  }
  // Items without a price count as 0 ₽, so the sum may hide an overspend.
  if (x.unpricedCount > 0 && !x.allowUnverified) {
    return { ok: false, code: "budget_unverified", unpricedCount: x.unpricedCount };
  }
  return { ok: true };
}
