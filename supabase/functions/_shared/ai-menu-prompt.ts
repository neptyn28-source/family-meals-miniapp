import { AI_MENU_FORMAT } from "./ai-menu.ts";

function goalLabel(goal: string) {
  return ({ lose: "снижение веса", maintain: "поддержание", gain: "набор веса" } as Record<string, string>)[goal] || goal;
}

function stateLabel(state: string) {
  return ({
    raw: "сырое",
    cooked: "готовое",
    semi_finished: "полуфабрикат",
    frozen: "замороженное",
    dry: "сухое",
    canned: "консервы",
  } as Record<string, string>)[state] || state;
}

function dateLabel(date: string | null | undefined) {
  return date ? String(date) : "не указан";
}

export function buildExportPrompt(args: {
  weekStart: string;
  family: any;
  members: any[];
  settings: any;
  profile: any;
  rules: any[];
  inventory: any[];
  feedback: any[];
}) {
  const { weekStart, family, members, settings, profile, rules, inventory, feedback } = args;
  const hard = rules.filter((x) => x.enabled && x.rule_type === "hard");
  const preferences = rules.filter((x) => x.enabled && x.rule_type !== "hard");

  const uniqueDescriptions = (rows: any[]) => {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = String(row.description ?? "").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const memberNames = new Map(members.map((m) => [String(m.id), m]));

  const feedbackLines = feedback.map((x) => {
    const m = memberNames.get(String(x.member_id));
    const person = m ? `${m.role === "wife" ? "жена" : m.role === "husband" ? "муж" : m.role}: ${m.name}` : "член семьи";
    const parts = [
      x.taste ? `вкус=${x.taste}` : null,
      x.portion ? `порция=${x.portion}` : null,
      x.satiety != null ? `сытость=${x.satiety}/10` : null,
      x.strong_hunger ? "сильный голод после" : null,
      x.snack_eaten ? "перекус съеден" : null,
      x.leftovers ? "были остатки" : null,
      x.action ? `действие=${x.action}` : null,
      x.comment ? `комментарий: ${x.comment}` : null,
    ].filter(Boolean).join("; ");
    return `- ${x.title_snapshot} — ${person} — ${parts || "без деталей"}`;
  });

  const inventoryLines = inventory.length
    ? inventory.map((x) =>
        `- ${x.name}: ${x.quantity} ${x.unit}; состояние=${stateLabel(x.state)}; срочно=${x.urgent ? "да" : "нет"}; открыт=${x.opened ? "да" : "нет"}; срок=${dateLabel(x.use_by)}${x.note ? `; заметка=${x.note}` : ""}`
      )
    : ["- Остатков нет."];

  const hardLines = uniqueDescriptions(hard).map((x) => `- ${x.description}`);
  const prefLines = uniqueDescriptions(preferences).map((x) => `- ${x.description}`);

  const husbandName = members.find((x) => x.role === "husband")?.name || "Муж";
  const wifeName = members.find((x) => x.role === "wife")?.name || "Жена";

  return `ЗАДАЧА ДЛЯ CHATGPT: СОСТАВИТЬ СЕМЕЙНОЕ МЕНЮ

Ты составляешь меню как повар и планировщик питания. Бот НЕ выбирает блюда и НЕ определяет порции: это твоя работа.
Бот после твоего ответа сам посчитает покупки по блоку JSON, вычтет остатки, округлит до упаковок и разобьёт покупки на 2 захода: воскресенье и четверг.

Целевая неделя начинается: ${weekStart}.
Бюджет семьи: ${family.budget_weekly ?? settings?.weekly_budget_rub ?? 8000} RUB в неделю.
БЮДЖЕТ ЖЁСТКИЙ: если расчёт покупок после вычета остатков и округления до упаковок превысит лимит, бот ОТКЛОНИТ импорт. Планируй меню с запасом не менее 10% к лимиту.
Магазины: ${(settings?.stores ?? []).join(", ") || "не указаны"}.
Техника: ${(settings?.equipment ?? []).join(", ") || "не указана"}.

СОСТАВ СЕМЬИ И ЦЕЛИ
- ${husbandName} (муж): вес ${profile.husband.weight_kg ?? "не указан"} кг; рост ${profile.husband.height_cm ?? "не указан"} см; цель — ${goalLabel(profile.husband.goal)}.
- ${wifeName} (жена): вес ${profile.wife.weight_kg ?? "не указан"} кг; рост ${profile.wife.height_cm ?? "не указан"} см; цель — ${goalLabel(profile.wife.goal)}.
- Ребёнок: возраст ${profile.child.age_years ?? "не указан"} года/лет.
- Дни детского сада: ${(settings?.kindergarten_weekdays ?? [1,2,3,4,5]).join(", ")} (ISO: 1=пн ... 7=вс).
- Перекусов у жены в день: ${settings?.wife_snacks ?? 2}.
- Перекусов у мужа в день: ${settings?.husband_snacks ?? 0}.

ЖЁСТКИЕ ПРАВИЛА — НАРУШАТЬ НЕЛЬЗЯ
${hardLines.length ? hardLines.join("\n") : "- Дополнительных жёстких правил нет."}

ПРЕДПОЧТЕНИЯ
${prefLines.length ? prefLines.join("\n") : "- Дополнительных предпочтений нет."}

ТЕКУЩИЕ ОСТАТКИ ДОМА
${inventoryLines.join("\n")}

ПОСЛЕДНИЕ ОТЗЫВЫ
${feedbackLines.length ? feedbackLines.join("\n") : "- Отзывов пока нет."}

КАК НУЖНО СОСТАВИТЬ МЕНЮ
- Сделай меню на 7 дней: завтрак, перекус 1, обед, перекус 2, ужин.
- Порции мужа и жены подбирай по их весу, цели и отзывам о сытости/порциях. Не используй старые автоматические диапазоны как главный источник истины.
- Для КАЖДОГО домашнего приёма пищи обязательно дай portion_components отдельно для husband/wife/child: не общий вес блюда, а конкретно мясо/гарнир/овощи/соус и т.п. Количество указывай в готовом виде в g/ml/pcs. Для детсада у ребёнка массив может быть пустым, а пояснение идёт в portions.child.
- Для ребёнка укажи отдельную детскую порцию и адаптацию блюда. Если взрослые едят дома, meal остаётся external=false: для ребёнка пиши portions.child="Обед в детском саду" и portion_components.child=[]. external=true ставь только если ВЕСЬ слот является внешним для всей семьи.
- Учитывай остатки при выборе блюд, особенно скоропортящиеся/urgent, но не пытайся сам вычитать их из списка покупок — это сделает бот.
- Двухдневную готовку для обедов/ужинов оформляй ОДНИМ cook_block на всю партию. Ингредиенты в этом блоке — ОБЩЕЕ количество сырья на все перечисленные servings, один раз.
- Завтраки и перекусы не объединяй в двухдневные batch-блоки.
- Ингредиенты указывай в сыром/покупном виде и точных g/ml/pcs.
- Если одно блюдо готовится один раз на Пн+Вт, не дублируй его ингредиенты вторым блоком.
- Сначала дай обычное понятное меню и ПОДРОБНЫЕ рецепты для человека.
- Никакой готовки "на глаз": в шагах указывай точные граммы/мл/шт, время в минутах, режим техники или силу огня/температуру, порядок закладки и признак готовности.
- В seasoning нельзя писать "по вкусу", "щепотка", "немного", "примерно" или "около": только точное количество либо явно "без соли/специй".
- Для двухдневной партии укажи, как охладить, хранить и разогреть вторую часть прямо в шагах рецепта.
- В САМОМ КОНЦЕ обязательно дай ровно один JSON code block без комментариев внутри. Бот импортирует именно его.

ОБЯЗАТЕЛЬНЫЙ JSON-КОНТРАКТ
format всегда "${AI_MENU_FORMAT}".
week_start всегда "${weekStart}".
days — ровно 7 последовательных дней.
В каждом дне обязательны breakfast, snack1, lunch, snack2, dinner.
Для еды дома у meal должен быть cook_block_id.
Для еды вне дома: external=true и cook_block_id=null.
portions содержит краткое понятное описание порций husband/wife/child.
portion_components обязателен для домашней еды и содержит раскладку порции по составляющим для husband/wife/child; элементы: {"name":"готовая курица","amount":160,"unit":"g"}.
cook_blocks описывают каждую готовку ровно один раз.
Каждый cook_block перечисляет все слоты, которые он кормит, в serves.
ingredients — суммарное количество сырья на ВЕСЬ cook_block.
unit только g, ml или pcs.
state только raw, cooked, semi_finished, frozen, dry или canned.

СХЕМА:
{
  "format": "${AI_MENU_FORMAT}",
  "week_start": "${weekStart}",
  "summary": "короткая логика недели",
  "days": [
    {
      "date": "${weekStart}",
      "meals": {
        "breakfast": {
          "title": "название",
          "cook_block_id": "mon-breakfast",
          "external": false,
          "portions": {"husband":"кратко", "wife":"кратко", "child":"кратко"},
          "portion_components": {
            "husband":[{"name":"основной белок","amount":160,"unit":"g"},{"name":"гарнир","amount":180,"unit":"g"},{"name":"овощи","amount":120,"unit":"g"}],
            "wife":[{"name":"основной белок","amount":130,"unit":"g"},{"name":"гарнир","amount":150,"unit":"g"},{"name":"овощи","amount":100,"unit":"g"}],
            "child":[{"name":"основной белок","amount":70,"unit":"g"},{"name":"гарнир","amount":80,"unit":"g"},{"name":"овощи","amount":50,"unit":"g"}]
          },
          "notes": ""
        },
        "snack1": {"title":"...", "cook_block_id":"mon-snack1", "external":false, "portions":{"husband":"...","wife":"...","child":"..."}, "portion_components":{"husband":[{"name":"компонент","amount":100,"unit":"g"}],"wife":[{"name":"компонент","amount":80,"unit":"g"}],"child":[]}, "notes":""},
        "lunch": {"title":"...", "cook_block_id":"mon-tue-lunch", "external":false, "portions":{"husband":"...","wife":"...","child":"..."}, "portion_components":{"husband":[{"name":"компонент","amount":100,"unit":"g"}],"wife":[{"name":"компонент","amount":80,"unit":"g"}],"child":[]}, "notes":""},
        "snack2": {"title":"...", "cook_block_id":"mon-snack2", "external":false, "portions":{"husband":"...","wife":"...","child":"..."}, "portion_components":{"husband":[{"name":"компонент","amount":100,"unit":"g"}],"wife":[{"name":"компонент","amount":80,"unit":"g"}],"child":[]}, "notes":""},
        "dinner": {"title":"...", "cook_block_id":"mon-tue-dinner", "external":false, "portions":{"husband":"...","wife":"...","child":"..."}, "portion_components":{"husband":[{"name":"компонент","amount":100,"unit":"g"}],"wife":[{"name":"компонент","amount":80,"unit":"g"}],"child":[]}, "notes":""}
      }
    }
  ],
  "cook_blocks": [
    {
      "id": "mon-tue-lunch",
      "title": "название блюда",
      "serves": [
        {"date":"${weekStart}","meal_type":"lunch"}
      ],
      "ingredients": [
        {"name":"куриная грудка","amount":900,"unit":"g","state":"raw"}
      ],
      "recipe": {
        "steps":["Взвесить и подготовить точные количества ингредиентов; указать конкретную нарезку и технику.","Готовить 8 минут на среднем огне/указать точную температуру; затем ещё 3 минуты после добавления соуса. Для партии на два дня описать охлаждение и разогрев второй части."],
        "ready_output":"точный/оценочный общий выход готовой партии в г/мл/шт",
        "child_adaptation":"что и сколько отделить ребёнку до соли/соуса/специй",
        "seasoning":"например: соль 4 г, паприка 2 г; либо без соли/специй"
      }
    }
  ]
}

КРИТИЧЕСКИ ВАЖНО: JSON должен полностью соответствовать фактическому человеческому меню выше. Не добавляй в JSON продукты или блюда, которых нет в меню, и не пропускай ингредиенты, нужные для готовки.`;
}

