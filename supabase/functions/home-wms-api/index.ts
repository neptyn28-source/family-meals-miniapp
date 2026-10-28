// Home WMS: карта мест хранения семьи (комнаты → мебель → полки).
// Фронтенд — /home-wms/ (сборка репозитория home-wms). Доступ только по Telegram initData;
// семья определяется по family_members, family_id с клиента не принимается.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyInitData } from "../_shared/telegram.ts";
import { AUTH_FAILED_TEXT, CORS, errorResponse, fail, HttpError, reply } from "../_shared/http.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ROWS = 200;

function secretKey(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.default) return String(parsed.default);
  } catch {
    // legacy plain service-role key
  }
  return raw;
}

const BAD_INPUT_TEXT: Record<string, string> = {
  bad_text: "Название пустое или слишком длинное.",
  bad_id: "Некорректный идентификатор.",
  bad_position: "Некорректное положение на плане.",
  bad_size: "Некорректный размер.",
  bad_rows: "Слишком много строк или неверный формат данных.",
};

class BadRequest extends HttpError {
  constructor(code: string) {
    super(400, code, BAD_INPUT_TEXT[code] ?? "Некорректные данные.");
  }
}

function text(value: unknown, max: number): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s || s.length > max) throw new BadRequest("bad_text");
  return s;
}

function uuid(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new BadRequest("bad_id");
  return value;
}

function position(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 1000) {
    throw new BadRequest("bad_position");
  }
  return value as number;
}

function cm(value: unknown, max: number, nullable: boolean): number | null {
  if (value === null && nullable) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) {
    throw new BadRequest("bad_size");
  }
  return value;
}

function rows(value: unknown): Record<string, unknown>[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_ROWS) throw new BadRequest("bad_rows");
  return value.map((r) => {
    if (!r || typeof r !== "object") throw new BadRequest("bad_rows");
    return r as Record<string, unknown>;
  });
}

type CellRow = {
  id: string;
  label: string;
  height_from_floor_cm: number;
  width_cm: number | null;
  depth_cm: number | null;
  height_cm: number | null;
  zone_type: string;
  position: number;
};
type ModuleRow = {
  id: string;
  name: string;
  position: number;
  no_shelves: boolean;
  wms_cells: CellRow[];
};
type LocationRow = { id: string; name: string; position: number; wms_modules: ModuleRow[] };

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

async function extractFurniture(input: string): Promise<string[] | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
  const prompt =
    `Пользователь перечисляет мебель для хранения в комнате. Верни JSON-массив названий предметов мебели, ` +
    `каждое с заглавной буквы, без количества и лишних слов. Если предметов несколько одинаковых — ` +
    `перечисли каждый отдельно с номером («Шкаф 1», «Шкаф 2»). Ответ пользователя: «${input}»`;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: { type: "ARRAY", items: { type: "STRING" } },
          },
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      console.error("Gemini failed", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    const items: unknown = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "null");
    if (!Array.isArray(items)) return null;
    const names = items
      .filter((s): s is string => typeof s === "string" && s.trim() !== "")
      .map((s) => s.trim().slice(0, 80));
    return names.length > 0 ? names.slice(0, 20) : null;
  } catch (err) {
    console.error("Gemini failed", err);
    return null;
  }
}

async function main(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail(405, "method_not_allowed", "Метод не поддерживается.");

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const secretRaw = Deno.env.get("SUPABASE_SECRET_KEYS") ?? "";
    if (!botToken || !supabaseUrl || !secretRaw) throw new Error("Server secrets are missing");

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};

    const auth = await verifyInitData(body?.initData, botToken);
    if (!auth.ok) return fail(401, "auth_" + auth.error, AUTH_FAILED_TEXT);

    const db = createClient(supabaseUrl, secretKey(secretRaw), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: member, error: memberError } = await db
      .from("family_members")
      .select("family_id")
      .eq("telegram_user_id", auth.user.id)
      .eq("active", true)
      .maybeSingle();
    if (memberError) throw memberError;
    if (!member) {
      return fail(403, "not_invited", "Этот Telegram-аккаунт не привязан к семье");
    }
    const familyId = String(member.family_id);

    if (action === "wms.load") {
      const { data, error } = await db
        .from("wms_locations")
        .select(
          "id, name, position, wms_modules(id, name, position, no_shelves, wms_cells(id, label, height_from_floor_cm, width_cm, depth_cm, height_cm, zone_type, position))",
        )
        .eq("family_id", familyId);
      if (error) throw error;
      const locations = (data as LocationRow[]).sort(byPosition).map((l) => ({
        id: l.id,
        name: l.name,
        modules: l.wms_modules.sort(byPosition).map((m) => ({
          id: m.id,
          name: m.name,
          noShelves: m.no_shelves,
          cells: m.wms_cells.sort(byPosition).map((c) => ({
            id: c.id,
            label: c.label,
            heightFromFloor: Number(c.height_from_floor_cm),
            width: c.width_cm === null ? null : Number(c.width_cm),
            depth: c.depth_cm === null ? null : Number(c.depth_cm),
            height: c.height_cm === null ? null : Number(c.height_cm),
            zone: c.zone_type,
          })),
        })),
      }));
      return reply({ ok: true, locations });
    }

    if (action === "wms.save") {
      const locations = rows(payload.locations).map((r) => ({
        id: uuid(r.id),
        family_id: familyId,
        name: text(r.name, 80),
        position: position(r.position),
      }));
      const modules = rows(payload.modules).map((r) => ({
        id: uuid(r.id),
        family_id: familyId,
        location_id: uuid(r.location_id),
        name: text(r.name, 80),
        position: position(r.position),
        no_shelves: r.no_shelves === true,
      }));
      // Изменения уже записанной мебели: деление на секции меняет название и порядок.
      // module_flags — прежний формат (только «нет полок»), его шлют старые версии приложения.
      const moduleUpdates = [
        ...rows(payload.module_updates).map((r) => ({
          id: uuid(r.id),
          patch: {
            name: text(r.name, 80),
            position: position(r.position),
            no_shelves: r.no_shelves === true,
          } as Record<string, unknown>,
        })),
        ...rows(payload.module_flags).map((r) => ({
          id: uuid(r.id),
          patch: { no_shelves: r.no_shelves === true } as Record<string, unknown>,
        })),
      ];
      const cells = rows(payload.cells).map((r) => ({
        id: uuid(r.id),
        family_id: familyId,
        module_id: uuid(r.module_id),
        label: text(r.label, 80),
        height_from_floor_cm: cm(r.height_from_floor_cm, 400, false),
        width_cm: cm(r.width_cm, 500, true),
        depth_cm: cm(r.depth_cm, 500, true),
        height_cm: cm(r.height_cm, 500, true),
        position: position(r.position),
      }));

      // Родители должны принадлежать этой семье: либо уже в базе, либо в этом же запросе.
      const ownedIds = async (table: string, ids: string[]) => {
        if (ids.length === 0) return new Set<string>();
        const { data, error } = await db.from(table).select("id").eq("family_id", familyId).in("id", ids);
        if (error) throw error;
        return new Set((data ?? []).map((r: { id: string }) => r.id));
      };
      const newLocationIds = new Set(locations.map((r) => r.id));
      const newModuleIds = new Set(modules.map((r) => r.id));
      const knownLocations = await ownedIds(
        "wms_locations",
        modules.map((r) => r.location_id).filter((id) => !newLocationIds.has(id)),
      );
      const knownModules = await ownedIds(
        "wms_modules",
        cells.map((r) => r.module_id).filter((id) => !newModuleIds.has(id)),
      );
      if (modules.some((r) => !newLocationIds.has(r.location_id) && !knownLocations.has(r.location_id))) {
        return fail(400, "unknown_location", "Комната не найдена.");
      }
      if (cells.some((r) => !newModuleIds.has(r.module_id) && !knownModules.has(r.module_id))) {
        return fail(400, "unknown_module", "Мебель не найдена.");
      }

      // Повтор после обрыва связи не дублирует строки: уже записанные id пропускаются.
      for (const [table, batch] of [
        ["wms_locations", locations],
        ["wms_modules", modules],
        ["wms_cells", cells],
      ] as const) {
        if (batch.length === 0) continue;
        const { error } = await db.from(table).upsert(batch, { onConflict: "id", ignoreDuplicates: true });
        if (error) throw error;
      }
      // Чужая мебель не найдётся по family_id — обновление просто ничего не тронет.
      for (const update of moduleUpdates) {
        const { error } = await db
          .from("wms_modules")
          .update(update.patch)
          .eq("family_id", familyId)
          .eq("id", update.id);
        if (error) throw error;
      }
      return reply({ ok: true });
    }

    if (action === "wms.clear") {
      const { error } = await db.from("wms_locations").delete().eq("family_id", familyId);
      if (error) throw error;
      return reply({ ok: true });
    }

    if (action === "wms.cells.clear") {
      // Вещи на этих полках не теряются: cell_id обнуляется внешним ключом.
      const { error } = await db
        .from("wms_cells")
        .delete()
        .eq("family_id", familyId)
        .eq("module_id", uuid(payload.module_id));
      if (error) throw error;
      return reply({ ok: true });
    }

    if (action === "wms.furniture") {
      return reply({ ok: true, items: await extractFurniture(text(payload.text, 500)) });
    }

    return fail(400, "unknown_action", "Неизвестное действие.");
  } catch (err) {
    return errorResponse(err);
  }
}

Deno.serve(main);
