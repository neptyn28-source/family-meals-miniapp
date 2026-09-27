const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1uec0985MtG3wzW-FaXvdw_O2P3nLoZ";

const FAMILY_API_URL =
  "https://vwapvcpodwvfzfmtoxhz.supabase.co/functions/v1/family-api";

const WEEK_GENERATE_URL =
  "https://vwapvcpodwvfzfmtoxhz.supabase.co/functions/v1/week-generate";

const tg = window.Telegram?.WebApp;

const statusEl = document.querySelector("#status");
const authCard = document.querySelector("#authCard");
const authText = document.querySelector("#authText");
const retryBtn = document.querySelector("#retryBtn");
const home = document.querySelector("#home");
const hello = document.querySelector("#hello");
const placeholder = document.querySelector("#placeholder");

if (tg) {
  tg.ready();
  tg.expand();
}

let initData = "";
let bootstrapData = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formControlStyle(extra = "") {
  return [
    "width:100%",
    "padding:12px",
    "border-radius:10px",
    "border:1px solid #555",
    "box-sizing:border-box",
    extra,
  ].filter(Boolean).join(";");
}

async function api(action, payload = {}) {
  if (!initData) {
    throw new Error("Нет Telegram initData");
  }

  const response = await fetch(FAMILY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      initData,
      action,
      payload,
    }),
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok || !data.ok) {
    const error = new Error(
      data.message || data.error || `Ошибка сервера ${response.status}`
    );

    error.code = data.error || "api_error";
    error.status = response.status;
    throw error;
  }

  return data;
}

function showJoinFamily() {
  statusEl.textContent = "Подключение к семье";
  authCard.classList.remove("hidden");

  authCard.innerHTML = `
    <h2>Войти в семью</h2>
    <p>Этот Telegram-аккаунт ещё не привязан к семье. Введите код приглашения.</p>
    <input
      id="familyCode"
      maxlength="6"
      autocomplete="off"
      placeholder="Например: A7K9P2"
      style="${formControlStyle("margin:8px 0;text-transform:uppercase")}" 
    >
    <button
      id="joinFamilyBtn"
      style="width:100%;padding:12px;border:0;border-radius:10px;font-weight:700;margin-top:6px"
    >
      Присоединиться
    </button>
    <p id="joinFamilyStatus"></p>
  `;

  const input = document.querySelector("#familyCode");
  const button = document.querySelector("#joinFamilyBtn");
  const message = document.querySelector("#joinFamilyStatus");

  input.addEventListener("input", () => {
    input.value = input.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
  });

  button.addEventListener("click", async () => {
    const code = input.value.trim().toUpperCase();

    if (code.length !== 6) {
      message.textContent = "Введите код из 6 символов.";
      return;
    }

    button.disabled = true;
    message.textContent = "Подключаем к семье…";

    try {
      await api("invite.join", { code });
      message.textContent = "Готово. Загружаем семейное меню…";
      setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      message.textContent = error.message || "Не удалось подключиться.";
      button.disabled = false;
    }
  });
}

function addInviteButton() {
  if (bootstrapData?.member?.role !== "husband") {
    return;
  }

  if (document.querySelector("#inviteWifeBtn")) {
    return;
  }

  const card = hello.parentElement;
  const wrapper = document.createElement("div");
  wrapper.style.marginTop = "16px";

  wrapper.innerHTML = `
    <button
      id="inviteWifeBtn"
      style="width:100%;padding:12px;border:0;border-radius:10px;font-weight:700"
    >
      Пригласить жену
    </button>
    <div id="inviteResult" style="margin-top:12px"></div>
  `;

  card.appendChild(wrapper);

  document
    .querySelector("#inviteWifeBtn")
    .addEventListener("click", createInvite);
}

async function createInvite() {
  const button = document.querySelector("#inviteWifeBtn");
  const result = document.querySelector("#inviteResult");

  button.disabled = true;
  result.textContent = "Создаём код…";

  try {
    const data = await api("invite.create");
    const code = data.invite.code;
    const expires = new Date(data.invite.expires_at).toLocaleString("ru-RU");

    result.innerHTML = `
      <div style="padding:14px;border:1px solid #555;border-radius:12px;text-align:center">
        <div style="font-size:13px">Код для жены</div>
        <div style="font-size:30px;font-weight:800;letter-spacing:5px;margin:8px 0">
          ${escapeHtml(code)}
        </div>
        <div style="font-size:12px;opacity:.7">
          Действует до ${escapeHtml(expires)}
        </div>
      </div>
    `;

    button.textContent = "Создать новый код";
  } catch (error) {
    result.textContent = "Ошибка: " + error.message;
  } finally {
    button.disabled = false;
  }
}

async function authenticate() {
  if (retryBtn) {
    retryBtn.hidden = true;
  }

  statusEl.textContent = "Подключаем Telegram…";

  if (authText) {
    authText.textContent = "Проверяем пользователя и семейную базу.";
  }

  initData = tg?.initData || "";

  if (!initData) {
    statusEl.textContent = "Открой приложение из Telegram";

    if (authText) {
      authText.textContent =
        "Обычная вкладка браузера не получает Telegram initData.";
    }

    return;
  }

  try {
    bootstrapData = await api("bootstrap");
    statusEl.textContent = "Telegram подключён";

    const name =
      bootstrapData.member?.name ||
      bootstrapData.telegram_user?.first_name ||
      "семья";

    hello.textContent = `Привет, ${name}!`;
    authCard.classList.add("hidden");
    home.classList.remove("hidden");
    addInviteButton();
  } catch (error) {
    if (error.code === "not_invited") {
      showJoinFamily();
      return;
    }

    statusEl.textContent = "Не удалось войти";

    if (authText) {
      authText.textContent = error.message || "Ошибка авторизации";
    }

    if (retryBtn) {
      retryBtn.hidden = false;
    }
  }
}

function stateLabel(state) {
  const labels = {
    raw: "Сырое",
    cooked: "Готовое",
    semi_finished: "Полуфабрикат",
    frozen: "Замороженное",
    dry: "Сухое",
    canned: "Консервы",
  };

  return labels[state] || state;
}

async function showInventory() {
  placeholder.classList.remove("hidden");

  placeholder.innerHTML = `
    <h2>Остатки</h2>
    <p>Общие продукты семьи. Данные хранятся в Supabase.</p>

    <div style="display:grid;gap:10px;margin-bottom:18px">
      <input
        id="invName"
        placeholder="Продукт, например: куриная грудка"
        style="${formControlStyle()}"
      >

      <div style="display:grid;grid-template-columns:1fr 100px;gap:8px">
        <input
          id="invQty"
          type="number"
          step="0.001"
          min="0"
          placeholder="Количество"
          style="${formControlStyle()}"
        >
        <select id="invUnit" style="${formControlStyle()}">
          <option value="g">г</option>
          <option value="ml">мл</option>
          <option value="pcs">шт</option>
        </select>
      </div>

      <select id="invState" style="${formControlStyle()}">
        <option value="raw">Сырое</option>
        <option value="cooked">Готовое</option>
        <option value="semi_finished">Полуфабрикат</option>
        <option value="frozen">Замороженное</option>
        <option value="dry">Сухое</option>
        <option value="canned">Консервы</option>
      </select>

      <label>
        <input id="invUrgent" type="checkbox">
        Срочно использовать
      </label>

      <button
        id="invAdd"
        style="padding:12px;border:0;border-radius:10px;font-weight:700"
      >
        Добавить продукт
      </button>
    </div>

    <div id="inventoryStatus">Загружаем…</div>
    <div id="inventoryList"></div>
  `;

  document
    .querySelector("#invAdd")
    .addEventListener("click", addInventory);

  await loadInventory();
}

async function loadInventory() {
  const listEl = document.querySelector("#inventoryList");
  const status = document.querySelector("#inventoryStatus");

  try {
    status.textContent = "Загружаем…";
    const data = await api("inventory.list");
    const items = data.items || [];

    status.textContent = items.length
      ? `Продуктов: ${items.length}`
      : "Остатков пока нет.";

    listEl.innerHTML = items
      .map(
        (item) => `
          <div style="padding:12px 0;border-top:1px solid #444;display:flex;justify-content:space-between;gap:12px">
            <div>
              <strong>${escapeHtml(item.name)}</strong><br>
              ${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}
              ${item.urgent ? " · ⚠️ срочно" : ""}
              <br>
              <small>${escapeHtml(stateLabel(item.state))}</small>
            </div>
            <button
              data-delete-inventory="${escapeHtml(item.id)}"
              style="height:36px"
            >
              Удалить
            </button>
          </div>
        `
      )
      .join("");

    document
      .querySelectorAll("[data-delete-inventory]")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          await deleteInventory(button.dataset.deleteInventory);
        });
      });
  } catch (error) {
    status.textContent = "Ошибка: " + error.message;
  }
}

async function addInventory() {
  const name = document.querySelector("#invName").value.trim();
  const quantity = Number(document.querySelector("#invQty").value);
  const unit = document.querySelector("#invUnit").value;
  const state = document.querySelector("#invState").value;
  const urgent = document.querySelector("#invUrgent").checked;

  if (!name) {
    alert("Введи название продукта");
    return;
  }

  if (!Number.isFinite(quantity) || quantity < 0) {
    alert("Проверь количество");
    return;
  }

  try {
    await api("inventory.add", {
      name,
      quantity,
      unit,
      state,
      urgent,
    });

    document.querySelector("#invName").value = "";
    document.querySelector("#invQty").value = "";
    document.querySelector("#invUrgent").checked = false;
    await loadInventory();
  } catch (error) {
    alert("Не удалось добавить: " + error.message);
  }
}

async function deleteInventory(id) {
  try {
    await api("inventory.delete", { id });
    await loadInventory();
  } catch (error) {
    alert("Не удалось удалить: " + error.message);
  }
}

function ruleTypeLabel(type) {
  const labels = {
    hard: "🔴 Жёсткое правило",
    preference: "🟡 Предпочтение",
    feedback: "🟢 Наблюдение",
  };

  return labels[type] || type;
}

async function showRules() {
  placeholder.classList.remove("hidden");

  placeholder.innerHTML = `
    <h2>Правила семьи</h2>
    <p>
      Общие ограничения и предпочтения. Активные правила потом будут учитываться при составлении меню.
    </p>

    <div style="display:grid;gap:10px;margin-bottom:18px">
      <select id="ruleType" style="${formControlStyle()}">
        <option value="hard">🔴 Жёсткое правило</option>
        <option value="preference" selected>🟡 Предпочтение</option>
        <option value="feedback">🟢 Наблюдение</option>
      </select>

      <textarea
        id="ruleDescription"
        rows="3"
        placeholder="Например: апельсины нельзя — аллергия"
        style="${formControlStyle("resize:vertical")}" 
      ></textarea>

      <button
        id="ruleAdd"
        style="padding:12px;border:0;border-radius:10px;font-weight:700"
      >
        Добавить правило
      </button>
    </div>

    <div id="rulesStatus">Загружаем…</div>
    <div id="rulesList"></div>
  `;

  document
    .querySelector("#ruleAdd")
    .addEventListener("click", addRule);

  await loadRules();
}

async function loadRules() {
  const status = document.querySelector("#rulesStatus");
  const list = document.querySelector("#rulesList");

  try {
    status.textContent = "Загружаем…";
    const data = await api("rules.list");
    const rules = data.rules || [];

    status.textContent = rules.length
      ? `Правил: ${rules.length}`
      : "Правил пока нет.";

    list.innerHTML = rules
      .map(
        (rule) => `
          <div
            data-rule-row="${escapeHtml(rule.id)}"
            style="padding:14px 0;border-top:1px solid #444"
          >
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
              <div style="min-width:0;flex:1">
                <div style="font-size:13px;opacity:.72;margin-bottom:5px">
                  ${escapeHtml(ruleTypeLabel(rule.rule_type))}
                </div>
                <div style="font-weight:700;word-break:break-word">
                  ${escapeHtml(rule.description)}
                </div>
              </div>

              <label style="white-space:nowrap;font-size:13px">
                <input
                  type="checkbox"
                  data-rule-enabled="${escapeHtml(rule.id)}"
                  ${rule.enabled ? "checked" : ""}
                >
                активно
              </label>
            </div>

            <div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;margin-top:10px">
              <select
                data-rule-type="${escapeHtml(rule.id)}"
                style="${formControlStyle("padding:8px")}" 
              >
                <option value="hard" ${rule.rule_type === "hard" ? "selected" : ""}>🔴 Жёсткое</option>
                <option value="preference" ${rule.rule_type === "preference" ? "selected" : ""}>🟡 Предпочтение</option>
                <option value="feedback" ${rule.rule_type === "feedback" ? "selected" : ""}>🟢 Наблюдение</option>
              </select>

              <button data-rule-edit="${escapeHtml(rule.id)}">Изменить</button>
              <button data-rule-delete="${escapeHtml(rule.id)}">Удалить</button>
            </div>
          </div>
        `
      )
      .join("");

    document.querySelectorAll("[data-rule-enabled]").forEach((checkbox) => {
      checkbox.addEventListener("change", async () => {
        await updateRule(checkbox.dataset.ruleEnabled, {
          enabled: checkbox.checked,
        });
      });
    });

    document.querySelectorAll("[data-rule-type]").forEach((select) => {
      select.addEventListener("change", async () => {
        await updateRule(select.dataset.ruleType, {
          rule_type: select.value,
        });
      });
    });

    document.querySelectorAll("[data-rule-edit]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.dataset.ruleEdit;
        const rule = rules.find((item) => String(item.id) === String(id));
        if (!rule) return;

        const description = prompt("Изменить правило", rule.description);
        if (description === null) return;

        const trimmed = description.trim();
        if (!trimmed) {
          alert("Правило не может быть пустым");
          return;
        }

        await updateRule(id, { description: trimmed });
      });
    });

    document.querySelectorAll("[data-rule-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.dataset.ruleDelete;
        const rule = rules.find((item) => String(item.id) === String(id));
        const confirmed = confirm(
          `Удалить правило?\n\n${rule?.description || ""}`
        );
        if (!confirmed) return;
        await deleteRule(id);
      });
    });
  } catch (error) {
    status.textContent = "Ошибка: " + error.message;
    list.innerHTML = "";
  }
}

async function addRule() {
  const type = document.querySelector("#ruleType").value;
  const description = document.querySelector("#ruleDescription").value.trim();
  const button = document.querySelector("#ruleAdd");

  if (!description) {
    alert("Напиши правило");
    return;
  }

  button.disabled = true;

  try {
    await api("rules.add", {
      rule_type: type,
      description,
    });

    document.querySelector("#ruleDescription").value = "";
    await loadRules();
  } catch (error) {
    alert("Не удалось добавить правило: " + error.message);
  } finally {
    button.disabled = false;
  }
}

async function updateRule(id, changes) {
  try {
    await api("rules.update", {
      id,
      ...changes,
    });
    await loadRules();
  } catch (error) {
    alert("Не удалось изменить правило: " + error.message);
    await loadRules();
  }
}

async function deleteRule(id) {
  try {
    await api("rules.delete", { id });
    await loadRules();
  } catch (error) {
    alert("Не удалось удалить правило: " + error.message);
  }
}


const MEAL_TYPES = [
  ["breakfast", "Завтрак"],
  ["snack1", "Перекус"],
  ["lunch", "Обед"],
  ["snack2", "Перекус"],
  ["dinner", "Ужин"],
];

let currentWeekStart = getMonday(new Date());

function getMonday(value) {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  const shift = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - shift);
  return date;
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function isoDate(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shortDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function dayTitle(value) {
  const text = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(value));

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function weekStatusLabel(status) {
  const labels = {
    draft: "Черновик",
    approved: "Утверждено",
    archived: "Архив",
  };
  return labels[status] || status;
}

async function showWeek(start = currentWeekStart) {
  currentWeekStart = getMonday(start);
  placeholder.classList.remove("hidden");

  placeholder.innerHTML = `
    <h2>Новая неделя</h2>
    <p>
      Общий план питания для семьи. Изменения сразу видны обоим.
    </p>

    <div style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;margin-bottom:10px">
      <button id="weekPrev">←</button>
      <button id="weekToday">Текущая неделя</button>
      <button id="weekNext">→</button>
    </div>

    <div id="weekStatus">Загружаем…</div>
    <div id="weekContent"></div>
  `;

  document.querySelector("#weekPrev").addEventListener("click", () => {
    showWeek(addDays(currentWeekStart, -7));
  });

  document.querySelector("#weekNext").addEventListener("click", () => {
    showWeek(addDays(currentWeekStart, 7));
  });

  document.querySelector("#weekToday").addEventListener("click", () => {
    showWeek(getMonday(new Date()));
  });

  await loadWeek();
}

async function loadWeek() {
  const status = document.querySelector("#weekStatus");
  const content = document.querySelector("#weekContent");

  if (!status || !content) return;

  try {
    status.textContent = "Загружаем неделю…";

    const data = await api("week.get", {
      week_start: isoDate(currentWeekStart),
    });

    renderWeek(data.week, data.meals || []);
  } catch (error) {
    status.textContent = "Ошибка: " + error.message;
    content.innerHTML = "";
  }
}


async function generateWeek(weekId) {
  const button = document.querySelector("#weekGenerateBtn");
  const generationStatus = document.querySelector("#weekGenerateStatus");

  if (!button || !generationStatus) return;

  const confirmed = confirm(
    "Составить всю неделю автоматически?\n\n" +
    "Уже введённые вручную блюда сохранят свои названия, а остальные слоты планировщик заполнит по остаткам и активным правилам."
  );

  if (!confirmed) return;

  button.disabled = true;
  button.textContent = "⏳ Составляем неделю…";
  generationStatus.textContent =
    "Планировщик проверяет остатки, правила семьи, порции и двухдневные заготовки.";

  try {
    const response = await fetch(WEEK_GENERATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        initData,
        week_id: weekId,
        preserve_existing: true,
      }),
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok || !data.ok) {
      throw new Error(
        data.message ||
        data.error ||
        `Ошибка генерации ${response.status}`
      );
    }

    generationStatus.textContent =
      `Готово: создано ${data.generated || 35} приёмов пищи. Загружаем меню…`;

    await loadWeek();
  } catch (error) {
    generationStatus.textContent =
      "Ошибка генерации: " + (error.message || "неизвестная ошибка");
  } finally {
    const nextButton = document.querySelector("#weekGenerateBtn");
    if (nextButton) {
      nextButton.disabled = false;
      nextButton.textContent = "✨ Составить неделю";
    }
  }
}

function mealDetailsHtml(meal) {
  const portions = meal?.portions || {};
  const ingredients = Array.isArray(meal?.ingredients) ? meal.ingredients : [];
  const recipe = meal?.recipe || {};
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];

  const portionLines = [
    ["Муж", portions.husband],
    ["Жена", portions.wife],
    ["Ребёнок", portions.child],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) =>
      `<li><b>${label}:</b> ${escapeHtml(value)}</li>`
    )
    .join("");

  const ingredientLines = ingredients
    .map((item) => {
      const fromHome = item.from_inventory ? " · из остатков" : "";
      return `<li>${escapeHtml(item.name)} — ${escapeHtml(item.amount)} ${escapeHtml(item.unit)}${fromHome}</li>`;
    })
    .join("");

  const stepLines = steps
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join("");

  if (!portionLines && !ingredientLines && !stepLines && !recipe.ready_output && !meal.notes) {
    return "";
  }

  return `
    <details style="margin-top:6px">
      <summary style="cursor:pointer;font-size:13px;opacity:.8">Подробнее</summary>
      <div style="padding:8px 0 4px;font-size:13px;line-height:1.45">
        ${portionLines ? `<b>Порции</b><ul style="margin-top:4px">${portionLines}</ul>` : ""}
        ${ingredientLines ? `<b>Ингредиенты</b><ul style="margin-top:4px">${ingredientLines}</ul>` : ""}
        ${stepLines ? `<b>Как готовить</b><ol style="margin-top:4px">${stepLines}</ol>` : ""}
        ${recipe.ready_output ? `<p><b>Выход:</b> ${escapeHtml(recipe.ready_output)}</p>` : ""}
        ${meal.notes ? `<p><b>Примечание:</b> ${escapeHtml(meal.notes)}</p>` : ""}
      </div>
    </details>
  `;
}

function renderWeek(week, meals) {
  const status = document.querySelector("#weekStatus");
  const content = document.querySelector("#weekContent");

  const start = new Date(week.week_start + "T12:00:00");
  const end = addDays(start, 6);

  status.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin:8px 0 10px">
      <div>
        <strong>${shortDate(start)}–${shortDate(end)}</strong><br>
        <small>Статус: ${escapeHtml(weekStatusLabel(week.status))}</small>
      </div>

      <button id="weekToggleStatus">
        ${week.status === "approved" ? "Вернуть в черновик" : "Утвердить неделю"}
      </button>
    </div>

    <div style="padding:12px;border:1px solid #444;border-radius:12px;margin-bottom:12px">
      <button
        id="weekGenerateBtn"
        style="width:100%;padding:12px;border:0;border-radius:10px;font-weight:800"
      >
        ✨ Составить неделю
      </button>
      <div id="weekGenerateStatus" style="font-size:13px;opacity:.75;margin-top:8px">
        Планировщик использует активные правила семьи и текущие остатки.
      </div>
    </div>
  `;

  document.querySelector("#weekGenerateBtn").addEventListener("click", async () => {
    await generateWeek(week.id);
  });

  document.querySelector("#weekToggleStatus").addEventListener("click", async () => {
    const nextStatus = week.status === "approved" ? "draft" : "approved";

    try {
      await api("week.status", {
        week_id: week.id,
        status: nextStatus,
      });
      await loadWeek();
    } catch (error) {
      alert("Не удалось изменить статус: " + error.message);
    }
  });

  const bySlot = new Map(
    meals.map((meal) => [`${meal.meal_date}|${meal.meal_type}`, meal])
  );

  let html = `
    <div style="margin-bottom:12px;padding:12px;border:1px solid #444;border-radius:12px">
      <strong>Общее семейное меню</strong>
      <div style="font-size:13px;opacity:.75;margin-top:4px">
        Можно составить всю неделю автоматически, а любое блюдо потом изменить вручную.
      </div>
    </div>
  `;

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const date = addDays(start, dayIndex);
    const dateIso = isoDate(date);

    html += `
      <section style="padding:14px 0;border-top:1px solid #444">
        <h3 style="margin:0 0 10px">${escapeHtml(dayTitle(date))}</h3>
        <div style="display:grid;gap:8px">
    `;

    for (const [mealType, mealLabel] of MEAL_TYPES) {
      const meal = bySlot.get(`${dateIso}|${mealType}`);

      html += `
        <div style="display:grid;grid-template-columns:82px 1fr auto;gap:8px;align-items:center">
          <div style="font-size:13px;opacity:.72">
            ${escapeHtml(mealLabel)}
          </div>

          <div style="min-width:0">
            ${meal
              ? `<strong style="word-break:break-word">${escapeHtml(meal.title)}</strong>${mealDetailsHtml(meal)}`
              : `<span style="opacity:.55">Не заполнено</span>`
            }
          </div>

          <div style="display:flex;gap:6px">
            <button
              data-meal-save="1"
              data-week-id="${escapeHtml(week.id)}"
              data-meal-date="${dateIso}"
              data-meal-type="${mealType}"
              data-meal-id="${meal ? escapeHtml(meal.id) : ""}"
              data-meal-title="${meal ? escapeHtml(meal.title) : ""}"
            >
              ${meal ? "Изм." : "+"}
            </button>

            ${meal
              ? `<button data-meal-delete="${escapeHtml(meal.id)}">×</button>`
              : ""
            }
          </div>
        </div>
      `;
    }

    html += `
        </div>
      </section>
    `;
  }

  content.innerHTML = html;

  content.querySelectorAll("[data-meal-save]").forEach((button) => {
    button.addEventListener("click", async () => {
      const existing = button.dataset.mealTitle || "";
      const title = prompt("Название блюда", existing);

      if (title === null) return;

      const trimmed = title.trim();

      if (!trimmed) {
        alert("Название блюда не может быть пустым");
        return;
      }

      try {
        await api("week.meal.save", {
          week_id: button.dataset.weekId,
          meal_date: button.dataset.mealDate,
          meal_type: button.dataset.mealType,
          title: trimmed,
        });

        await loadWeek();
      } catch (error) {
        alert("Не удалось сохранить блюдо: " + error.message);
      }
    });
  });

  content.querySelectorAll("[data-meal-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Удалить это блюдо из недели?")) return;

      try {
        await api("week.meal.delete", {
          id: button.dataset.mealDelete,
        });

        await loadWeek();
      } catch (error) {
        alert("Не удалось удалить блюдо: " + error.message);
      }
    });
  });
}

if (retryBtn) {
  retryBtn.addEventListener("click", authenticate);
}

document.querySelectorAll(".tile").forEach((button) => {
  button.addEventListener("click", async () => {
    const action = button.dataset.action;

    if (action === "inventory") {
      await showInventory();
      return;
    }

    if (action === "rules") {
      await showRules();
      return;
    }

    if (action === "week") {
      await showWeek();
      return;
    }

    const names = {
      shopping: "Покупки",
    };

    placeholder.innerHTML = `
      <h2>${names[action] || "Раздел"}</h2>
      <p>Подключим следующим этапом.</p>
    `;

    placeholder.classList.remove("hidden");
  });
});

authenticate();
