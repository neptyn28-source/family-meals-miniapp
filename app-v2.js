const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1uec0985MtG3wzW-FaXvdw_O2P3nLoZ";
const SUPABASE_FUNCTIONS = "https://vwapvcpodwvfzfmtoxhz.supabase.co/functions/v1";
const tg = window.Telegram?.WebApp;

const statusEl = document.querySelector("#status");
const authCard = document.querySelector("#authCard");
const authText = document.querySelector("#authText");
const retryBtn = document.querySelector("#retryBtn");
const home = document.querySelector("#home");
const hello = document.querySelector("#hello");
const placeholder = document.querySelector("#placeholder");

let initData = "";
let bootstrapData = null;
let activeWeekStart = getMonday(new Date());

if (tg) {
  tg.ready();
  tg.expand();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inputStyle(extra = "") {
  return [
    "width:100%",
    "padding:11px 12px",
    "border-radius:10px",
    "border:1px solid #555",
    "box-sizing:border-box",
    extra,
  ].filter(Boolean).join(";");
}

function buttonStyle(extra = "") {
  return [
    "padding:11px 14px",
    "border:0",
    "border-radius:10px",
    "font-weight:750",
    "cursor:pointer",
    extra,
  ].filter(Boolean).join(";");
}

function showPanel(html) {
  placeholder.classList.remove("hidden");
  placeholder.innerHTML = html;
  placeholder.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function callFunction(functionName, action, payload = {}) {
  if (!initData) throw new Error("Нет Telegram initData");

  const response = await fetch(`${SUPABASE_FUNCTIONS}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ initData, action, payload }),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok || !data.ok) {
    const error = new Error(data.message || data.error || `Ошибка сервера ${response.status}`);
    error.code = data.error || "api_error";
    error.status = response.status;
    error.issues = data.issues || [];
    throw error;
  }
  return data;
}

const api = (action, payload = {}) => callFunction("family-api", action, payload);
const aiApi = (action, payload = {}) => callFunction("ai-menu-api", action, payload);

function stateLabel(state) {
  return ({
    raw: "Сырое",
    cooked: "Готовое",
    semi_finished: "Полуфабрикат",
    frozen: "Замороженное",
    dry: "Сухое",
    canned: "Консервы",
  })[state] || state;
}

function goalLabel(goal) {
  return ({
    lose: "Снижение веса",
    maintain: "Поддержание",
    gain: "Набор веса",
  })[goal] || goal;
}

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

function defaultPlanningMonday() {
  const now = new Date();
  const monday = getMonday(now);
  if (now.getDay() === 0) return addDays(monday, 7);
  return monday;
}

function isoDate(value) {
  const d = new Date(value);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function shortDate(value) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(new Date(value));
}

function dayTitle(value) {
  const text = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(value));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function weekRange(start) {
  return `${shortDate(start)}–${shortDate(addDays(start, 6))}`;
}

function mealTypeLabel(type) {
  return ({
    breakfast: "Завтрак",
    snack1: "Перекус 1",
    lunch: "Обед",
    snack2: "Перекус 2",
    dinner: "Ужин",
  })[type] || type;
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${Math.round(n)} ₽` : "—";
}

function amount(value) {
  const n = Number(value || 0);
  if (Math.abs(n - Math.round(n)) < 0.001) return String(Math.round(n));
  return n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

async function authenticate() {
  retryBtn.hidden = true;
  statusEl.textContent = "Подключаем Telegram…";
  authText.textContent = "Проверяем пользователя и семейную базу.";
  initData = tg?.initData || "";

  if (!initData) {
    statusEl.textContent = "Открой приложение из Telegram";
    authText.textContent = "Обычная вкладка браузера не получает Telegram initData.";
    return;
  }

  try {
    bootstrapData = await api("bootstrap");
    statusEl.textContent = "Telegram подключён";
    hello.textContent = `Привет, ${bootstrapData.member?.name || bootstrapData.telegram_user?.first_name || "семья"}!`;
    authCard.classList.add("hidden");
    home.classList.remove("hidden");
    addInviteButton();
  } catch (error) {
    if (error.code === "not_invited") {
      showJoinFamily();
      return;
    }
    statusEl.textContent = "Не удалось войти";
    authText.textContent = error.message || "Ошибка авторизации";
    retryBtn.hidden = false;
  }
}

function showJoinFamily() {
  statusEl.textContent = "Подключение к семье";
  authCard.classList.remove("hidden");
  authCard.innerHTML = `
    <h2>Войти в семью</h2>
    <p>Введите семейный код приглашения.</p>
    <input id="familyCode" maxlength="6" autocomplete="off" placeholder="A7K9P2"
      style="${inputStyle("text-transform:uppercase")}">
    <button id="joinFamilyBtn" style="${buttonStyle("width:100%;margin-top:8px")}">Присоединиться</button>
    <p id="joinFamilyStatus"></p>
  `;

  const input = document.querySelector("#familyCode");
  const button = document.querySelector("#joinFamilyBtn");
  const message = document.querySelector("#joinFamilyStatus");

  input.addEventListener("input", () => {
    input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  });

  button.addEventListener("click", async () => {
    const code = input.value.trim().toUpperCase();
    if (code.length !== 6) {
      message.textContent = "Код должен состоять из 6 символов.";
      return;
    }
    button.disabled = true;
    message.textContent = "Подключаем…";
    try {
      await api("invite.join", { code });
      location.reload();
    } catch (error) {
      message.textContent = error.message;
      button.disabled = false;
    }
  });
}

function addInviteButton() {
  if (bootstrapData?.member?.role !== "husband" || document.querySelector("#inviteWifeBtn")) return;
  const card = hello.parentElement;
  const wrap = document.createElement("div");
  wrap.style.marginTop = "14px";
  wrap.innerHTML = `
    <button id="inviteWifeBtn" style="${buttonStyle("width:100%")}">Пригласить жену</button>
    <div id="inviteResult" style="margin-top:8px"></div>
  `;
  card.appendChild(wrap);
  document.querySelector("#inviteWifeBtn").addEventListener("click", createInvite);
}

async function createInvite() {
  const button = document.querySelector("#inviteWifeBtn");
  const result = document.querySelector("#inviteResult");
  button.disabled = true;
  result.textContent = "Создаём код…";
  try {
    const data = await api("invite.create");
    result.innerHTML = `
      <div class="subcard">
        <div style="font-size:12px;opacity:.7">Код приглашения</div>
        <div style="font-size:28px;font-weight:850;letter-spacing:4px">${escapeHtml(data.invite.code)}</div>
        <div style="font-size:12px;opacity:.7">Действует до ${escapeHtml(new Date(data.invite.expires_at).toLocaleString("ru-RU"))}</div>
      </div>
    `;
  } catch (error) {
    result.textContent = "Ошибка: " + error.message;
  } finally {
    button.disabled = false;
  }
}

async function showInventory() {
  showPanel(`
    <h2>Остатки</h2>
    <p>Записывай то, что реально есть дома. Готовое и сырое хранятся раздельно.</p>
    <div class="form-grid">
      <input id="invName" placeholder="Продукт" style="${inputStyle()}">
      <input id="invQty" type="number" min="0" step="0.01" placeholder="Количество" style="${inputStyle()}">
      <select id="invUnit" style="${inputStyle()}">
        <option value="g">г</option><option value="ml">мл</option><option value="pcs">шт</option>
      </select>
      <select id="invState" style="${inputStyle()}">
        <option value="raw">Сырое</option>
        <option value="frozen">Замороженное</option>
        <option value="cooked">Готовое</option>
        <option value="semi_finished">Полуфабрикат</option>
        <option value="dry">Сухое</option>
        <option value="canned">Консервы</option>
      </select>
      <label class="checkline"><input id="invUrgent" type="checkbox"> Использовать в первую очередь</label>
      <button id="invAdd" style="${buttonStyle()}">Добавить</button>
    </div>
    <div id="invStatus"></div>
    <div id="invList"></div>
  `);
  document.querySelector("#invAdd").addEventListener("click", addInventory);
  await loadInventory();
}

async function loadInventory() {
  const status = document.querySelector("#invStatus");
  const list = document.querySelector("#invList");
  status.textContent = "Загружаем…";
  try {
    const data = await api("inventory.list");
    status.textContent = `Позиций: ${data.items.length}`;
    list.innerHTML = data.items.length
      ? data.items.map((x) => `
          <div class="row-card">
            <div>
              <b>${escapeHtml(x.name)}</b>
              <div class="muted">${escapeHtml(amount(x.quantity))} ${escapeHtml(x.unit)} · ${escapeHtml(stateLabel(x.state))}${x.urgent ? " · срочно" : ""}</div>
            </div>
            <button data-inv-delete="${escapeHtml(x.id)}">×</button>
          </div>
        `).join("")
      : '<p>Остатков пока нет.</p>';

    list.querySelectorAll("[data-inv-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Удалить эту позицию?")) return;
        await api("inventory.delete", { id: button.dataset.invDelete });
        await loadInventory();
      });
    });
  } catch (error) {
    status.textContent = "Ошибка: " + error.message;
  }
}

async function addInventory() {
  const name = document.querySelector("#invName").value.trim();
  const quantity = Number(document.querySelector("#invQty").value);
  if (!name || !Number.isFinite(quantity) || quantity < 0) {
    alert("Укажи продукт и корректное количество.");
    return;
  }
  const button = document.querySelector("#invAdd");
  button.disabled = true;
  try {
    await api("inventory.add", {
      name,
      quantity,
      unit: document.querySelector("#invUnit").value,
      state: document.querySelector("#invState").value,
      urgent: document.querySelector("#invUrgent").checked,
    });
    document.querySelector("#invName").value = "";
    document.querySelector("#invQty").value = "";
    document.querySelector("#invUrgent").checked = false;
    await loadInventory();
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
  }
}

async function showRules() {
  showPanel(`
    <h2>Правила семьи</h2>
    <p>Сюда входят аллергии, запреты, нелюбимые продукты и вкусовые предпочтения. Они попадут в отчёт для ChatGPT.</p>
    <div class="form-grid">
      <select id="ruleType" style="${inputStyle()}">
        <option value="hard">Жёсткое правило</option>
        <option value="preference">Предпочтение</option>
        <option value="feedback">Наблюдение</option>
      </select>
      <textarea id="ruleText" rows="2" placeholder="Например: суп максимум раз в неделю" style="${inputStyle("resize:vertical")}"></textarea>
      <button id="ruleAdd" style="${buttonStyle()}">Добавить</button>
    </div>
    <div id="rulesStatus"></div>
    <div id="rulesList"></div>
  `);
  document.querySelector("#ruleAdd").addEventListener("click", addRule);
  await loadRules();
}

async function loadRules() {
  const status = document.querySelector("#rulesStatus");
  const list = document.querySelector("#rulesList");
  status.textContent = "Загружаем…";
  try {
    const data = await api("rules.list");
    const rules = data.rules || [];
    status.textContent = `Правил: ${rules.length}`;
    list.innerHTML = rules.map((r) => `
      <div class="row-card">
        <label style="display:flex;gap:10px;align-items:flex-start;flex:1">
          <input type="checkbox" data-rule-toggle="${escapeHtml(r.id)}" ${r.enabled ? "checked" : ""}>
          <span>
            <b>${escapeHtml(r.rule_type === "hard" ? "Жёсткое" : r.rule_type === "preference" ? "Предпочтение" : "Наблюдение")}</b>
            <div>${escapeHtml(r.description)}</div>
          </span>
        </label>
        <button data-rule-delete="${escapeHtml(r.id)}">×</button>
      </div>
    `).join("");

    list.querySelectorAll("[data-rule-toggle]").forEach((box) => {
      box.addEventListener("change", async () => {
        await api("rules.update", { id: box.dataset.ruleToggle, enabled: box.checked });
      });
    });
    list.querySelectorAll("[data-rule-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Убрать это правило?")) return;
        await api("rules.delete", { id: button.dataset.ruleDelete });
        await loadRules();
      });
    });
  } catch (error) {
    status.textContent = "Ошибка: " + error.message;
  }
}

async function addRule() {
  const text = document.querySelector("#ruleText").value.trim();
  if (!text) return;
  const button = document.querySelector("#ruleAdd");
  button.disabled = true;
  try {
    await api("rules.add", {
      rule_type: document.querySelector("#ruleType").value,
      description: text,
    });
    document.querySelector("#ruleText").value = "";
    await loadRules();
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
  }
}

async function showProfile() {
  showPanel(`
    <h2>Вес и цели</h2>
    <p>Эти данные не определяют меню автоматически. Они уходят в отчёт для ChatGPT, чтобы порции подбирались осмысленно.</p>
    <div id="profileStatus">Загружаем…</div>
    <div id="profileForm"></div>
  `);
  const status = document.querySelector("#profileStatus");
  const form = document.querySelector("#profileForm");

  try {
    const [profileData, settingsData] = await Promise.all([
      aiApi("profile.get"),
      api("settings.get"),
    ]);
    status.textContent = "";
    const p = profileData.profile;
    const family = settingsData.family || {};

    form.innerHTML = `
      <div class="profile-grid">
        ${personProfileHtml("husband", "Муж", p.husband)}
        ${personProfileHtml("wife", "Жена", p.wife)}
      </div>

      <div class="subcard" style="margin-top:12px">
        <h3 style="margin-top:0">Ребёнок</h3>
        <label>Возраст, лет
          <input id="childAge" type="number" min="0" max="18" step="0.1" value="${escapeHtml(p.child?.age_years ?? "")}" style="${inputStyle("margin-top:4px")}">
        </label>
      </div>

      <div class="subcard" style="margin-top:12px">
        <h3 style="margin-top:0">Режим недели</h3>
        <label>Бюджет на неделю, ₽
          <input id="familyBudget" type="number" min="1" step="100" value="${escapeHtml(family.budget_weekly ?? 8000)}" style="${inputStyle("margin-top:4px")}">
        </label>
        <label>Перекусов у жены в день
          <select id="wifeSnacks" style="${inputStyle("margin-top:4px")}">
            ${[0,1,2].map((x) => `<option value="${x}" ${Number(settingsData.settings?.wife_snacks ?? 2) === x ? "selected" : ""}>${x}</option>`).join("")}
          </select>
        </label>
        <label>Перекусов у мужа в день
          <select id="husbandSnacks" style="${inputStyle("margin-top:4px")}">
            ${[0,1,2].map((x) => `<option value="${x}" ${Number(settingsData.settings?.husband_snacks ?? 0) === x ? "selected" : ""}>${x}</option>`).join("")}
          </select>
        </label>
      </div>

      <button id="profileSave" style="${buttonStyle("width:100%;margin-top:12px")}">Сохранить</button>
      <div id="profileSaveStatus" class="muted" style="margin-top:8px"></div>
    `;

    document.querySelector("#profileSave").addEventListener("click", saveProfile);
  } catch (error) {
    status.textContent = "Ошибка: " + error.message;
  }
}

function personProfileHtml(key, label, data) {
  return `
    <div class="subcard">
      <h3 style="margin-top:0">${label}</h3>
      <label>Вес, кг
        <input id="${key}Weight" type="number" min="1" max="400" step="0.1" value="${escapeHtml(data?.weight_kg ?? "")}" style="${inputStyle("margin-top:4px")}">
      </label>
      <label>Рост, см <span class="muted">(необязательно)</span>
        <input id="${key}Height" type="number" min="50" max="260" step="0.1" value="${escapeHtml(data?.height_cm ?? "")}" style="${inputStyle("margin-top:4px")}">
      </label>
      <label>Цель
        <select id="${key}Goal" style="${inputStyle("margin-top:4px")}">
          <option value="lose" ${data?.goal === "lose" ? "selected" : ""}>Снижение веса</option>
          <option value="maintain" ${data?.goal === "maintain" ? "selected" : ""}>Поддержание</option>
          <option value="gain" ${data?.goal === "gain" ? "selected" : ""}>Набор веса</option>
        </select>
      </label>
    </div>
  `;
}

async function saveProfile() {
  const save = document.querySelector("#profileSave");
  const status = document.querySelector("#profileSaveStatus");
  const val = (id) => document.querySelector(id).value;
  const numOrNull = (id) => val(id) === "" ? null : Number(val(id));

  save.disabled = true;
  status.textContent = "Сохраняем…";
  try {
    await Promise.all([
      aiApi("profile.update", {
        husband: {
          weight_kg: numOrNull("#husbandWeight"),
          height_cm: numOrNull("#husbandHeight"),
          goal: val("#husbandGoal"),
        },
        wife: {
          weight_kg: numOrNull("#wifeWeight"),
          height_cm: numOrNull("#wifeHeight"),
          goal: val("#wifeGoal"),
        },
        child: { age_years: numOrNull("#childAge") },
      }),
      api("settings.update", {
        settings: {
          weekly_budget_rub: Number(val("#familyBudget")),
          wife_snacks: Number(val("#wifeSnacks")),
          husband_snacks: Number(val("#husbandSnacks")),
        },
      }),
    ]);
    status.textContent = "Сохранено.";
  } catch (error) {
    status.textContent = "Ошибка: " + error.message;
  } finally {
    save.disabled = false;
  }
}

function weekChooser(prefix, title, subtitle) {
  return `
    <h2>${title}</h2>
    <p>${subtitle}</p>
    <div class="week-nav">
      <button id="${prefix}Prev">←</button>
      <div style="text-align:center"><b id="${prefix}Range">${weekRange(activeWeekStart)}</b></div>
      <button id="${prefix}Next">→</button>
    </div>
  `;
}

function bindWeekNav(prefix, rerender) {
  document.querySelector(`#${prefix}Prev`).addEventListener("click", () => {
    activeWeekStart = addDays(activeWeekStart, -7);
    rerender();
  });
  document.querySelector(`#${prefix}Next`).addEventListener("click", () => {
    activeWeekStart = addDays(activeWeekStart, 7);
    rerender();
  });
}

async function showAiExport() {
  showPanel(
    weekChooser("export", "Выгрузить в ИИ", "Бот соберёт один готовый промт: остатки, отзывы, правила, вес, цели, бюджет и технический формат для обратной вставки.") +
    `
      <button id="buildAiPrompt" style="${buttonStyle("width:100%;margin-top:12px")}">Собрать отчёт для ChatGPT</button>
      <div id="exportStatus" class="muted" style="margin-top:8px"></div>
      <div id="exportResult"></div>
    `
  );
  bindWeekNav("export", showAiExport);
  document.querySelector("#buildAiPrompt").addEventListener("click", buildAiPrompt);
}

async function buildAiPrompt() {
  const button = document.querySelector("#buildAiPrompt");
  const status = document.querySelector("#exportStatus");
  const result = document.querySelector("#exportResult");
  button.disabled = true;
  status.textContent = "Собираем данные семьи…";
  result.innerHTML = "";
  try {
    const data = await aiApi("ai.export", { week_start: isoDate(activeWeekStart) });
    result.innerHTML = `
      <div class="subcard" style="margin-top:12px">
        <div style="display:flex;gap:8px;align-items:center;justify-content:space-between">
          <b>Готовый промт</b>
          <button id="copyAiPrompt">Копировать</button>
        </div>
        <textarea id="aiPromptText" rows="18" readonly style="${inputStyle("margin-top:8px;resize:vertical;font-family:ui-monospace,monospace;font-size:12px")}">${escapeHtml(data.prompt)}</textarea>
        <p class="muted">Скопируй целиком и отправь мне в ChatGPT. Я верну обычное меню + JSON в конце.</p>
      </div>
    `;
    status.textContent = `Формат меню: ${data.menu_format}`;
    document.querySelector("#copyAiPrompt").addEventListener("click", async () => {
      const text = document.querySelector("#aiPromptText").value;
      try {
        await navigator.clipboard.writeText(text);
        document.querySelector("#copyAiPrompt").textContent = "Скопировано";
      } catch {
        document.querySelector("#aiPromptText").select();
      }
    });
  } catch (error) {
    status.textContent = "Ошибка: " + error.message;
  } finally {
    button.disabled = false;
  }
}

async function showAiImport() {
  showPanel(`
    <h2>Вставить меню из ИИ</h2>
    <p>Вставь мой ответ целиком. Бот сам найдёт JSON-блок, проверит 7 дней/35 слотов и только после этого посчитает покупки.</p>
    <textarea id="aiImportText" rows="18" placeholder="Вставь сюда ответ ChatGPT…" style="${inputStyle("resize:vertical;font-family:ui-monospace,monospace;font-size:12px")}"></textarea>
    <button id="aiImportBtn" style="${buttonStyle("width:100%;margin-top:10px")}">Импортировать меню и посчитать покупки</button>
    <div id="aiImportStatus" style="margin-top:10px"></div>
  `);
  document.querySelector("#aiImportBtn").addEventListener("click", importAiMenu);
}

async function importAiMenu() {
  const text = document.querySelector("#aiImportText").value.trim();
  const button = document.querySelector("#aiImportBtn");
  const status = document.querySelector("#aiImportStatus");
  if (!text) {
    status.textContent = "Сначала вставь ответ ChatGPT.";
    return;
  }
  button.disabled = true;
  status.textContent = "Проверяем JSON и считаем покупки…";
  try {
    const data = await aiApi("ai.import", { text });
    activeWeekStart = new Date(data.week.week_start + "T12:00:00");
    status.innerHTML = `
      <div class="success-box">
        <b>Меню импортировано.</b><br>
        Приёмов пищи: ${escapeHtml(data.imported_meals)} · готовок: ${escapeHtml(data.cook_blocks)}<br>
        Покупки: ${escapeHtml(money(data.shopping.estimated_cost_rub))} · ${escapeHtml(
          data.shopping.budget_status === "within" ? "в бюджете" :
          data.shopping.budget_status === "over" ? "выше бюджета" : "бюджет не подтверждён"
        )}
        ${data.shopping.unpriced_count ? ` · без цены: ${escapeHtml(data.shopping.unpriced_count)}` : ""}
        <div style="display:flex;gap:8px;margin-top:10px">
          <button id="openImportedWeek">Открыть меню</button>
          <button id="openImportedShopping">Открыть покупки</button>
        </div>
      </div>
    `;
    document.querySelector("#openImportedWeek").addEventListener("click", showWeek);
    document.querySelector("#openImportedShopping").addEventListener("click", showShopping);
  } catch (error) {
    const issues = Array.isArray(error.issues) && error.issues.length
      ? "<ul>" + error.issues.slice(0, 12).map((x) => `<li>${escapeHtml(x)}</li>`).join("") + "</ul>"
      : "";
    status.innerHTML = `<div class="error-box"><b>Не импортировано.</b><br>${escapeHtml(error.message)}${issues}</div>`;
  } finally {
    button.disabled = false;
  }
}

async function showWeek() {
  showPanel(
    weekChooser("menu", "Меню недели", "Это меню, которое ты вставил из ChatGPT. Бот здесь ничего не придумывает.") +
    '<div id="menuStatus" class="muted">Загружаем…</div><div id="menuContent"></div>'
  );
  bindWeekNav("menu", showWeek);
  const status = document.querySelector("#menuStatus");
  const content = document.querySelector("#menuContent");
  try {
    const data = await api("week.get", { week_start: isoDate(activeWeekStart) });
    const meals = data.meals || [];
    status.innerHTML = `${escapeHtml(weekRange(activeWeekStart))} · ${escapeHtml(data.week.ai_import_version ? "импорт из ChatGPT" : "старое меню")} ${data.week.estimated_cost != null ? "· " + escapeHtml(money(data.week.estimated_cost)) : ""}`;
    if (!meals.length) {
      content.innerHTML = '<p>Меню ещё не импортировано. Используй «Выгрузить в ИИ» → ChatGPT → «Вставить меню из ИИ».</p>';
      return;
    }

    const bySlot = new Map(meals.map((m) => [`${m.meal_date}|${m.meal_type}`, m]));
    let html = "";
    for (let i = 0; i < 7; i++) {
      const date = addDays(activeWeekStart, i);
      const dateIso = isoDate(date);
      html += `<section class="day-section"><h3>${escapeHtml(dayTitle(date))}</h3>`;
      for (const type of ["breakfast","snack1","lunch","snack2","dinner"]) {
        const meal = bySlot.get(`${dateIso}|${type}`);
        html += `
          <div class="meal-row">
            <div class="meal-label">${escapeHtml(mealTypeLabel(type))}</div>
            <div>
              ${meal ? `<b>${escapeHtml(meal.title)}</b>${mealDetails(meal)}` : '<span class="muted">Не заполнено</span>'}
            </div>
          </div>
        `;
      }
      html += "</section>";
    }
    content.innerHTML = html;
  } catch (error) {
    status.textContent = "Ошибка: " + error.message;
  }
}

function mealDetails(meal) {
  const portions = meal.portions || {};
  const portionComponents = meal.portion_components || {};
  const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients : [];
  const recipe = meal.recipe || {};
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];

  const roleLine = (role, label) => {
    const components = Array.isArray(portionComponents[role]) ? portionComponents[role] : [];
    const summary = portions[role] || "";
    if (components.length) {
      const parts = components.map((x) =>
        escapeHtml(x.name) + " — " + escapeHtml(amount(x.amount)) + " " + escapeHtml(x.unit)
      ).join("; ");
      return "<li><b>" + label + ":</b> " + parts +
        (summary ? "<div class=\"muted\" style=\"margin-top:3px\">" + escapeHtml(summary) + "</div>" : "") +
        "</li>";
    }
    return summary ? "<li><b>" + label + ":</b> " + escapeHtml(summary) + "</li>" : "";
  };

  const portionHtml = [
    roleLine("husband", "Муж"),
    roleLine("wife", "Жена"),
    roleLine("child", "Ребёнок"),
  ].filter(Boolean).join("");

  if (!portionHtml && !ingredients.length && !steps.length && !meal.notes) return "";

  return `
    <details>
      <summary>Подробнее</summary>
      <div class="details-body">
        ${portionHtml ? `
          <b>Порции по составляющим</b>
          <ul>${portionHtml}</ul>
        ` : ""}
        ${ingredients.length ? `
          <b>Ингредиенты на всю готовку</b>
          <ul>${ingredients.map((x) => `<li>${escapeHtml(x.name)} — ${escapeHtml(amount(x.amount))} ${escapeHtml(x.unit)}</li>`).join("")}</ul>
        ` : ""}
        ${steps.length ? `<b>Как готовить</b><ol>${steps.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ol>` : ""}
        ${recipe.ready_output ? `<p><b>Выход:</b> ${escapeHtml(recipe.ready_output)}</p>` : ""}
        ${recipe.child_adaptation ? `<p><b>Ребёнку:</b> ${escapeHtml(recipe.child_adaptation)}</p>` : ""}
        ${recipe.seasoning ? `<p><b>Соль/специи:</b> ${escapeHtml(recipe.seasoning)}</p>` : ""}
        ${meal.notes ? `<p class="muted">${escapeHtml(meal.notes)}</p>` : ""}
      </div>
    </details>
  `;
}

async function showShopping() {
  showPanel(
    weekChooser("shop", "Покупки", "Покупки разделены на два захода: воскресенье и четверг. Бот вычитает остатки и переносит лишнее из упаковок в следующую закупку.") +
    '<div id="shopStatus" class="muted">Загружаем…</div><div id="shopContent"></div>'
  );
  bindWeekNav("shop", showShopping);
  const status = document.querySelector("#shopStatus");
  const content = document.querySelector("#shopContent");

  try {
    const weekData = await api("week.get", { week_start: isoDate(activeWeekStart) });
    const data = await api("shopping.list", { week_id: weekData.week.id });
    const items = data.items || [];
    status.textContent = `${weekRange(activeWeekStart)} · ${weekData.week.estimated_cost != null ? money(weekData.week.estimated_cost) : "стоимость не рассчитана"} · ${weekData.week.budget_status || "—"}`;

    if (!items.length) {
      content.innerHTML = '<p>Список покупок появится после импорта меню из ChatGPT.</p>';
      return;
    }

    const need = items.filter((x) => Number(x.to_buy) > 0.0001);
    const covered = items.filter((x) => Number(x.to_buy) <= 0.0001);

    const fallbackDate = (trip) =>
      isoDate(addDays(activeWeekStart, trip === "thursday" ? 3 : -1));
    const tripTitle = (trip, rows) => {
      const iso = rows.find((x) => x.purchase_on)?.purchase_on || fallbackDate(trip);
      const date = new Date(iso + "T12:00:00");
      const formatted = new Intl.DateTimeFormat("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(date);
      const nice = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      return (trip === "sunday" ? "Закупка 1 · " : "Закупка 2 · ") + nice;
    };

    const rowHtml = (x) => `
      <label class="shopping-row">
        <input type="checkbox" data-shop="${escapeHtml(x.id)}" ${x.purchased ? "checked" : ""}>
        <span>
          <b>${escapeHtml(x.product_name)}</b><br>
          нужно ${escapeHtml(amount(x.to_buy))} ${escapeHtml(x.unit)}
          ${x.packages != null ? ` · ${escapeHtml(x.packages)} уп.` : ""}
          ${x.purchase_quantity != null ? ` · купить ${escapeHtml(amount(x.purchase_quantity))} ${escapeHtml(x.unit)}` : ""}
          <br><span class="muted">
            покрыто до этой закупки ${escapeHtml(amount(x.home_quantity))} ${escapeHtml(x.unit)}
            ${x.store ? ` · ${escapeHtml(x.store)}` : ""}
            ${x.estimated_price != null ? ` · ≈${escapeHtml(money(x.estimated_price))}` : " · цена неизвестна"}
          </span>
        </span>
      </label>
    `;

    const tripCard = (trip) => {
      const rows = need.filter((x) => (x.shopping_trip === "thursday" ? "thursday" : "sunday") === trip);
      const knownCost = rows.reduce((sum, x) => sum + (Number(x.estimated_price) || 0), 0);
      return `
        <div class="subcard" style="margin-bottom:12px">
          <h3 style="margin-top:0">${escapeHtml(tripTitle(trip, rows))}</h3>
          <div class="muted" style="margin-bottom:8px">
            ${rows.length ? `${rows.length} поз. · ≈${escapeHtml(money(knownCost))}` : "На этот заход покупать ничего не нужно"}
          </div>
          ${rows.map(rowHtml).join("")}
        </div>
      `;
    };

    content.innerHTML = `
      ${tripCard("sunday")}
      ${tripCard("thursday")}
      ${covered.length ? `
        <details class="subcard" style="margin-top:12px">
          <summary>Полностью покрыто остатками/ранней закупкой · ${covered.length}</summary>
          ${covered.map((x) => `<div class="muted" style="padding:6px 0">${escapeHtml(x.product_name)} — ${escapeHtml(amount(x.required_quantity))} ${escapeHtml(x.unit)}</div>`).join("")}
        </details>
      ` : ""}
    `;

    content.querySelectorAll("[data-shop]").forEach((box) => {
      box.addEventListener("change", async () => {
        box.disabled = true;
        try {
          await api("shopping.purchase", { id: box.dataset.shop, purchased: box.checked });
        } catch (error) {
          box.checked = !box.checked;
          alert(error.message);
        } finally {
          box.disabled = false;
        }
      });
    });
  } catch (error) {
    status.textContent = "Ошибка: " + error.message;
  }
}

async function showFeedback() {
  showPanel(
    weekChooser("fb", "Отзывы", "Заполняй вкус, размер порции, сытость и комментарии. Следующая выгрузка в ChatGPT включит эти данные.") +
    '<div id="fbStatus" class="muted">Загружаем…</div><div id="fbContent"></div>'
  );
  bindWeekNav("fb", showFeedback);
  const status = document.querySelector("#fbStatus");
  const content = document.querySelector("#fbContent");

  try {
    const weekData = await api("week.get", { week_start: isoDate(activeWeekStart) });
    const data = await api("feedback.list", { week_id: weekData.week.id });
    const meals = weekData.meals || [];
    const people = (data.members || []).filter((m) => ["husband","wife"].includes(m.role));
    const saved = new Map((data.feedback || []).map((x) => [`${x.meal_id}|${x.member_id}`, x]));

    status.textContent = `${weekRange(activeWeekStart)} · блюд: ${meals.length}`;
    if (!meals.length) {
      content.innerHTML = "<p>Для этой недели ещё нет меню.</p>";
      return;
    }

    content.innerHTML = meals.map((meal) => `
      <details class="feedback-meal">
        <summary><b>${escapeHtml(meal.meal_date)}</b> · ${escapeHtml(mealTypeLabel(meal.meal_type))} · ${escapeHtml(meal.title)}</summary>
        <div class="feedback-grid">
          ${people.map((person) => feedbackForm(meal, person, saved.get(`${meal.id}|${person.id}`) || {})).join("")}
        </div>
      </details>
    `).join("");

    content.querySelectorAll("[data-feedback-save]").forEach((button) => {
      button.addEventListener("click", saveFeedback);
    });
  } catch (error) {
    status.textContent = "Ошибка: " + error.message;
  }
}

function feedbackForm(meal, person, x) {
  const key = `${meal.id}|${person.id}`;
  return `
    <div class="subcard" data-feedback-box="${escapeHtml(key)}">
      <b>${escapeHtml(person.role === "wife" ? "Жена" : "Муж")} · ${escapeHtml(person.name)}</b>
      <select data-f="taste" style="${inputStyle("margin-top:7px")}">
        <option value="">Вкус — не оценён</option>
        <option value="liked" ${x.taste === "liked" ? "selected" : ""}>👍 понравилось</option>
        <option value="neutral" ${x.taste === "neutral" ? "selected" : ""}>😐 нормально</option>
        <option value="disliked" ${x.taste === "disliked" ? "selected" : ""}>👎 не понравилось</option>
      </select>
      <select data-f="portion" style="${inputStyle("margin-top:7px")}">
        <option value="">Порция — не оценена</option>
        <option value="too_little" ${x.portion === "too_little" ? "selected" : ""}>мало</option>
        <option value="ok" ${x.portion === "ok" ? "selected" : ""}>нормально</option>
        <option value="too_much" ${x.portion === "too_much" ? "selected" : ""}>много</option>
      </select>
      <label>Сытость 0–10
        <input data-f="satiety" type="number" min="0" max="10" value="${escapeHtml(x.satiety ?? "")}" style="${inputStyle("margin-top:4px")}">
      </label>
      <label class="checkline"><input data-f="snack_eaten" type="checkbox" ${x.snack_eaten ? "checked" : ""}> перекус съеден</label>
      <label class="checkline"><input data-f="strong_hunger" type="checkbox" ${x.strong_hunger ? "checked" : ""}> был сильный голод</label>
      <label class="checkline"><input data-f="leftovers" type="checkbox" ${x.leftovers ? "checked" : ""}> осталась еда</label>
      <select data-f="action" style="${inputStyle()}">
        <option value="">Частота — без изменения</option>
        <option value="more_often" ${x.action === "more_often" ? "selected" : ""}>готовить чаще</option>
        <option value="less_often" ${x.action === "less_often" ? "selected" : ""}>готовить реже</option>
        <option value="never" ${x.action === "never" ? "selected" : ""}>больше не предлагать</option>
      </select>
      <textarea data-f="comment" rows="2" placeholder="Комментарий" style="${inputStyle("resize:vertical")}">${escapeHtml(x.comment || "")}</textarea>
      <button data-feedback-save="${escapeHtml(key)}">Сохранить отзыв</button>
      <span data-feedback-status class="muted"></span>
    </div>
  `;
}

async function saveFeedback(event) {
  const button = event.currentTarget;
  const [mealId, memberId] = button.dataset.feedbackSave.split("|");
  const box = document.querySelector(`[data-feedback-box="${mealId}|${memberId}"]`);
  const get = (name) => box.querySelector(`[data-f="${name}"]`);
  const status = box.querySelector("[data-feedback-status]");
  button.disabled = true;
  status.textContent = "Сохраняем…";
  try {
    await api("feedback.save", {
      meal_id: mealId,
      member_id: memberId,
      taste: get("taste").value || null,
      portion: get("portion").value || null,
      satiety: get("satiety").value === "" ? null : Number(get("satiety").value),
      snack_eaten: get("snack_eaten").checked,
      strong_hunger: get("strong_hunger").checked,
      leftovers: get("leftovers").checked,
      action: get("action").value || null,
      comment: get("comment").value.trim() || null,
    });
    status.textContent = "Сохранено";
  } catch (error) {
    status.textContent = "Ошибка: " + error.message;
  } finally {
    button.disabled = false;
  }
}

document.querySelectorAll(".tile").forEach((button) => {
  button.addEventListener("click", async () => {
    const action = button.dataset.action;
    if (action === "inventory") return showInventory();
    if (action === "rules") return showRules();
    if (action === "profile") return showProfile();
    if (action === "feedback") {
      activeWeekStart = getMonday(new Date());
      return showFeedback();
    }
    if (action === "ai-export") {
      activeWeekStart = defaultPlanningMonday();
      return showAiExport();
    }
    if (action === "ai-import") return showAiImport();
    if (action === "week") {
      activeWeekStart = defaultPlanningMonday();
      return showWeek();
    }
    if (action === "shopping") {
      activeWeekStart = defaultPlanningMonday();
      return showShopping();
    }
  });
});

retryBtn.addEventListener("click", authenticate);
authenticate();
