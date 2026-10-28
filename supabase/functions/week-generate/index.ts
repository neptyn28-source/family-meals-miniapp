import { verifyInitData } from "../_shared/telegram.ts";
import { AUTH_FAILED_TEXT, CORS, errorResponse, fail } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail(405, "method_not_allowed", "Метод не поддерживается.");

  try {
    const body = await req.json().catch(() => ({}));
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
    const auth = await verifyInitData(body?.initData, token);
    if (!auth.ok) {
      return fail(401, "auth_" + auth.error, AUTH_FAILED_TEXT);
    }

    return fail(410, "automatic_generation_disabled", "Автоматический генератор отключён. Используй «Выгрузить в ИИ» → ChatGPT → «Вставить меню из ИИ».");
  } catch (error) {
    return errorResponse(error);
  }
});
