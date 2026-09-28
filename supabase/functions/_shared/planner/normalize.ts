import type { Ingredient, InventoryItem } from "./types.ts";

/** Lowercase, ё→е, collapse punctuation/whitespace. No stemming, no substring matching. */
export function normalizeName(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export class IngredientIndex {
  private byId = new Map<string, Ingredient>();
  private byAlias = new Map<string, string>();

  constructor(ingredients: Ingredient[]) {
    for (const ing of ingredients) {
      this.byId.set(ing.id, ing);
      for (const name of [ing.canonical_name, ...ing.aliases]) {
        const key = normalizeName(name);
        if (!key) continue;
        const prev = this.byAlias.get(key);
        if (prev && prev !== ing.id) {
          throw new Error(`Alias "${name}" is ambiguous: ${prev} vs ${ing.id}`);
        }
        this.byAlias.set(key, ing.id);
      }
    }
  }

  get(id: string): Ingredient | undefined {
    return this.byId.get(id);
  }

  must(id: string): Ingredient {
    const ing = this.byId.get(id);
    if (!ing) throw new Error(`Unknown ingredient id: ${id}`);
    return ing;
  }

  /** Exact alias lookup only. Returns null for unknown names (never guesses). */
  resolve(name: string): string | null {
    return this.byAlias.get(normalizeName(name)) ?? null;
  }

  all(): Ingredient[] {
    return [...this.byId.values()];
  }
}

/** Convert amount of an ingredient into its default unit. Returns null if not convertible. */
export function toDefaultUnit(ing: Ingredient, amount: number, unit: string): number | null {
  if (!Number.isFinite(amount)) return null;
  if (unit === ing.default_unit) return amount;
  // treat ml ~ g only for liquids flagged with the "liquid" tag
  if ((unit === "ml" && ing.default_unit === "g") || (unit === "g" && ing.default_unit === "ml")) {
    return ing.tags.includes("liquid") ? amount : null;
  }
  if (unit === "pcs" && ing.default_unit === "g" && ing.grams_per_piece) return amount * ing.grams_per_piece;
  if (unit === "g" && ing.default_unit === "pcs" && ing.grams_per_piece) return amount / ing.grams_per_piece;
  return null;
}

/**
 * Can an inventory item in `have` state cover a recipe requirement in `need` state?
 * Cooked food is never a substitute for raw ingredients and vice versa.
 */
export function stateCompatible(need: string, have: string): boolean {
  if (need === have) return true;
  if (need === "raw" && have === "frozen") return true; // frozen raw meat/veg → raw after thawing
  if (need === "dry" && have === "raw") return true; // e.g. rice stored "raw"
  if (need === "raw" && have === "dry") return true;
  return false;
}

export function resolveInventory(index: IngredientIndex, items: InventoryItem[]) {
  return items.map((item) => ({
    ...item,
    ingredient_id: item.ingredient_id ?? index.resolve(item.name),
  }));
}
