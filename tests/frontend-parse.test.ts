// app-v2.js is a classic browser script; until it is split into modules (stage 2) pure helpers
// are tested by extracting their source.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function loadFunction(name: string) {
  const src = readFileSync(new URL("../app-v2.js", import.meta.url), "utf8");
  const m = src.match(new RegExp(String.raw`function ${name}\([^)]*\) \{[\s\S]*?\n\}`));
  assert.ok(m, `${name} not found in app-v2.js`);
  return new Function(`${m[0]}; return ${name};`)();
}

test("parseDecimal: empty is null, comma is a decimal separator, garbage is NaN", () => {
  const parseDecimal = loadFunction("parseDecimal");
  assert.equal(parseDecimal(""), null);
  assert.equal(parseDecimal("   "), null);
  assert.equal(parseDecimal("72,5"), 72.5);
  assert.equal(parseDecimal("72.5"), 72.5);
  assert.equal(parseDecimal(" 1 500 "), 1500);
  assert.equal(parseDecimal("0"), 0);
  assert.ok(Number.isNaN(parseDecimal("1,5кг")));
  assert.ok(Number.isNaN(parseDecimal("abc")));
});

test("profile save does not run two settings writes in parallel", () => {
  const src = readFileSync(new URL("../app-v2.js", import.meta.url), "utf8");
  const body = src.slice(src.indexOf("async function saveProfile"), src.indexOf("\n}\n", src.indexOf("async function saveProfile")));
  assert.ok(!body.includes("Promise.all"), "profile.update and settings.update rewrite the same row");
  assert.ok(body.indexOf('aiApi("profile.update"') < body.indexOf('api("settings.update"'));
});
