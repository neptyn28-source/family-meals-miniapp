# «Деньги»: правильные остатки и надёжная запись + CI без обходного деплоя

> Выполняется нативно (пользователь сказал «начинай» 2026-11-08). Пакеты 1 и 2 из аудита.

**Goal:** остатки конвертов считаются по всем операциям; каждая запись в «Деньгах» проверяется; прод не получает код без тестов.

**Architecture:** чистая логика баланса выносится в `supabase/functions/family-budget/balances.ts` без внешних импортов (тестируется через `node --test`); `index.ts` читает операции страницами по 1000 и вызывает её. Миграций нет. CI: удалить отдельный деплой ai-menu-api, расширить `deno check`.

**Approaches:** (a) SQL-функция/представление с `sum()` — быстрее, но требует миграции в прод и прав `anon`; (b) читать все операции страницами в функции — без изменений в базе, при сотнях–тысячах операций быстро. Выбрано (b): меньше риска для живой базы, объёмы маленькие (69 операций).

## Global Constraints
- Деньги — целые копейки (`Number.isSafeInteger`), как сейчас.
- Формат ответов API не меняется (`balance`, `total`, `operations` — лента из последних 80).
- Ничего не пушить в `main` без отдельного согласия пользователя.

## Review Focus
- Больше 1000 операций у конверта → сверка (`envelope_adjust`) и архив считают по всем строкам.
- Сбой записи операции дохода → запись `fb_income_events` удаляется.
- Нет личного конверта у участника → 400 «Личный конверт не найден», не 500 без CORS.
- Трата в архивный или системный конверт, перевод в архивный → отказ.
- Любое исключение → JSON 500 с CORS-заголовками, без сырого текста ошибки БД.

### Task 1: Остатки по всем операциям
**Files:** Create `supabase/functions/family-budget/balances.ts`; Modify `supabase/functions/family-budget/index.ts` (`state`, `envelope_adjust`, `envelope_archive`); Test `tests/family-budget-balances.test.ts`.
**Produces:** `sumByEnvelope(rows: {envelope_id: string; amount: number|string}[]): Record<string, number>`; `fetchAllPages<T>(page: (from: number, to: number) => Promise<{data: T[]|null; error: unknown}>, size = 1000): Promise<T[]>` (бросает `error`).
- [ ] Тесты: сумма по конвертам со строковыми amount; 2500 строк через fake page → все прочитаны, 3 вызова; ошибка страницы пробрасывается.
- [ ] Реализовать, подключить в `index.ts`, лента остаётся `.limit(80)`.

### Task 2: Проверка каждой записи
**Files:** Modify `supabase/functions/family-budget/index.ts`.
- [ ] `expense`: только `status=active`, не `system`; `transfer`: только `status=active` (из «Нераспределённых» переводить можно — так сделаны все 11 переводов в базе); проверять `error` insert.
- [ ] `personal`: нет конверта → 400; проверять `error`.
- [ ] `income`: при ошибке операции удалить `fb_income_events` по id.
- [ ] `create`/`join`: токен ≥ 20 символов; `create` проверяет ошибку household; `seed` проверяет ошибку правил.
- [ ] Комментарии `slice(0,300)`; `api()` в try/catch → `J({ok:false,error:"server_error"},500)` + `console.error`.

### Task 3: CI
**Files:** Delete `.github/workflows/deploy-ai-menu-api.yml`; Modify `.github/workflows/ci.yml`.
- [ ] Добавить `family-budget/index.ts`, `home-wms-api/index.ts` в `deno check`; убрать ветку `ai-assisted-menu-flow` из триггера.
- [ ] `npm test` зелёный; `deno check` локально (через npx deno), если доступен.
