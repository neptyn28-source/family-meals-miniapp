// Pure helpers for envelope balances. No imports, so node --test can load this file.

export type OperationAmount = { envelope_id: string; amount: number | string };
export type Page<T> = { data: T[] | null; error: unknown };

/** Sum operation amounts (integer kopecks) per envelope id. */
export function sumByEnvelope(rows: OperationAmount[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.envelope_id] = (out[r.envelope_id] || 0) + Number(r.amount);
  return out;
}

/**
 * Read every row of a query page by page (PostgREST returns at most 1000 rows per request).
 * `page(from, to)` must apply `.range(from, to)` with a stable order. Throws the page error.
 */
export async function fetchAllPages<T>(page: (from: number, to: number) => Promise<Page<T>>, size = 1000): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw error;
    const rows = data || [];
    all.push(...rows);
    if (rows.length < size) return all;
  }
}
