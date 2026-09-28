// Telegram Mini App initData verification (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
// Uses WebCrypto only, so it runs in Deno Edge Functions and Node >= 20.

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export type InitDataResult =
  | { ok: true; user: TelegramUser; auth_date: number }
  | { ok: false; error: "missing" | "bad_hash" | "expired" | "no_user" | "malformed" };

const enc = new TextEncoder();

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const rawKey: ArrayBuffer = key instanceof Uint8Array
    ? (new Uint8Array(key).buffer as ArrayBuffer)
    : key;
  const k = await crypto.subtle.importKey("raw", rawKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(data));
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function computeInitDataHash(params: URLSearchParams, botToken: string): Promise<string> {
  const pairs: string[] = [];
  for (const [k, v] of params) if (k !== "hash") pairs.push(`${k}=${v}`);
  pairs.sort();
  const secret = await hmac(enc.encode("WebAppData"), botToken);
  return toHex(await hmac(secret, pairs.join("\n")));
}

export async function verifyInitData(
  initData: string | null | undefined,
  botToken: string,
  opts: { maxAgeSeconds?: number; now?: number } = {},
): Promise<InitDataResult> {
  if (!initData || typeof initData !== "string") return { ok: false, error: "missing" };
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { ok: false, error: "malformed" };
  }
  const hash = params.get("hash");
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return { ok: false, error: "bad_hash" };
  const expected = await computeInitDataHash(params, botToken);
  if (!timingSafeEqualHex(expected, hash)) return { ok: false, error: "bad_hash" };

  const authDate = Number(params.get("auth_date"));
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  const maxAge = opts.maxAgeSeconds ?? 24 * 3600;
  if (!Number.isFinite(authDate) || authDate <= 0) return { ok: false, error: "malformed" };
  if (now - authDate > maxAge || authDate - now > 300) return { ok: false, error: "expired" };

  let user: TelegramUser;
  try {
    user = JSON.parse(params.get("user") ?? "null");
  } catch {
    return { ok: false, error: "malformed" };
  }
  if (!user || !Number.isSafeInteger(user.id) || user.id <= 0) return { ok: false, error: "no_user" };
  return { ok: true, user, auth_date: authDate };
}
