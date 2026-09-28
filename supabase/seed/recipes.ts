import type { Recipe } from "../functions/_shared/planner/types.ts";
import { RECIPES_1 } from "./recipes_part1.ts";
import { RECIPES_2 } from "./recipes_part2.ts";
import { RECIPES_3 } from "./recipes_part3.ts";
import { RECIPES_4 } from "./recipes_part4.ts";
import { RECIPES_5 } from "./recipes_part5.ts";

export const RECIPES: Recipe[] = [
  ...RECIPES_1,
  ...RECIPES_2,
  ...RECIPES_3,
  ...RECIPES_4,
  ...RECIPES_5,
];
