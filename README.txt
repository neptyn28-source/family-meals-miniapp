FAMILY MEALS MINI APP

Текущая архитектура:
1. Telegram Mini App хранит семейные факты в Supabase: остатки, правила, вес/цели, отзывы и недельные меню.
2. Бот сам НЕ придумывает блюда и порции.
3. Кнопка «Выгрузить в ИИ» формирует готовый промт для ChatGPT.
4. ChatGPT возвращает человекочитаемое меню + JSON формата family-meal-plan-v2. Для домашней еды порции раскладываются по компонентам (белок/гарнир/овощи/соус и т.п.), а рецепты содержат точные количества, время и режим готовки.
5. Кнопка «Вставить меню из ИИ» валидирует JSON и сохраняет неделю.
6. Покупки считаются детерминированно по cook-blocks: двухдневная готовка считается один раз, остатки вычитаются с учётом состояния продукта, покупка округляется до упаковок.
7. Покупки делятся на два захода: воскресенье перед неделей для Пн–Ср и четверг для Чт–Вс. Излишек упаковки из воскресной закупки учитывается как доступный остаток для четверга.
8. Недельный бюджет — жёсткий лимит: импорт меню не сохраняется, если рассчитанная стоимость покупок после вычета остатков и округления упаковок выше бюджета.
9. Автоматический week-generate отключён и возвращает 410.

Frontend:
- index.html
- styles.css
- app-v2.js

Backend:
- supabase/functions/family-api
- supabase/functions/ai-menu-api
- supabase/functions/week-generate (disabled compatibility endpoint)
- supabase/functions/_shared/ai-menu.ts

Безопасность:
- Telegram initData проверяется сервером.
- family_id с клиента не принимается как источник доступа.
- Telegram bot token и Supabase server secrets хранятся только в Supabase Secrets.
- anon/authenticated не имеют прямого доступа к семейным таблицам; Edge Functions работают через серверный ключ.

CI:
- unit tests
- frontend syntax
- Deno typecheck
- migration idempotency
- gitleaks secret scan
Production: изменения в main проходят CI и затем деплоятся в Supabase Edge Functions.
