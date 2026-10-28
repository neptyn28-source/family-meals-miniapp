// Shared JSON responses for Edge Functions. Every error has one shape:
//   { ok: false, error: "<текст для человека>", code: "<машинный_код>", ...extra }
// Clients show `error` and branch on `code`.

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export type ErrorExtra = Record<string, unknown>;

/** Throw from handlers for an expected, user-facing failure. */
export class HttpError extends Error {
  status: number;
  code: string;
  extra: ErrorExtra;
  constructor(status: number, code: string, message: string, extra: ErrorExtra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export const SERVER_ERROR_TEXT = "Что-то пошло не так на сервере. Попробуйте ещё раз.";

export function errorBody(code: string, error: string, extra: ErrorExtra = {}) {
  return { ...extra, ok: false as const, error, code };
}

export function reply(body: unknown, status = 200, headers: Record<string, string> = CORS) {
  return Response.json(body, { status, headers });
}

export function fail(status: number, code: string, error: string, extra: ErrorExtra = {}, headers = CORS) {
  return reply(errorBody(code, error, extra), status, headers);
}

export const AUTH_FAILED_TEXT = "Telegram-авторизация не прошла. Закройте и снова откройте приложение.";

/**
 * Turns any thrown value into a response. Expected failures (HttpError) keep their text;
 * anything else is logged and hidden behind a generic message, so database or secret
 * details never reach the client.
 */
export function errorResponse(err: unknown, headers = CORS) {
  if (err instanceof HttpError) return fail(err.status, err.code, err.message, err.extra, headers);
  console.error(err);
  return fail(500, "server_error", SERVER_ERROR_TEXT, {}, headers);
}
