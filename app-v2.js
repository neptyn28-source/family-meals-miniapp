const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1uec0985MtG3wzW-FaXvdw_O2P3nLoZ";
const SUPABASE_FUNCTIONS = "https://vwapvcpodwvfzfmtoxhz.supabase.co/functions/v1";
const tg = window.Telegram?.WebApp;

// ---------- Каркас приложения: шапка, экран, нижнее меню ----------
// Строим его здесь, а не в index.html: Telegram может показать старую страницу из кэша,
// а этот скрипт загружается заново всегда.
const BUDGET_URL = "./family-budget/?v=20261108";
const FITNESS_URL = "./fitness/?v=20261110";
const TABS = {
  today: { icon: "☀️", label: "Сегодня" },
  menu: { icon: "🍽️", label: "Меню", title: "Меню и покупки" },
  home: { icon: "🥬", label: "Дом", title: "Дом" },
  budget: { icon: "💰", label: "Бюджет", title: "Бюджет" },
  things: { icon: "🔎", label: "Вещи", title: "Вещи" },
};
const TAB_ORDER = Object.keys(TABS);

(function buildShell() {
  // свежая таблица стилей, мимо кэша Telegram
  const css = document.querySelector('link[rel="stylesheet"][href^="styles.css"]');
  const fresh = document.createElement("link");
  fresh.rel = "stylesheet";
  fresh.href = "styles.css?v=" + Date.now();
  if (css) css.replaceWith(fresh); else document.head.appendChild(fresh);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#0b1411");

  const app = document.querySelector("main.app") || document.body.appendChild(Object.assign(document.createElement("main"), { className: "app" }));
  app.innerHTML = `
    <header class="topbar"><div class="eyebrow" id="topEyebrow"></div><h1 id="topTitle">ДОМА</h1></header>
    <section id="authCard" class="card auth">
      <div class="logo" aria-hidden="true">🏡</div>
      <h2 id="status">Подключаем Telegram…</h2>
      <p id="authText">Проверяем пользователя через Telegram.</p>
      <button id="retryBtn" hidden>Повторить</button>
    </section>
    <section id="placeholder" class="view hidden" aria-live="polite"></section>
    <nav class="tabbar hidden" id="tabbar" aria-label="Разделы">
      <span class="tab-pill" aria-hidden="true"></span>
      ${TAB_ORDER.map((id) => `<button class="tab" data-tab="${id}" aria-label="${TABS[id].label}"><i aria-hidden="true">${TABS[id].icon}</i>${TABS[id].label}</button>`).join("")}
    </nav>`;
})();

const statusEl = document.querySelector("#status");
const authCard = document.querySelector("#authCard");
const authText = document.querySelector("#authText");
const retryBtn = document.querySelector("#retryBtn");
const placeholder = document.querySelector("#placeholder");
const tabbar = document.querySelector("#tabbar");

let initData = "";
let bootstrapData = null;
let activeWeekStart = getMonday(new Date());
let editingInventoryId = null;
let nav = { tab: "today", root: true, sub: "plan" };
let budgetFrame = null;
let fitnessFrame = null;

// Фитнес-план жены — отдельная страница fitness/ (дневник хранится в браузере телефона), открываем поверх «Дома».
function showFitness() {
  stopCookingTimer();
  placeholder.classList.add("hidden");
  if (!fitnessFrame) {
    fitnessFrame = document.createElement("iframe");
    fitnessFrame.className = "budget-frame";
    fitnessFrame.title = "Фитнес-план";
    fitnessFrame.src = FITNESS_URL;
    document.body.appendChild(fitnessFrame);
  } else {
    try { fitnessFrame.contentWindow?.fitnessSync?.(); } catch {}
  }
  fitnessFrame.classList.remove("hidden");
  updateBackButton();
}
window.addEventListener("message", (e) => {
  if (e.origin === location.origin && e.data?.type === "fitness-back") goBack();
});
// Страница плана в iframe того же сайта ходит в базу через бота: initData есть только здесь.
window.DomaFitness = {
  load: () => api("fitness.get"),
  save: (state) => api("fitness.save", { state }),
};

if (tg) {
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor?.("#0b1411"); } catch {}
  try { tg.setBackgroundColor?.("#0b1411"); } catch {}
  try { tg.setBottomBarColor?.("#0b1411"); } catch {}
  tg.BackButton?.onClick?.(() => goBack());
}

function haptic(kind = "select") {
  try {
    if (kind === "select") tg?.HapticFeedback?.selectionChanged?.();
    else tg?.HapticFeedback?.impactOccurred?.(kind);
  } catch {}
}

// Диалоги Telegram вместо браузерных alert/confirm: в WebView они выглядят чужими, а местами не работают.
function tgDialogs() {
  try { return Boolean(tg?.isVersionAtLeast?.("6.2") && tg.showConfirm && tg.showAlert); } catch { return false; }
}

function askConfirm(text) {
  if (!tgDialogs()) return Promise.resolve(window.confirm(text));
  return new Promise((resolve) => {
    try { tg.showConfirm(text, (ok) => resolve(Boolean(ok))); } catch { resolve(window.confirm(text)); }
  });
}

function notify(text) {
  const msg = String(text || "Что-то пошло не так").slice(0, 400);
  if (!tgDialogs()) { window.alert(msg); return; }
  try { tg.showAlert(msg); } catch { window.alert(msg); }
}

const BUDGET_STATUS = { within: "в бюджете", over: "выше бюджета", unverified: "бюджет не подтверждён" };
const budgetStatusText = (v) => BUDGET_STATUS[v] || "бюджет не подтверждён";

const hasTab = (tab) => typeof tab === "string" && Object.prototype.hasOwnProperty.call(TABS, tab);

function memberName() {
  return bootstrapData?.member?.name || bootstrapData?.telegram_user?.first_name || "";
}

function setTopbar(tab) {
  const today = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  document.querySelector("#topEyebrow").textContent = today;
  const name = memberName();
  document.querySelector("#topTitle").innerHTML = tab === "today"
    ? escapeHtml(name ? `Привет, ${name}` : "Сегодня") + ' <span class="spark" aria-hidden="true">✦</span>'
    : escapeHtml(TABS[tab].title);
}

function markTab(tab) {
  const index = TAB_ORDER.indexOf(tab);
  tabbar.querySelectorAll(".tab").forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle("on", on);
    if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  tabbar.querySelector(".tab-pill").style.transform = `translateX(${index * 100}%)`;
  document.body.dataset.tab = tab;
  setTopbar(tab);
}

function updateBackButton() {
  const showBack = !nav.root && nav.tab !== "budget";
  document.body.classList.toggle("is-sub", showBack);
  try { showBack ? tg?.BackButton?.show?.() : tg?.BackButton?.hide?.(); } catch {}
}

function goTab(tab, { silent = false } = {}) {
  if (!hasTab(tab)) tab = "today";
  if (!silent) haptic();
  nav = { ...nav, tab, root: true };
  markTab(tab);
  updateBackButton();
  fitnessFrame?.classList.add("hidden");
  if (tab === "budget") {
    stopCookingTimer();
    if (!budgetFrame) {
      budgetFrame = document.createElement("iframe");
      budgetFrame.className = "budget-frame";
      budgetFrame.title = "Семейный бюджет";
      budgetFrame.src = BUDGET_URL;
      document.body.appendChild(budgetFrame);
    }
    budgetFrame.classList.remove("hidden");
    return;
  }
  budgetFrame?.classList.add("hidden");
  if (tab === "today") return showToday();
  if (tab === "menu" || tab === "home") return renderHub(tab);
  if (tab === "things") return thingsScreen();
}

function thingsScreen(opts) {
  if (nav.sub === "put") return showIntake();
  if (nav.sub === "find") return showWhereThings();
  return showPlan(opts);
}

// Открыть вложенный экран вкладки (с кнопкой «назад»).
function openSub(tab, run) {
  if (nav.tab !== tab) markTab(tab);
  budgetFrame?.classList.add("hidden");
  nav = { ...nav, tab, root: false };
  haptic("light");
  run();
}

function goBack() {
  if (nav.root) return;
  if (nav.tab === "things" && nav.sub === "plan" && window.WmsPlan?.back()) return;
  placeholder.classList.add("back");
  goTab(nav.tab, { silent: true });
  setTimeout(() => placeholder.classList.remove("back"), 450);
}

function panelChrome() {
  if (nav.tab === "things") {
    const segs = [["plan", "🗺 План"], ["find", "🔎 Найти"], ["put", "📥 Положить"]];
    const at = Math.max(0, segs.findIndex(([id]) => id === nav.sub));
    return `<div class="segmented three s${at}" role="tablist"><span class="seg-pill" aria-hidden="true"></span>` +
      segs.map(([id, label], i) => `<button data-seg="${id}" class="${i === at ? "on" : ""}" role="tab" aria-selected="${i === at}">${label}</button>`).join("") +
      "</div>";
  }
  if (!nav.root && TABS[nav.tab]) {
    return `<button class="backbar" data-back><span aria-hidden="true">‹</span>${escapeHtml(TABS[nav.tab].label)}</button>`;
  }
  return "";
}

function bindPanelChrome() {
  placeholder.querySelector("[data-back]")?.addEventListener("click", goBack);
  placeholder.querySelectorAll("[data-seg]").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.seg === nav.sub) return;
    haptic();
    nav.root = true;
    nav.sub = b.dataset.seg;
    thingsScreen();
  }));
}

// Индикатор загрузки вместо голого «Загружаем…»
const LOADING_RE = /^(Загруж|Подключ|Смотрю|Сохраня|Создаём|Проверя|Считаю|Собира|Импортиру|Ищу)/;
let loadingScan = 0;
function scanLoading() {
  loadingScan = 0;
  placeholder.querySelectorAll("div,p,span").forEach((el) => {
    const on = el.childElementCount === 0 && LOADING_RE.test(el.textContent.trim());
    if (on !== el.classList.contains("is-loading")) el.classList.toggle("is-loading", on);
  });
}
new MutationObserver(() => { if (!loadingScan) loadingScan = requestAnimationFrame(scanLoading); })
  .observe(placeholder, { childList: true, subtree: true, characterData: true });

function skeleton(count = 3, small = false) {
  return Array.from({ length: count }, () => `<div class="skeleton${small ? " sm" : ""}" aria-hidden="true"></div>`).join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Внешний вид полей и кнопок задаёт styles.css; здесь остаются только частные правки экрана.
function inputStyle(extra = "") {
  return extra;
}

function buttonStyle(extra = "") {
  return extra;
}

function showPanel(html) {
  stopCookingTimer();
  placeholder.classList.remove("hidden");
  placeholder.innerHTML = panelChrome() + '<div class="screen">' + html + "</div>";
  bindPanelChrome();
  updateBackButton();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function renderHub(tab) {
  const weekly = (run) => () => { activeWeekStart = defaultPlanningMonday(); run(); };
  const groups = tab === "menu" ? [
    ["Неделя", [
      { icon: "🍽️", title: "Меню недели", text: "Блюда, порции и рецепты по дням", run: weekly(showWeek) },
      { icon: "🛒", title: "Покупки", text: "Два захода: воскресенье и четверг", run: weekly(showShopping) },
      { icon: "⭐", title: "Отзывы на блюда", text: "Вкус, порция, сытость — учтём в новом меню", run: () => { activeWeekStart = getMonday(new Date()); showFeedback(); } },
    ]],
    ["Новое меню", [
      { icon: "✨", title: "Создать меню", text: "Готовый запрос для ChatGPT", accent: true, run: weekly(showAiExport) },
      { icon: "📥", title: "Загрузить меню", text: "Вставить ответ ChatGPT и посчитать покупки", run: showAiImport },
      { icon: "🔄", title: "Заменить блюдо", text: "Ручная замена в меню недели", run: showMealReplacement },
    ]],
  ] : [
    ["Кухня", [
      { icon: "🥬", title: "Остатки", text: "Что реально есть дома", run: showInventory },
      { icon: "❤️", title: "Правила семьи", text: "Аллергии, запреты, предпочтения", run: showRules },
      { icon: "🎯", title: "Вес и цели", text: "Муж, жена, ребёнок и бюджет на еду", run: showProfile },
    ]],
    ["Здоровье", [
      { icon: "🏋️‍♀️", title: "Фитнес-план", text: "Тренировки DDX, техника и дневник прогресса", run: showFitness },
    ]],
    ...(bootstrapData?.member?.role === "husband" ? [["Семья", [
      { icon: "💌", title: "Пригласить жену", text: "Код, чтобы подключиться к семье", run: showInvite },
    ]]] : []),
  ];
  const items = groups.flatMap(([, list]) => list);
  showPanel(groups.map(([name, list]) =>
    '<div class="hub-group">' + escapeHtml(name) + '</div><div class="hub-list">' + list.map((item) =>
      '<button class="hub-item' + (item.accent ? " accent" : "") + '" data-hub="' + items.indexOf(item) + '">' +
      '<span class="hub-icon" aria-hidden="true">' + item.icon + "</span><span><b>" + escapeHtml(item.title) + "</b><small>" +
      escapeHtml(item.text) + '</small></span><span class="chev" aria-hidden="true">›</span></button>').join("") + "</div>").join(""));
  placeholder.querySelectorAll("[data-hub]").forEach((b) => b.addEventListener("click", () => openSub(tab, items[Number(b.dataset.hub)].run)));
}

function showInvite() {
  showPanel('<h2>💌 Пригласить жену</h2><p>Создай код и отправь его жене. Она откроет бота и введёт код — у вас будет общая семейная база.</p>' +
    '<button id="inviteWifeBtn" style="width:100%">Создать код приглашения</button><div id="inviteResult" style="margin-top:8px"></div>');
  document.querySelector("#inviteWifeBtn").addEventListener("click", createInvite);
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
const wmsApi = (action, payload = {}) => callFunction("home-wms-api", action, payload);

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
    authCard.classList.add("hidden");
    tabbar.classList.remove("hidden");
    goTab(startTab(), { silent: true });
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

// Вкладку можно открыть ссылкой: ?tab=menu (например, из бюджета).
function startTab() {
  const tab = new URLSearchParams(location.search).get("tab");
  return hasTab(tab) ? tab : "today";
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
  editingInventoryId = null;
  showPanel(`
    <h2>Остатки</h2>
    <p>Записывай фактическое состояние продукта. Если остаток нельзя подавать напрямую, отметь «только в готовку» — это попадёт в отчёт для ChatGPT и будет учитываться при расчёте покупок.</p>
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
      <select id="invUsageMode" style="${inputStyle()}">
        <option value="any">Можно использовать обычно</option>
        <option value="cooking_only">Только в готовку — напрямую не подавать</option>
      </select>
      <textarea id="invNote" rows="2" placeholder="Заметка, например: старый кефир — не пить, только в выпечку/оладьи" style="${inputStyle("resize:vertical")}"></textarea>
      <label class="checkline"><input id="invUrgent" type="checkbox"> Использовать в первую очередь</label>
      <label class="checkline"><input id="invOpened" type="checkbox"> Упаковка открыта</label>
      <div style="display:flex;gap:8px">
        <button id="invAdd" style="${buttonStyle("flex:1")}">Добавить</button>
        <button id="invCancelEdit" hidden>Отмена</button>
      </div>
    </div>
    <div id="invStatus"></div>
    <div id="invList"></div>
  `);
  document.querySelector("#invAdd").addEventListener("click", saveInventoryItem);
  document.querySelector("#invCancelEdit").addEventListener("click", resetInventoryForm);
  await loadInventory();
}

function usageModeLabel(mode) {
  return mode === "cooking_only" ? "только в готовку" : "обычно";
}

function resetInventoryForm() {
  editingInventoryId = null;
  document.querySelector("#invName").value = "";
  document.querySelector("#invQty").value = "";
  document.querySelector("#invUnit").value = "g";
  document.querySelector("#invState").value = "raw";
  document.querySelector("#invUsageMode").value = "any";
  document.querySelector("#invNote").value = "";
  document.querySelector("#invUrgent").checked = false;
  document.querySelector("#invOpened").checked = false;
  document.querySelector("#invAdd").textContent = "Добавить";
  document.querySelector("#invCancelEdit").hidden = true;
}

async function loadInventory() {
  const status = document.querySelector("#invStatus");
  const list = document.querySelector("#invList");
  status.textContent = "Загружаем…";
  try {
    const data = await api("inventory.list");
    const urgentCount = data.items.filter((x) => x.urgent).length;
    const openedCount = data.items.filter((x) => x.opened).length;
    status.textContent = `В холодильнике: ${data.items.length} поз. · Срочно использовать: ${urgentCount} · Открыто: ${openedCount}`;
    list.innerHTML = data.items.length
      ? data.items.map((x) => `
          <div class="row-card">
            <div style="flex:1">
              <b>${escapeHtml(x.name)}</b>
              <div class="muted">
                ${escapeHtml(amount(x.quantity))} ${escapeHtml(x.unit)} ·
                ${escapeHtml(stateLabel(x.state))} ·
                ${escapeHtml(usageModeLabel(x.usage_mode))}
                ${x.urgent ? " · срочно" : ""}
                ${x.opened ? " · открыто" : ""}
              </div>
              ${x.note ? `<div style="margin-top:4px">${escapeHtml(x.note)}</div>` : ""}
            </div>
            <div style="display:flex;gap:6px">
              <button data-inv-edit="${escapeHtml(x.id)}">✎</button>
              <button data-inv-delete="${escapeHtml(x.id)}">×</button>
            </div>
          </div>
        `).join("")
      : '<p>Остатков пока нет.</p>';

    const byId = new Map(data.items.map((x) => [String(x.id), x]));
    list.querySelectorAll("[data-inv-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const x = byId.get(button.dataset.invEdit);
        if (!x) return;
        editingInventoryId = String(x.id);
        document.querySelector("#invName").value = x.name || "";
        document.querySelector("#invQty").value = x.quantity ?? "";
        document.querySelector("#invUnit").value = x.unit || "g";
        document.querySelector("#invState").value = x.state || "raw";
        document.querySelector("#invUsageMode").value = x.usage_mode || "any";
        document.querySelector("#invNote").value = x.note || "";
        document.querySelector("#invUrgent").checked = Boolean(x.urgent);
        document.querySelector("#invOpened").checked = Boolean(x.opened);
        document.querySelector("#invAdd").textContent = "Сохранить изменения";
        document.querySelector("#invCancelEdit").hidden = false;
        document.querySelector("#invName").scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    list.querySelectorAll("[data-inv-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!(await askConfirm("Удалить эту позицию?"))) return;
        button.disabled = true;
        try {
          await api("inventory.delete", { id: button.dataset.invDelete });
          if (editingInventoryId === button.dataset.invDelete) resetInventoryForm();
          await loadInventory();
        } catch (error) {
          button.disabled = false;
          notify("Не удалилось: " + error.message);
        }
      });
    });
  } catch (error) {
    status.textContent = "Ошибка: " + error.message;
  }
}

async function saveInventoryItem() {
  const name = document.querySelector("#invName").value.trim();
  const quantity = Number(document.querySelector("#invQty").value);
  if (!name || !Number.isFinite(quantity) || quantity < 0) {
    notify("Укажи продукт и корректное количество.");
    return;
  }
  const button = document.querySelector("#invAdd");
  button.disabled = true;
  const payload = {
    name,
    quantity,
    unit: document.querySelector("#invUnit").value,
    state: document.querySelector("#invState").value,
    usage_mode: document.querySelector("#invUsageMode").value,
    note: document.querySelector("#invNote").value.trim() || null,
    urgent: document.querySelector("#invUrgent").checked,
    opened: document.querySelector("#invOpened").checked,
  };
  try {
    if (editingInventoryId) {
      await api("inventory.update", { id: editingInventoryId, ...payload });
    } else {
      await api("inventory.add", payload);
    }
    resetInventoryForm();
    await loadInventory();
  } catch (error) {
    notify(error.message);
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
        box.disabled = true;
        try {
          await api("rules.update", { id: box.dataset.ruleToggle, enabled: box.checked });
        } catch (error) {
          box.checked = !box.checked;
          notify("Не сохранилось: " + error.message);
        } finally {
          box.disabled = false;
        }
      });
    });
    list.querySelectorAll("[data-rule-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!(await askConfirm("Убрать это правило?"))) return;
        button.disabled = true;
        try {
          await api("rules.delete", { id: button.dataset.ruleDelete });
          await loadRules();
        } catch (error) {
          button.disabled = false;
          notify("Не удалилось: " + error.message);
        }
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
    notify(error.message);
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
      <h4>Расчёт нормы калорий</h4>
      <label>Возраст, лет <input id="${key}Age" type="number" min="18" max="100" value="${escapeHtml(data?.age_years ?? "")}" style="${inputStyle("margin-top:4px")}"></label>
      <label>Активность <select id="${key}Activity" style="${inputStyle("margin-top:4px")}">
        ${[["","Не указана"],["sedentary","Сидячая"],["moderate","Умеренная"],["high","Высокая"]].map(([v,t])=>`<option value="${v}" ${data?.activity === v ? "selected" : ""}>${t}</option>`).join("")}
      </select></label>
      <label>Шагов в день <input id="${key}Steps" type="number" min="0" max="50000" step="100" value="${escapeHtml(data?.steps_per_day ?? "")}" style="${inputStyle("margin-top:4px")}"></label>
      <label>Тренировок в неделю <select id="${key}Training" style="${inputStyle("margin-top:4px")}">
        ${[["","Не указано"],["0","Нет"],["1-2","1–2"],["3-4","3–4"],["5+","5 и более"]].map(([v,t])=>`<option value="${v}" ${data?.training_frequency === v ? "selected" : ""}>${t}</option>`).join("")}
      </select></label>
      <label>Темп похудения <select id="${key}Pace" style="${inputStyle("margin-top:4px")}">
        <option value="moderate" ${data?.weight_loss_pace !== "faster" ? "selected" : ""}>Умеренный</option>
        <option value="faster" ${data?.weight_loss_pace === "faster" ? "selected" : ""}>Ускоренный (без экстремального дефицита)</option>
      </select></label>
      <label>Особые обстоятельства <select id="${key}Special" style="${inputStyle("margin-top:4px")}">
        ${[["","Нет / не указаны"],["pregnancy_lactation","Беременность / грудное вскармливание"],["medical","Медицинские ограничения"]].map(([v,t])=>`<option value="${v}" ${data?.special_circumstances === v ? "selected" : ""}>${t}</option>`).join("")}
      </select></label>
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
          age_years: numOrNull("#husbandAge"),
          activity: val("#husbandActivity"),
          steps_per_day: numOrNull("#husbandSteps"),
          training_frequency: val("#husbandTraining"),
          weight_loss_pace: val("#husbandPace"),
          special_circumstances: val("#husbandSpecial"),
        },
        wife: {
          weight_kg: numOrNull("#wifeWeight"),
          height_cm: numOrNull("#wifeHeight"),
          goal: val("#wifeGoal"),
          age_years: numOrNull("#wifeAge"),
          activity: val("#wifeActivity"),
          steps_per_day: numOrNull("#wifeSteps"),
          training_frequency: val("#wifeTraining"),
          weight_loss_pace: val("#wifePace"),
          special_circumstances: val("#wifeSpecial"),
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
budgetStatusText(data.shopping.budget_status))}
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
    status.textContent = `${weekRange(activeWeekStart)} · ${weekData.week.estimated_cost != null ? money(weekData.week.estimated_cost) : "стоимость не рассчитана"} · ${weekData.week.budget_status ? budgetStatusText(weekData.week.budget_status) : "—"}`;

    if (!items.length) {
      content.innerHTML = '<p>Список покупок появится после импорта меню из ChatGPT.</p>';
      return;
    }

    const need = items.filter((x) => Number(x.to_buy) > 0.0001);
    const purchasedCount = need.filter((x) => x.purchased).length;
    const knownBudget = Number(weekData.week.estimated_cost);
    const budgetText = Number.isFinite(knownBudget) && weekData.week.estimated_cost != null
      ? " · План: " + money(knownBudget) : "";
    const progress = document.createElement("div");
    progress.className = "shopping-progress";
    progress.innerHTML = '<div id="shopProgressText" aria-live="polite"></div><progress id="shopProgress" max="' + Math.max(need.length, 1) + '" value="' + purchasedCount + '"></progress><div class="muted">Отмечай купленное — список сохранится для всей семьи.' + escapeHtml(budgetText) + '</div>';
    content.before(progress);
    const progressLabel = progress.querySelector("#shopProgressText");
    const progressBar = progress.querySelector("#shopProgress");
    const updateProgress = () => {
      const checked = content.querySelectorAll('[data-shop]:checked').length;
      progressLabel.textContent = "Куплено " + checked + " из " + need.length + " позиций";
      progressBar.value = checked;
    };
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

    const mealLabel = {
      breakfast: "завтрак",
      snack1: "перекус 1",
      lunch: "обед",
      snack2: "перекус 2",
      dinner: "ужин",
    };
    const mealOrder = { breakfast: 10, snack1: 20, lunch: 30, snack2: 40, dinner: 50 };
    const dayLabel = (iso) => {
      const names = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
      const d = new Date(String(iso) + "T12:00:00Z");
      return Number.isNaN(d.getTime()) ? String(iso) : names[d.getUTCDay()];
    };
    const usageText = (x) => {
      const rows = Array.isArray(x.used_for) ? x.used_for : [];
      return rows
        .slice()
        .sort((a, b) => String(a.date).localeCompare(String(b.date)) || (mealOrder[a.meal_type] || 99) - (mealOrder[b.meal_type] || 99))
        .map((u) => dayLabel(u.date) + " " + (mealLabel[u.meal_type] || u.meal_type))
        .join(" · ");
    };

    const rowHtml = (x) => {
      const buyQuantity = x.purchase_quantity != null ? x.purchase_quantity : x.to_buy;
      const usage = usageText(x);
      return `
      <label class="shopping-row">
        <input type="checkbox" data-shop="${escapeHtml(x.id)}" ${x.purchased ? "checked" : ""}>
        <span>
          <b>${escapeHtml(x.product_name)}</b><br>
          <b>Купить ${escapeHtml(amount(buyQuantity))} ${escapeHtml(x.unit)}</b>
          ${x.packages != null ? ` · ${escapeHtml(x.packages)} уп.` : ""}
          <br><span class="muted">
            ${x.store ? escapeHtml(x.store) : "магазин не указан"}
            ${x.estimated_price != null ? ` · ≈${escapeHtml(money(x.estimated_price))}` : " · цена неизвестна"}
          </span>
          ${usage ? `<br><span class="muted">Куда: ${escapeHtml(usage)}</span>` : ""}
        </span>
      </label>
    `;
    };

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
    `;

    updateProgress();
    content.querySelectorAll("[data-shop]").forEach((box) => {
      box.addEventListener("change", async () => {
        box.disabled = true;
        try {
          await api("shopping.purchase", { id: box.dataset.shop, purchased: box.checked });
          updateProgress();
        } catch (error) {
          box.checked = !box.checked;
          updateProgress();
          notify(error.message);
        } finally {
          box.disabled = false;
        }
      });
    });
  } catch (error) {
    status.textContent = "Ошибка: " + error.message;
  }
}

// Отзывы на блюда: каждое блюдо недели — один раз, одна оценка от того, кто открыл бот.
// Блюдо, приготовленное на два дня, не повторяется. Оценка сохраняется сразу по нажатию
// и пишется на первое появление блюда в неделе (или туда, где уже лежит прежняя оценка) —
// так ChatGPT видит одну строку на блюдо.
const FB_CHOICES = {
  taste: [["liked", "👍", "Вкусно"], ["neutral", "😐", "Нормально"], ["disliked", "👎", "Не понравилось"]],
  portion: [["too_little", "", "Мало"], ["ok", "", "В самый раз"], ["too_much", "", "Много"]],
  action: [["more_often", "", "Готовить чаще"], ["less_often", "", "Реже"], ["never", "", "Больше не предлагать"]],
};

function dishGroups(meals) {
  const groups = new Map();
  [...meals].sort((x, y) => String(x.meal_date).localeCompare(String(y.meal_date))).forEach((meal) => {
    const title = String(meal.title || "").trim();
    if (!title) return;
    const key = title.toLowerCase() + "|" + (meal.recipe_key ?? "");
    if (!groups.has(key)) groups.set(key, { title, meals: [] });
    groups.get(key).meals.push(meal);
  });
  return [...groups.values()];
}

function shortDay(value) {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(new Date(String(value).slice(0, 10) + "T12:00:00"));
}

async function showFeedback() {
  showPanel(
    weekChooser("fb", "Отзывы на блюда", "Оцени блюда недели — следующее меню из ChatGPT учтёт твои оценки. Каждое блюдо один раз, сохраняется сразу.") +
    '<div id="fbStatus" class="muted">Загружаем…</div><div id="fbContent"></div>'
  );
  bindWeekNav("fb", showFeedback);
  const status = document.querySelector("#fbStatus");
  const content = document.querySelector("#fbContent");
  const me = bootstrapData?.member;

  try {
    const weekData = await api("week.get", { week_start: isoDate(activeWeekStart) });
    const data = await api("feedback.list", { week_id: weekData.week.id });
    if (!status.isConnected) return;
    const dishes = dishGroups(weekData.meals || []);
    const mine = (data.feedback || []).filter((x) => String(x.member_id) === String(me?.id));
    dishes.forEach((dish) => {
      const ids = new Set(dish.meals.map((m) => String(m.id)));
      dish.saved = { ...(mine.find((x) => ids.has(String(x.meal_id))) || {}) };
    });

    if (!dishes.length) {
      status.textContent = weekRange(activeWeekStart);
      content.innerHTML = "<p>Для этой недели ещё нет меню.</p>";
      return;
    }
    const drawStatus = () => {
      const rated = dishes.filter((d) => d.saved.taste).length;
      status.textContent = `${weekRange(activeWeekStart)} · оценено ${rated} из ${dishes.length}` + (me?.name ? ` · оценивает ${me.name}` : "");
    };
    drawStatus();

    const chips = (field, x, i) => '<div class="fb-chips' + (field === "taste" ? " fb-taste" : "") + '">' + FB_CHOICES[field].map(([value, icon, label]) =>
      '<button type="button" class="fb-chip' + (x[field] === value ? " on" : "") + '" data-dish="' + i + '" data-field="' + field + '" data-value="' + value + '">' +
      (icon ? '<span aria-hidden="true">' + icon + "</span>" : "") + escapeHtml(label) + "</button>").join("") + "</div>";

    content.innerHTML = dishes.map((dish, i) => {
      const x = dish.saved;
      const days = [...new Set(dish.meals.map((m) => shortDay(m.meal_date)))].join(", ");
      const types = [...new Set(dish.meals.map((m) => mealTypeLabel(m.meal_type)))].join(", ");
      return '<article class="fb-dish' + (x.taste ? " rated" : "") + '" data-dish-card="' + i + '">' +
        '<div class="fb-head"><div><b>' + escapeHtml(dish.title) + '</b><small>' + escapeHtml(types + " · " + days) + '</small></div><span class="fb-done" aria-hidden="true">✓</span></div>' +
        chips("taste", x, i) +
        '<details class="fb-more"' + (x.portion || x.action || x.comment ? " open" : "") + '><summary>Порция, частота, комментарий</summary>' +
        '<div class="fb-label">Порция</div>' + chips("portion", x, i) +
        '<div class="fb-label">Как часто готовить</div>' + chips("action", x, i) +
        '<textarea rows="2" maxlength="2000" data-dish-comment="' + i + '" placeholder="Комментарий, например: меньше соли">' + escapeHtml(x.comment || "") + "</textarea>" +
        "</details>" +
        '<div class="fb-save muted" data-dish-status="' + i + '" role="status"></div></article>';
    }).join("");

    const save = async (i) => {
      const dish = dishes[i];
      const line = content.querySelector('[data-dish-status="' + i + '"]');
      const card = content.querySelector('[data-dish-card="' + i + '"]');
      line.textContent = "Сохраняем…";
      try {
        await api("feedback.save", {
          meal_id: dish.saved.meal_id || dish.meals[0].id, // старую оценку обновляем на месте, без дубля
          member_id: me?.id,
          taste: dish.saved.taste || null,
          portion: dish.saved.portion || null,
          action: dish.saved.action || null,
          comment: (dish.saved.comment || "").trim() || null,
        });
        if (!line.isConnected) return;
        line.textContent = "Сохранено ✓";
        card.classList.toggle("rated", Boolean(dish.saved.taste));
        drawStatus();
        haptic("light");
      } catch (error) {
        if (line.isConnected) line.textContent = "Не сохранилось: " + error.message;
      }
    };

    content.querySelectorAll(".fb-chip").forEach((btn) => btn.addEventListener("click", () => {
      const i = Number(btn.dataset.dish);
      const field = btn.dataset.field;
      const dish = dishes[i];
      dish.saved[field] = dish.saved[field] === btn.dataset.value ? null : btn.dataset.value; // повторное нажатие снимает выбор
      content.querySelectorAll('.fb-chip[data-dish="' + i + '"][data-field="' + field + '"]').forEach((b) =>
        b.classList.toggle("on", b.dataset.value === dish.saved[field]));
      save(i);
    }));
    content.querySelectorAll("[data-dish-comment]").forEach((area) => area.addEventListener("change", () => {
      const i = Number(area.dataset.dishComment);
      dishes[i].saved.comment = area.value;
      save(i);
    }));
  } catch (error) {
    if (status.isConnected) status.textContent = "Ошибка: " + error.message;
  }
}


const todayMealOrder = ["breakfast", "snack1", "lunch", "snack2", "dinner"];

async function showToday() {
  const today = isoDate(new Date());
  activeWeekStart = getMonday(new Date());
  showPanel('<p class="lead">Меню на сегодня. Открой блюдо, чтобы посмотреть порции или начать готовить.</p><div id="todayContent">' + skeleton(3) + '</div>');
  const target = document.querySelector("#todayContent");
  try {
    const data = await api("week.get", { week_start: isoDate(activeWeekStart) });
    if (!target.isConnected) return;
    const meals = (data.meals || []).filter((m) => String(m.meal_date).slice(0, 10) === today);
    if (!meals.length) {
      target.innerHTML = '<div class="card"><h3 style="margin-top:0">На сегодня меню пока нет</h3><p>Создай меню через ChatGPT и загрузи его — здесь появятся блюда дня.</p><button id="todayWeekBtn" style="width:100%">✨ Создать меню</button></div>';
      document.querySelector("#todayWeekBtn").addEventListener("click", () => openSub("menu", () => { activeWeekStart = defaultPlanningMonday(); showAiExport(); }));
      return;
    }
    const byType = new Map(meals.map((m) => [m.meal_type, m]));
    target.innerHTML = todayMealOrder.map((type) => {
      const m = byType.get(type);
      if (!m) return '<article class="today-meal empty"><div class="muted">' + escapeHtml(mealTypeLabel(type)) + '</div><span>—</span></article>';
      const steps = Array.isArray(m.recipe?.steps) ? m.recipe.steps : [];
      const key = today + "|" + type;
      return '<article class="today-meal"><div class="muted">' + escapeHtml(mealTypeLabel(type)) + '</div><h3>' + escapeHtml(m.title) + '</h3>' +
        mealDetails(m) + (steps.length ? '<button class="cook-open" data-cook="' + escapeHtml(key) + '">👩‍🍳 Готовить по шагам</button>' : '') + '</article>';
    }).join("") + '<button id="todayRate" class="today-rate btn-ghost">⭐ Оценить блюда</button>';
    document.querySelector("#todayRate").addEventListener("click", () => openSub("menu", () => { activeWeekStart = getMonday(new Date()); showFeedback(); }));
    target.querySelectorAll("[data-cook]").forEach((btn) => btn.addEventListener("click", () => {
      const type = btn.dataset.cook.split("|")[1];
      const meal = byType.get(type);
      if (meal) showCookingMode(meal);
    }));
  } catch (error) {
    if (target.isConnected) target.textContent = "Не удалось загрузить меню: " + error.message;
  }
}


let cookingTimerInterval = null;
let cookingTimerDeadline = 0;
let cookingTimerRemaining = 300;
function stopCookingTimer() {
  if (cookingTimerInterval !== null) clearInterval(cookingTimerInterval);
  cookingTimerInterval = null;
  cookingTimerDeadline = 0;
}
function bindCookingTimer() {
  const clock = document.querySelector("#cookTimerClock");
  const message = document.querySelector("#cookTimerStatus");
  if (!clock || !message) return;
  const display = () => {
    const seconds = Math.max(0, Math.ceil(cookingTimerRemaining));
    clock.textContent = String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
  };
  const tick = () => {
    if (!clock.isConnected) { stopCookingTimer(); return; }
    cookingTimerRemaining = Math.max(0, Math.ceil((cookingTimerDeadline - Date.now()) / 1000));
    display();
    if (cookingTimerRemaining === 0) {
      stopCookingTimer();
      message.textContent = "Время вышло! Проверь блюдо.";
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");
    }
  };
  document.querySelectorAll("[data-timer-min]").forEach((button) => button.addEventListener("click", () => {
    stopCookingTimer();
    cookingTimerRemaining = Number(button.dataset.timerMin) * 60;
    message.textContent = "Время выбрано. Нажми «Старт».";
    display();
  }));
  document.querySelector("#timerStart").addEventListener("click", () => {
    if (cookingTimerInterval !== null || cookingTimerRemaining <= 0) return;
    cookingTimerDeadline = Date.now() + cookingTimerRemaining * 1000;
    cookingTimerInterval = setInterval(tick, 500);
    message.textContent = "Идёт отсчёт.";
  });
  document.querySelector("#timerPause").addEventListener("click", () => {
    if (cookingTimerInterval === null) return;
    tick();
    stopCookingTimer();
    message.textContent = "Пауза.";
  });
  document.querySelector("#timerReset").addEventListener("click", () => {
    stopCookingTimer();
    cookingTimerRemaining = 300;
    message.textContent = "Таймер сброшен.";
    display();
  });
  display();
}

function showCookingMode(meal) {
  const recipe = meal.recipe || {};
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  if (!steps.length) return;
  let index = 0;
  stopCookingTimer();
  const timerMarkup = '<div class="cook-timer subcard"><b>⏱ Таймер готовки</b><div id="cookTimerClock" role="timer" aria-live="off">05:00</div><div class="cook-timer-buttons"><button data-timer-min="5">5 мин</button><button data-timer-min="10">10 мин</button><button data-timer-min="15">15 мин</button><button data-timer-min="30">30 мин</button></div><div class="cook-timer-buttons"><button id="timerStart">Старт</button><button id="timerPause">Пауза</button><button id="timerReset">Сброс</button></div><div id="cookTimerStatus" class="muted" aria-live="polite">Таймер работает, пока открыт рецепт.</div></div>';
  showPanel('<div class="cook-mode"><button id="cookBack">← К сегодняшнему меню</button><h2>' + escapeHtml(meal.title) + '</h2><div id="cookProgress" class="muted"></div><div id="cookStep" class="cook-step" aria-live="polite"></div><div class="cook-controls"><button id="cookPrev">← Назад</button><button id="cookNext">Далее →</button></div>' + timerMarkup + '<div class="subcard"><h3>Ингредиенты на всю готовку</h3><ul>' + (Array.isArray(meal.ingredients) ? meal.ingredients.map((x) => '<li>' + escapeHtml(x.name) + ' — ' + escapeHtml(amount(x.amount)) + ' ' + escapeHtml(x.unit) + '</li>').join("") : "") + '</ul></div>' + (recipe.child_adaptation ? '<p><b>Ребёнку:</b> ' + escapeHtml(recipe.child_adaptation) + '</p>' : '') + '</div>');
  const render = () => {
    document.querySelector("#cookProgress").textContent = "Шаг " + (index + 1) + " из " + steps.length;
    const stepEl = document.querySelector("#cookStep");
    stepEl.textContent = steps[index];
    stepEl.style.animation = "none"; void stepEl.offsetWidth; stepEl.style.animation = "";
    document.querySelector("#cookPrev").disabled = index === 0;
    document.querySelector("#cookNext").textContent = index === steps.length - 1 ? "Готово ✓" : "Далее →";
  };
  bindCookingTimer();
  document.querySelector("#cookBack").addEventListener("click", () => { stopCookingTimer(); showToday(); });
  document.querySelector("#cookPrev").addEventListener("click", () => { if (index > 0) { index--; render(); } });
  document.querySelector("#cookNext").addEventListener("click", () => { if (index < steps.length - 1) { index++; render(); } else { stopCookingTimer(); showToday(); } });
  render();
}


async function showMealReplacement() {
  activeWeekStart = defaultPlanningMonday();
  showPanel(weekChooser("replace", "🔄 Замена блюда", "Ручная замена меняет название блюда, удаляет его старый рецепт и сбрасывает проверку бюджета. После замены нужно пересобрать меню и покупки.") + '<div id="replaceStatus" class="muted">Загружаем…</div><div id="replaceContent"></div>');
  bindWeekNav("replace", showMealReplacementForWeek);
  await loadMealReplacement();
}
async function showMealReplacementForWeek() { await loadMealReplacement(); }
let replaceSeq = 0;
async function loadMealReplacement() {
  const status = document.querySelector("#replaceStatus");
  const content = document.querySelector("#replaceContent");
  if (!status || !content) return;
  // Быстро листают недели — ответ про старую неделю не должен перезаписать новую.
  const seq = ++replaceSeq;
  status.textContent = "Загружаем…";
  try {
    const data = await api("week.get", { week_start: isoDate(activeWeekStart) });
    if (!status.isConnected || seq !== replaceSeq) return;
    const meals = data.meals || [];
    status.textContent = weekRange(activeWeekStart) + " · " + meals.length + " блюд";
    if (!meals.length) { content.innerHTML = "<p>Сначала загрузи меню на эту неделю.</p>"; return; }
    content.innerHTML = '<div class="form-grid"><label for="replaceMeal">Что заменить</label><select id="replaceMeal" style="' + inputStyle() + '">' + meals.map((m,i) => '<option value="' + i + '">' + escapeHtml(m.meal_date) + ' · ' + escapeHtml(mealTypeLabel(m.meal_type)) + ' · ' + escapeHtml(m.title) + '</option>').join("") + '</select><label for="replaceTitle">Новое блюдо</label><input id="replaceTitle" maxlength="160" placeholder="Название нового блюда" style="' + inputStyle() + '"><p class="muted">Важно: это ручная правка без рецепта и пересчёта ингредиентов. Воскресенье остаётся днём кафе.</p><button id="replaceSave" class="cook-open">Заменить и сбросить проверку недели</button><div id="replaceResult" role="status"></div></div>';
    const button = document.querySelector("#replaceSave");
    button.addEventListener("click", async () => {
      const meal = meals[Number(document.querySelector("#replaceMeal").value)];
      const title = document.querySelector("#replaceTitle").value.trim();
      const result = document.querySelector("#replaceResult");
      if (!meal || !title) { result.textContent = "Выбери блюдо и введи название."; return; }
      if (new Date(String(meal.meal_date).slice(0,10) + "T12:00:00").getDay() === 0) { result.textContent = "Воскресенье — кафе, домашние блюда здесь не меняем."; return; }
      if (!(await askConfirm("Рецепт и ингредиенты будут очищены, а бюджет и проверки недели сброшены. Продолжить?"))) return;
      button.disabled = true;
      result.textContent = "Сохраняем…";
      try {
        await api("week.meal.save", { week_id: data.week.id, meal_date: String(meal.meal_date).slice(0,10), meal_type: meal.meal_type, title });
        result.textContent = "Замена сохранена. Обязательно пересобери меню и список покупок.";
      } catch (error) { result.textContent = "Ошибка: " + error.message; }
      finally { button.disabled = false; }
    });
  } catch (error) { if (status.isConnected && seq === replaceSeq) status.textContent = "Ошибка: " + error.message; }
}

const WMS_ZONES = {
  hot: { icon: "🔥", text: "под рукой" },
  warm: { icon: "🙂", text: "дотянуться" },
  cold: { icon: "❄️", text: "далеко" },
};
const WMS_USAGE = { daily: "каждый день", weekly: "раз в неделю", monthly: "раз в месяц", rare: "редко" };

function wmsSearchText(value) {
  return String(value ?? "").toLowerCase().replaceAll("ё", "е");
}

function wmsPlaceText(place) {
  if (!place) return "📋 Не разложено";
  return place.location + " · " + place.module;
}

function wmsItemCard(item) {
  const place = item.place;
  const zone = place ? WMS_ZONES[place.zone] : null;
  const shelf = place
    ? escapeHtml(place.shelf) + " · " + escapeHtml(place.heightFromFloor) + " см от пола" +
      (zone ? ' · <span title="' + escapeHtml(zone.text) + '">' + zone.icon + " " + escapeHtml(zone.text) + "</span>" : "")
    : "Ещё не разложено — выберите место, когда будет удобно";
  const meta = [item.category, WMS_USAGE[item.usage]].filter(Boolean).map(escapeHtml).join(" · ");
  return '<article class="row-card"><div><b>' + escapeHtml(item.name) + (item.quantity > 1 ? " × " + escapeHtml(item.quantity) : "") +
    '</b><div class="muted">' + shelf + "</div>" + (meta ? '<div class="muted">' + meta + "</div>" : "") + "</div>" +
    '<div style="display:flex;gap:6px;flex-shrink:0">' +
    (place ? '<button class="btn-ghost" data-plan-item="' + escapeHtml(item.id) + '" aria-label="Показать на плане">🗺</button>' : "") +
    '<button class="' + (place ? "btn-ghost" : "cook-open") + '" data-place-item="' + escapeHtml(item.id) + '">' + (place ? "Переложить" : "Разложить") + "</button></div></article>";
}

// План квартиры живёт в wms-plan.js: грузим его один раз и мимо кэша Telegram, как и этот файл.
let wmsPlanScript = null;
function loadWmsPlan() {
  if (window.WmsPlan) return Promise.resolve();
  wmsPlanScript ||= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "wms-plan.js?v=" + Date.now();
    s.onload = () => resolve();
    s.onerror = () => { wmsPlanScript = null; reject(new Error("Не загрузился экран плана, проверьте интернет")); };
    document.head.appendChild(s);
  });
  return wmsPlanScript;
}

async function showPlan(opts = {}) {
  nav.sub = "plan";
  if (nav.tab !== "things") { markTab("things"); budgetFrame?.classList.add("hidden"); }
  nav.root = true;
  showPanel('<div id="wmsPlanRoot">' + skeleton(2) + "</div>");
  const box = document.querySelector("#wmsPlanRoot");
  try {
    await loadWmsPlan();
  } catch (error) {
    if (box.isConnected) box.innerHTML = '<p>' + escapeHtml(error.message) + '</p><button id="wmsPlanRetry">Повторить</button>';
    box.querySelector("#wmsPlanRetry")?.addEventListener("click", () => showPlan(opts));
    return;
  }
  if (!box.isConnected) return;
  window.WmsPlan.mount(box, {
    api: wmsApi,
    esc: escapeHtml,
    haptic,
    onDepth(depth) {
      if (nav.tab !== "things" || nav.sub !== "plan") return;
      nav.root = depth === 0;
      updateBackButton();
    },
  }, opts);
}

async function showWhereThings() {
  nav.sub = "find";
  if (nav.tab !== "things") { markTab("things"); budgetFrame?.classList.add("hidden"); }
  nav.root = true;
  showPanel('<h2>🔎 Где что лежит</h2><p>Поиск вещей по комнатам, шкафам и полкам.</p>' +
    '<input id="wmsSearch" type="search" placeholder="Например: аптечка, носки, крупы" autocomplete="off" style="' + inputStyle() + '">' +
    '<div id="wmsCategories" style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0"></div>' +
    '<div id="wmsResult" class="muted">Загружаем вещи…</div>');
  const result = document.querySelector("#wmsResult");
  let items = [];
  try {
    items = (await wmsApi("wms.items.load")).items || [];
  } catch (error) {
    if (result.isConnected) result.textContent = "Не удалось загрузить вещи: " + error.message;
    return;
  }
  if (!result.isConnected) return;
  if (!items.length) {
    result.textContent = "Вещей пока нет. Нажми «Положить», чтобы убрать первую вещь.";
    return;
  }

  const search = document.querySelector("#wmsSearch");
  const chips = document.querySelector("#wmsCategories");
  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
  const UNPLACED = "__unplaced";
  const unplacedCount = items.filter((i) => !i.place).length;
  let category = "";
  const haystack = new Map(items.map((i) => [i, wmsSearchText([i.name, i.category, i.place?.location, i.place?.module, i.place?.shelf].join(" "))]));

  function drawChips() {
    chips.innerHTML = ["", ...(unplacedCount ? [UNPLACED] : []), ...categories].map((c) =>
      '<button type="button" data-category="' + escapeHtml(c) + '" style="' +
      buttonStyle("padding:6px 10px;font-weight:600;" + (c === category ? "background:var(--accent);color:var(--accent-ink);border-color:transparent" : "")) + '">' +
      escapeHtml(c === UNPLACED ? "📋 Не разложено: " + unplacedCount : c || "Все") + "</button>").join("");
    chips.querySelectorAll("[data-category]").forEach((btn) => btn.addEventListener("click", () => {
      category = btn.dataset.category;
      drawChips();
      draw();
    }));
  }

  // Если вещи нет в базе по названию, спрашиваем Gemini, что это, и показываем,
  // где лежат вещи той же категории — туда её и стоит искать или положить.
  const guesses = new Map();
  let guessTimer = null;

  function drawGuess(query, data) {
    const box = result.querySelector("#wmsGuess");
    if (!box || wmsSearchText(search.value).trim() !== query) return;
    const draft = data.draft;
    const same = draft.category ? items.filter((i) => i.category === draft.category && i.place) : [];
    const places = [...new Map(same.map((i) => [wmsPlaceText(i.place) + " · " + i.place.shelf, i])).values()].slice(0, 6);
    let html = "";
    if (draft.aiUsed && draft.category) {
      html += "<p>«" + escapeHtml(search.value.trim()) + "» — это, похоже, <b>" + escapeHtml(draft.category) + "</b>." +
        (places.length ? " Такие вещи у вас лежат здесь:" : " Вещей этой категории пока нет.") + "</p>";
      html += places.map((i) => '<article class="row-card"><div><b>' + escapeHtml(wmsPlaceText(i.place)) + " → " + escapeHtml(i.place.shelf) +
        '</b><div class="muted">' + escapeHtml(i.name) + "</div></div></article>").join("");
    }
    html += '<p class="muted">Если вещь у вас есть, внесите её — тогда поиск будет находить её сразу.</p>' +
      '<button id="wmsGuessAdd" style="' + buttonStyle() + '">📥 Положить «' + escapeHtml(search.value.trim()) + "»</button>";
    box.innerHTML = html;
    box.querySelector("#wmsGuessAdd").addEventListener("click", () => showIntake({ text: search.value.trim(), ...data }));
  }

  function scheduleGuess(query) {
    clearTimeout(guessTimer);
    if (query.length < 3) return;
    if (guesses.has(query)) { drawGuess(query, guesses.get(query)); return; }
    guessTimer = setTimeout(async () => {
      try {
        const data = await wmsApi("wms.intake.analyze", { text: query });
        guesses.set(query, data);
        drawGuess(query, data);
      } catch (error) {
        const box = result.querySelector("#wmsGuess");
        if (box) box.textContent = "";
      }
    }, 700);
  }

  function draw() {
    const words = wmsSearchText(search.value).split(/\s+/).filter(Boolean);
    const found = items.filter((i) => (!category || (category === UNPLACED ? !i.place : i.category === category)) && words.every((w) => haystack.get(i).includes(w)));
    if (!found.length) {
      const query = wmsSearchText(search.value).trim();
      result.innerHTML = "<p>По названию ничего не нашлось.</p>" +
        (query.length >= 3 ? '<div id="wmsGuess" class="muted">Смотрю, что это за вещь…</div>' : "<p>Попробуй другое слово или выбери «Все».</p>");
      scheduleGuess(query);
      return;
    }
    clearTimeout(guessTimer);
    let html = '<p class="muted">Найдено: ' + found.length + "</p>";
    let group = null;
    for (const item of found) {
      const title = wmsPlaceText(item.place);
      if (title !== group) {
        group = title;
        html += '<h3 style="margin:14px 0 6px">' + escapeHtml(title) + "</h3>";
      }
      html += wmsItemCard(item);
    }
    result.classList.remove("muted");
    result.innerHTML = html;
  }

  search.addEventListener("input", draw);
  result.addEventListener("click", (e) => {
    const b = e.target.closest("[data-plan-item]");
    if (b) { nav.sub = "plan"; showPlan({ focusItemId: b.dataset.planItem }); return; }
    const p = e.target.closest("[data-place-item]");
    if (p) { const item = items.find((i) => i.id === p.dataset.placeItem); if (item) showPlaceLater(item); }
  });
  drawChips();
  draw();
  search.focus();
}

const WMS_USAGE_CHOICES = [["daily", "Каждый день"], ["weekly", "Раз в неделю"], ["monthly", "Раз в месяц"], ["rare", "Редко, по сезону"]];
const WMS_WEIGHT_CHOICES = [["light", "Лёгкая"], ["medium", "Средняя, 1–5 кг"], ["heavy", "Тяжёлая, больше 5 кг"]];
const WMS_STORAGE_TEXT = { shelf: "полка", drawer: "ящик", rod: "штанга", hook: "крючок", bulky: "крупный отсек" };

/** Фото с телефона уменьшаем до 1024 px, чтобы быстро уходило в Gemini. */
function wmsPhotoToJpeg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      resolve({ mime: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Не удалось прочитать фото")); };
    img.src = url;
  });
}

function wmsChoiceButtons(name, choices, selected) {
  return '<div style="display:flex;flex-wrap:wrap;gap:6px">' + choices.map(([value, label]) =>
    '<button type="button" data-choice="' + name + '" data-value="' + value + '" style="' +
    buttonStyle("padding:8px 11px;font-weight:600;" + (value === selected ? "background:var(--accent);color:var(--accent-ink);border-color:transparent" : "")) + '">' +
    escapeHtml(label) + "</button>").join("") + "</div>";
}

async function showIntake(prefill = null) {
  nav.sub = "put";
  if (nav.tab !== "things") { markTab("things"); budgetFrame?.classList.add("hidden"); }
  nav.root = true;
  showPanel('<h2>📥 Положить вещь</h2><p>Сфотографируй вещь или опиши её — система сама решит, куда её убрать по 5S.</p>' +
    '<div class="form-grid"><label for="intakeText">Что убираем?</label>' +
    '<input id="intakeText" maxlength="300" placeholder="Например: зимняя куртка жены, дрель, таблетки" style="' + inputStyle() + '">' +
    '<label for="intakePhoto">Фото (необязательно)</label><input id="intakePhoto" type="file" accept="image/*" capture="environment">' +
    '<img id="intakePreview" alt="" style="display:none;max-width:100%;max-height:220px;border-radius:12px">' +
    '<button id="intakeAnalyze" class="cook-open">Определить вещь</button></div><div id="intakeStep" role="status"></div>');
  let photo = null;
  const step = document.querySelector("#intakeStep");
  // Описание или фото поменялись — старый черновик относится к другой вещи, убираем его.
  const resetDraft = () => {
    if (step.innerHTML) step.innerHTML = '<p class="muted">Вещь изменилась — нажми «Определить вещь».</p>';
  };
  document.querySelector("#intakeText").addEventListener("input", resetDraft);
  document.querySelector("#intakePhoto").addEventListener("change", async (event) => {
    resetDraft();
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      photo = await wmsPhotoToJpeg(file);
      const preview = document.querySelector("#intakePreview");
      preview.src = photo.preview;
      preview.style.display = "block";
    } catch (error) { step.textContent = error.message; }
  });
  const analyzeBtn = document.querySelector("#intakeAnalyze");
  analyzeBtn.addEventListener("click", async () => {
    const text = document.querySelector("#intakeText").value.trim();
    if (!text && !photo) { step.textContent = "Напиши, что это за вещь, или добавь фото."; return; }
    analyzeBtn.disabled = true;
    step.textContent = "Смотрю на вещь…";
    try {
      const data = await wmsApi("wms.intake.analyze", { text, photo: photo ? { mime: photo.mime, data: photo.data } : null });
      showIntakeDraft(step, data.draft, data.categories || []);
    } catch (error) { step.textContent = "Не удалось определить вещь: " + error.message; }
    finally { analyzeBtn.disabled = false; }
  });
  // Пришли из поиска: вещь уже распознана, сразу показываем черновик.
  if (prefill?.text) document.querySelector("#intakeText").value = prefill.text;
  if (prefill?.draft) showIntakeDraft(step, prefill.draft, prefill.categories || []);
}

function showIntakeDraft(step, draft, categories) {
  const item = { ...draft };
  const categoryOptions = (selected) => ['<option value="">— без категории —</option>', ...categories.map((c) =>
    '<option' + (c === selected ? " selected" : "") + ">" + escapeHtml(c) + "</option>"), '<option value="__own">✏️ Своя категория…</option>'].join("");
  const options = categoryOptions(item.category);
  const s = item.size || {};
  step.innerHTML = '<div class="subcard"><p class="muted">' + (item.aiUsed ? "Вот что я понял. Поправь, если не так." : "Gemini сейчас недоступен — заполни сам, это быстро.") + "</p>" +
    '<div class="form-grid"><label for="draftName">Вещь</label><input id="draftName" maxlength="120" value="' + escapeHtml(item.name) + '" style="' + inputStyle() + '">' +
    '<label for="draftCategory">Категория</label><select id="draftCategory" style="' + inputStyle() + '">' + options + "</select>" +
    (item.aiUsed ? '<p class="muted" id="draftGuessNote" style="margin:0">Категорию и размер Gemini определил по названию — можно поменять.</p>' : "") +
    "<b>Как часто ей пользуетесь?</b>" + wmsChoiceButtons("usage", WMS_USAGE_CHOICES, item.usage) +
    "<b>Насколько тяжёлая?</b>" + wmsChoiceButtons("weight", WMS_WEIGHT_CHOICES, item.weight) +
    '<label class="checkline"><input type="checkbox" id="draftHang"' + (item.canHang ? " checked" : "") + "> Можно повесить на вешалку</label>" +
    '<label class="checkline"><input type="checkbox" id="draftFold"' + (item.canFold ? " checked" : "") + "> Мягкая, можно сложить</label>" +
    '<label class="checkline"><input type="checkbox" id="draftHazard"' + (item.hazardous ? " checked" : "") + "> Опасно для ребёнка (химия, лекарства, острое)</label>" +
    '<b>Размер, см (примерно)</b><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">' +
    ["width", "height", "depth"].map((k, i) => '<input id="draftSize_' + k + '" type="number" min="1" max="400" inputmode="numeric" placeholder="' +
      ["ширина", "высота", "глубина"][i] + '" value="' + escapeHtml(s[k] ?? "") + '" style="' + inputStyle() + '">').join("") + "</div>" +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button id="draftSuggest" class="cook-open">Подобрать место</button>' +
    '<button id="draftPick" class="btn-ghost">🗺 Выберу сам</button>' +
    '<button id="draftLater" class="btn-ghost">📋 Пока без места</button></div></div><div id="draftResult"></div></div>';

  step.querySelectorAll("[data-choice]").forEach((btn) => btn.addEventListener("click", () => {
    item[btn.dataset.choice] = btn.dataset.value;
    step.querySelectorAll('[data-choice="' + btn.dataset.choice + '"]').forEach((b) => {
      const on = b === btn;
      b.style.background = on ? "var(--accent)" : "";
      b.style.color = on ? "var(--accent-ink)" : "";
      b.style.borderColor = on ? "transparent" : "";
    });
  }));

  // Своя категория: вписать название, она добавится в список.
  const categorySelect = step.querySelector("#draftCategory");
  let categoryTouched = false;
  let lastCategory = categorySelect.value;
  categorySelect.addEventListener("change", () => {
    categoryTouched = true;
    if (categorySelect.value !== "__own") { lastCategory = categorySelect.value; return; }
    const own = (window.prompt("Название категории") || "").trim().slice(0, 60);
    if (own && !categories.includes(own)) categories.push(own);
    categorySelect.innerHTML = categoryOptions(own || lastCategory);
    lastCategory = categorySelect.value;
  });

  // Поправили название — Gemini заново определяет категорию и размер (если их не меняли руками).
  const sizeTouched = new Set();
  ["width", "height", "depth"].forEach((k) => step.querySelector("#draftSize_" + k).addEventListener("input", () => sizeTouched.add(k)));
  const nameInput = step.querySelector("#draftName");
  let nameTimer = null;
  let nameSeq = 0;
  nameInput.addEventListener("input", () => {
    clearTimeout(nameTimer);
    const text = nameInput.value.trim();
    if (text.length < 3) return;
    nameTimer = setTimeout(async () => {
      const seq = ++nameSeq;
      try {
        const data = await wmsApi("wms.intake.analyze", { text, photo: null });
        const d = data.draft;
        if (seq !== nameSeq || !d?.aiUsed) return;
        (data.categories || []).forEach((c) => { if (!categories.includes(c)) categories.push(c); });
        if (!categoryTouched) { categorySelect.innerHTML = categoryOptions(d.category); lastCategory = categorySelect.value; }
        if (d.size) ["width", "height", "depth"].forEach((k) => { if (!sizeTouched.has(k)) step.querySelector("#draftSize_" + k).value = d.size[k]; });
      } catch (_) { /* без Gemini просто оставляем как есть */ }
    }, 800);
  });

  const result = step.querySelector("#draftResult");
  const suggestBtn = step.querySelector("#draftSuggest");
  const readProfile = () => {
    const dims = ["width", "height", "depth"].map((k) => Number(step.querySelector("#draftSize_" + k).value));
    const profile = {
      name: step.querySelector("#draftName").value.trim() || item.name,
      category: categorySelect.value && categorySelect.value !== "__own" ? categorySelect.value : null,
      usage: item.usage,
      weight: item.weight,
      canHang: step.querySelector("#draftHang").checked,
      canFold: step.querySelector("#draftFold").checked,
      hazardous: step.querySelector("#draftHazard").checked,
      size: dims.every((n) => n > 0 && n <= 400) ? { width: dims[0], height: dims[1], depth: dims[2] } : null,
    };
    return profile;
  };
  // Сам выбираю полку на плане — без бота и ИИ.
  step.querySelector("#draftPick").addEventListener("click", () => pickShelfManually(result, readProfile()));
  // Просто внести в базу, разложить потом («Где что лежит» → «Не разложено»).
  const laterBtn = step.querySelector("#draftLater");
  laterBtn.addEventListener("click", async () => {
    const profile = readProfile();
    laterBtn.disabled = true;
    result.textContent = "Сохраняю…";
    try {
      await saveIntakeItem(result, profile, null);
    } catch (error) { result.textContent = "Не сохранилось: " + error.message; laterBtn.disabled = false; }
  });
  suggestBtn.addEventListener("click", async () => {
    const profile = readProfile();
    suggestBtn.disabled = true;
    result.textContent = "Ищу лучшее место…";
    try {
      const data = await wmsApi("wms.place.suggest", { item: profile });
      showIntakeSuggestions(result, profile, data.suggestions || []);
    } catch (error) { result.textContent = "Не удалось подобрать место: " + error.message; }
    finally { suggestBtn.disabled = false; }
  });
}

function showIntakeSuggestions(result, profile, suggestions, itemId = null) {
  if (!suggestions.length) {
    result.innerHTML = "<p>Подходящего места нет: вещь не влезает или все подходящие полки опасны для неё. Попробуй уменьшить размер или снять галочки.</p>";
    return;
  }
  result.innerHTML = "<h3>Куда убрать «" + escapeHtml(profile.name) + "»</h3>" + suggestions.map((s, i) => {
    const zone = WMS_ZONES[s.zone];
    return '<article class="row-card"><div>' + (i === 0 && s.by === "ai" ? '<div class="muted">🤖 выбрал Gemini</div>' : "") + '<b>' + (i === 0 ? "⭐ " : "") + escapeHtml(s.location) + " → " + escapeHtml(s.module) + " → " + escapeHtml(s.shelf) + "</b>" +
      '<div class="muted">' + (s.mode === "hang" ? "Повесить" : "Положить") + " · " + escapeHtml(WMS_STORAGE_TEXT[s.storageType] || s.storageType) + " · " +
      escapeHtml(s.heightFromFloor) + " см от пола" + (zone ? " · " + zone.icon + " " + escapeHtml(zone.text) : "") + "</div>" +
      (s.reasons.length ? '<ul class="muted" style="margin:4px 0 6px 18px;padding:0">' + s.reasons.map((r) => "<li>" + escapeHtml(r) + "</li>").join("") + "</ul>" : "") +
      '<button data-place="' + i + '" style="' + buttonStyle() + '">Положу сюда</button></div></article>';
  }).join("") + '<p id="placeStatus" role="status"></p><button id="placePick" class="btn-ghost">🗺 Нет, выберу полку сам</button>';
  result.querySelector("#placePick").addEventListener("click", () => pickShelfManually(result, profile, itemId));
  result.querySelectorAll("[data-place]").forEach((btn) => btn.addEventListener("click", async () => {
    const s = suggestions[Number(btn.dataset.place)];
    const status = result.querySelector("#placeStatus");
    result.querySelectorAll("[data-place]").forEach((b) => { b.disabled = true; });
    status.textContent = "Сохраняю…";
    try {
      await saveIntakeItem(result, profile, s, itemId);
    } catch (error) {
      status.textContent = "Не сохранилось: " + error.message;
      result.querySelectorAll("[data-place]").forEach((b) => { b.disabled = false; });
    }
  }));
}

/** place = null — вещь без места; itemId — вещь уже в базе, её раскладываем или перекладываем. */
async function saveIntakeItem(result, profile, place, itemId = null) {
  const cellId = place ? place.cellId : null;
  const saved = itemId
    ? await wmsApi("wms.items.place", { id: itemId, cell_id: cellId })
    : await wmsApi("wms.items.add", { item: profile, cell_id: cellId });
  const where = place
    ? "лежит в " + escapeHtml(place.location) + " → " + escapeHtml(place.module) + " → " + escapeHtml(place.shelf) + "."
    : "сохранена без места. Разложить можно позже: «Где что лежит» → «📋 Не разложено».";
  result.innerHTML = '<div class="success-box">Готово: «' + escapeHtml(profile.name) + "» " + where + '</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' +
    (place ? '<button id="intakeWhere">🗺 Показать на плане</button>' : "") +
    '<button id="intakeMore" class="btn-ghost">Положить ещё</button><button id="intakeList" class="btn-ghost">🔎 Где что лежит</button></div>';
  result.querySelector("#intakeMore").addEventListener("click", () => showIntake());
  result.querySelector("#intakeList").addEventListener("click", () => showWhereThings());
  result.querySelector("#intakeWhere")?.addEventListener("click", () => { nav.sub = "plan"; showPlan({ focusItemId: saved.id || itemId }); });
}

/** Разложить вещь «без места» или переложить: подбор по 5S или свой выбор на плане. */
function showPlaceLater(item) {
  const profile = item.profile || { name: item.name, category: item.category, usage: item.usage || "monthly", weight: "light", canHang: false, canFold: false, hazardous: false, size: null };
  const now = item.place ? "Сейчас: " + escapeHtml(item.place.location + " → " + item.place.module + " → " + item.place.shelf) : "Пока не разложена.";
  showPanel('<h2>' + (item.place ? "↔️ Переложить" : "📦 Разложить") + " «" + escapeHtml(item.name) + '»</h2><p class="muted">' + now + "</p>" +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button id="laterSuggest" class="cook-open">Подобрать место</button>' +
    '<button id="laterPick" class="btn-ghost">🗺 Выберу сам</button>' +
    (item.place ? '<button id="laterUnplace" class="btn-ghost">📋 В «Не разложено»</button>' : "") +
    '<button id="laterBack" class="btn-ghost">← К списку</button></div><div id="laterResult" role="status"></div>');
  const result = document.querySelector("#laterResult");
  const suggestBtn = document.querySelector("#laterSuggest");
  document.querySelector("#laterBack").addEventListener("click", () => showWhereThings());
  document.querySelector("#laterPick").addEventListener("click", () => pickShelfManually(result, profile, item.id));
  const unplaceBtn = document.querySelector("#laterUnplace");
  unplaceBtn?.addEventListener("click", async () => {
    unplaceBtn.disabled = true;
    result.textContent = "Сохраняю…";
    try { await saveIntakeItem(result, profile, null, item.id); } catch (error) { result.textContent = "Не сохранилось: " + error.message; unplaceBtn.disabled = false; }
  });
  suggestBtn.addEventListener("click", async () => {
    suggestBtn.disabled = true;
    result.textContent = "Ищу лучшее место…";
    try {
      const data = await wmsApi("wms.place.suggest", { item: profile });
      showIntakeSuggestions(result, profile, data.suggestions || [], item.id);
    } catch (error) { result.textContent = "Не удалось подобрать место: " + error.message; }
    finally { suggestBtn.disabled = false; }
  });
}

/** Ручной выбор: план квартиры прямо в шаге приёмки, нажатие на полку — «Положить сюда». */
async function pickShelfManually(result, profile, itemId = null) {
  result.innerHTML = '<h3>Куда положить «' + escapeHtml(profile.name) + '»</h3><div id="pickRoot">' + skeleton(2) + '</div><p id="pickStatus" role="status" class="muted"></p>';
  const box = result.querySelector("#pickRoot");
  try {
    await loadWmsPlan();
  } catch (error) {
    if (box.isConnected) box.innerHTML = "<p>Не удалось открыть план: " + escapeHtml(error.message) + "</p>";
    return;
  }
  if (!box.isConnected) return;
  let saving = false;
  window.WmsPlan.mount(box, { api: wmsApi, esc: escapeHtml, haptic, onDepth() {} }, {
    pick: {
      name: profile.name,
      async onPick(place) {
        if (saving) return;
        saving = true;
        const status = result.querySelector("#pickStatus");
        if (status) status.textContent = "Сохраняю…";
        try {
          await saveIntakeItem(result, profile, place, itemId);
        } catch (error) {
          saving = false;
          if (status) status.textContent = "Не сохранилось: " + error.message;
        }
      },
    },
  });
  result.scrollIntoView({ behavior: "smooth", block: "start" });
}

tabbar.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab;
    if (tab === nav.tab && nav.root && tab !== "today") return;
    goTab(tab);
  });
});

retryBtn.addEventListener("click", authenticate);
authenticate();
