import { verifyInitData } from "../_shared/telegram.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ ok: false, error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
    const auth = await verifyInitData(body?.initData, token);
    if (!auth.ok) {
      return reply({ ok: false, error: auth.error, message: "Telegram-авторизация не прошла" }, 401);
    }

    return reply({
      ok: false,
      error: "automatic_generation_disabled",
      message: "Автоматический генератор отключён. Используй «Выгрузить в ИИ» → ChatGPT → «Вставить меню из ИИ».",
    }, 410);
  } catch (error) {
    console.error(error);
    return reply({ ok: false, error: "Server error" }, 500);
  }
});
