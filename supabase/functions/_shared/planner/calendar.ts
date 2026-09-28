import type { Eater, FamilySettings, MealType } from "./types.ts";

export function parseIsoDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Bad date: ${value}`);
  const d = new Date(value + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) throw new Error(`Bad date: ${value}`);
  return d;
}

export function isoAddDays(value: string, days: number): string {
  const d = parseIsoDate(value);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** ISO weekday 1 (Mon) .. 7 (Sun) */
export function isoWeekday(value: string): number {
  const wd = parseIsoDate(value).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export function assertMonday(weekStart: string) {
  if (isoWeekday(weekStart) !== 1) throw new Error(`week_start must be a Monday: ${weekStart}`);
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => isoAddDays(weekStart, i));
}

/**
 * Lunch/dinner batch groups: Mon+Tue, Wed+Thu, Fri+Sat, Sun alone (day indexes 0..6).
 */
export const BATCH_GROUPS: number[][] = [[0, 1], [2, 3], [4, 5], [6]];

export function batchGroupOf(dayIndex: number): number[] {
  return BATCH_GROUPS.find((g) => g.includes(dayIndex))!;
}

export function batchKey(weekStart: string, group: number[], mealType: MealType): string {
  return `${isoAddDays(weekStart, group[0])}:${mealType}:${group.length}d`;
}

export function childAtKindergarten(date: string, settings: FamilySettings): boolean {
  return settings.kindergarten_weekdays.includes(isoWeekday(date));
}

/** Who eats this slot at home on this date. */
export function eatersFor(date: string, mealType: MealType, s: FamilySettings): Eater[] {
  const kg = childAtKindergarten(date, s);
  switch (mealType) {
    case "breakfast":
    case "dinner":
      return ["husband", "wife", "child"];
    case "lunch":
      return kg ? ["husband", "wife"] : ["husband", "wife", "child"];
    case "snack1": {
      const e: Eater[] = [];
      if (s.husband_snacks >= 1) e.push("husband");
      if (s.wife_snacks >= 1) e.push("wife");
      return e;
    }
    case "snack2": {
      const e: Eater[] = [];
      if (s.husband_snacks >= 2) e.push("husband");
      if (s.wife_snacks >= 2) e.push("wife");
      if (s.child_home_snacks && !kg) e.push("child");
      return e;
    }
  }
}

/** Target cooked grams for a main-dish portion, derived from configurable ranges. */
export function mainPortionGrams(eater: Eater, s: FamilySettings): number {
  const range = s.portion_ranges[eater];
  if (s.weight_mode === "custom" && s.custom_portions?.[eater]) {
    return clamp(s.custom_portions[eater]!, range.min, range.max);
  }
  // mild_loss: lower quarter of the range (moderate, not "hungry"); maintain: middle
  const t = s.weight_mode === "mild_loss" ? 0.25 : 0.5;
  return Math.round((range.min + (range.max - range.min) * t) / 10) * 10;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "завтрак",
  snack1: "перекус 1",
  lunch: "обед",
  snack2: "перекус 2",
  dinner: "ужин",
};
