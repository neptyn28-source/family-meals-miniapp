// Family-scoped data access. Every query issued on behalf of a user goes through `scoped()`,
// which forces family_id = the caller's membership family. The frontend never supplies family_id.

export type Row = Record<string, unknown>;
export type Filter = Record<string, unknown>;

export interface Db {
  select(table: string, filter: Filter): Promise<Row[]>;
  insert(table: string, row: Row): Promise<Row>;
  update(table: string, filter: Filter, patch: Row): Promise<Row[]>;
  remove(table: string, filter: Filter): Promise<number>;
}

/** Tables that carry a family_id column and may be accessed by family members. */
export const FAMILY_TABLES = new Set([
  "family_members",
  "family_rules",
  "family_settings",
  "family_ingredient_caps",
  "inventory",
  "weekly_plans",
  "weekly_meals",
  "shopping_items",
  "recipe_feedback",
  "generation_runs",
  "family_ingredient_prices",
]);

export class AccessError extends Error {
  code: "not_invited" | "forbidden" | "not_found";
  constructor(code: "not_invited" | "forbidden" | "not_found", message: string) {
    super(message);
    this.code = code;
  }
}

export async function resolveMembership(db: Db, telegramUserId: number) {
  const rows = await db.select("family_members", { telegram_user_id: telegramUserId });
  const member = rows[0];
  if (!member) throw new AccessError("not_invited", "Этот Telegram-аккаунт не привязан к семье");
  return { family_id: String(member.family_id), member };
}

export function scoped(db: Db, familyId: string): Db {
  const guard = (table: string) => {
    if (!FAMILY_TABLES.has(table)) throw new AccessError("forbidden", `table ${table} is not family-scoped`);
  };
  const clean = (row: Row) => {
    const { family_id: _ignored, ...rest } = row;
    return rest;
  };
  return {
    async select(table, filter) {
      guard(table);
      return await db.select(table, { ...clean(filter), family_id: familyId });
    },
    async insert(table, row) {
      guard(table);
      return await db.insert(table, { ...clean(row), family_id: familyId });
    },
    async update(table, filter, patch) {
      guard(table);
      return await db.update(table, { ...clean(filter), family_id: familyId }, clean(patch));
    },
    async remove(table, filter) {
      guard(table);
      return await db.remove(table, { ...clean(filter), family_id: familyId });
    },
  };
}

/** Simple in-memory Db used by tests (and handy for local dev). */
export class MemoryDb implements Db {
  tables = new Map<string, Row[]>();
  private seq = 0;
  private match(row: Row, filter: Filter) {
    return Object.entries(filter).every(([k, v]) => row[k] === v);
  }
  select(table: string, filter: Filter) {
    return Promise.resolve((this.tables.get(table) ?? []).filter((r) => this.match(r, filter)).map((r) => ({ ...r })));
  }
  insert(table: string, row: Row) {
    const list = this.tables.get(table) ?? [];
    const created = { id: row.id ?? `id-${++this.seq}`, ...row };
    list.push(created);
    this.tables.set(table, list);
    return Promise.resolve({ ...created });
  }
  update(table: string, filter: Filter, patch: Row) {
    const out: Row[] = [];
    for (const r of this.tables.get(table) ?? []) if (this.match(r, filter)) { Object.assign(r, patch); out.push({ ...r }); }
    return Promise.resolve(out);
  }
  remove(table: string, filter: Filter) {
    const list = this.tables.get(table) ?? [];
    const keep = list.filter((r) => !this.match(r, filter));
    this.tables.set(table, keep);
    return Promise.resolve(list.length - keep.length);
  }
}
