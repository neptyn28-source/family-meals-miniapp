import { test } from "node:test";
import assert from "node:assert/strict";
import { errorBody, errorResponse, fail, HttpError, SERVER_ERROR_TEXT } from "../supabase/functions/_shared/http.ts";

test("error body has one shape: ok=false, human text in error, machine code in code", () => {
  assert.deepEqual(errorBody("invalid_quantity", "Количество должно быть числом"), {
    ok: false,
    error: "Количество должно быть числом",
    code: "invalid_quantity",
  });
  // extra fields cannot override the contract
  assert.deepEqual(errorBody("x", "текст", { ok: true, code: "y", issues: ["a"] }), {
    ok: false,
    error: "текст",
    code: "x",
    issues: ["a"],
  });
});

test("fail() sets status and CORS", async () => {
  const r = fail(422, "menu_validation", "Ошибка меню", { issues: ["нет дня"] });
  assert.equal(r.status, 422);
  assert.equal(r.headers.get("access-control-allow-origin"), "*");
  assert.deepEqual(await r.json(), { ok: false, error: "Ошибка меню", code: "menu_validation", issues: ["нет дня"] });
});

test("HttpError keeps its text, unknown errors hide internals behind server_error", async () => {
  const known = errorResponse(new HttpError(404, "week_not_found", "Неделя не найдена."));
  assert.equal(known.status, 404);
  assert.deepEqual(await known.json(), { ok: false, error: "Неделя не найдена.", code: "week_not_found" });

  const origError = console.error;
  console.error = () => {};
  try {
    const leaked = errorResponse(new Error('duplicate key value violates unique constraint "weekly_plans_pkey"'));
    assert.equal(leaked.status, 500);
    const body = await leaked.json();
    assert.deepEqual(body, { ok: false, error: SERVER_ERROR_TEXT, code: "server_error" });
    assert.ok(!JSON.stringify(body).includes("constraint"));
    const pg = errorResponse({ message: "Server secrets are missing", code: "42P01" });
    assert.equal((await pg.json()).code, "server_error");
  } finally {
    console.error = origError;
  }
});
