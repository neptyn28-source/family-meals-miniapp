const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1uec0985MtG3wzW-FaXvdw_O2P3nLoZ";

const FAMILY_API_URL =
  "https://vwapvcpodwvfzfmtoxhz.supabase.co/functions/v1/family-api";

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
      data.message ||
      data.error ||
      `Ошибка сервера ${response.status}`
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

    <p>
      Этот Telegram-аккаунт ещё не привязан к семье.
      Введите код приглашения.
    </p>

    <input
      id="familyCode"
      maxlength="6"
      autocomplete="off"
      placeholder="Например: A7K9P2"
      style="
        width:100%;
        padding:12px;
        margin:8px 0;
        border-radius:10px;
        border:1px solid #555;
        text-transform:uppercase;
        box-sizing:border-box;
      "
    >

    <button
      id="joinFamilyBtn"
      style="
        width:100%;
        padding:12px;
        border:0;
        border-radius:10px;
        font-weight:700;
        margin-top:6px;
      "
    >
      Присоединиться
    </button>

    <p id="joinFamilyStatus"></p>
  `;

  const input =
    document.querySelector("#familyCode");

  const button =
    document.querySelector("#joinFamilyBtn");

  const message =
    document.querySelector("#joinFamilyStatus");

  input.addEventListener("input", () => {
    input.value =
      input.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);
  });

  button.addEventListener("click", async () => {
    const code =
      input.value.trim().toUpperCase();

    if (code.length !== 6) {
      message.textContent =
        "Введите код из 6 символов.";
      return;
    }

    button.disabled = true;
    message.textContent =
      "Подключаем к семье…";

    try {
      await api("invite.join", { code });

      message.textContent =
        "Готово. Загружаем семейное меню…";

      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (error) {
      message.textContent =
        error.message ||
        "Не удалось подключиться.";

      button.disabled = false;
    }
  });
}

function addInviteButton() {
  if (
    bootstrapData?.member?.role !== "husband"
  ) {
    return;
  }

  if (
    document.querySelector("#inviteWifeBtn")
  ) {
    return;
  }

  const card = hello.parentElement;

  const wrapper =
    document.createElement("div");

  wrapper.style.marginTop = "16px";

  wrapper.innerHTML = `
    <button
      id="inviteWifeBtn"
      style="
        width:100%;
        padding:12px;
        border:0;
        border-radius:10px;
        font-weight:700;
      "
    >
      Пригласить жену
    </button>

    <div
      id="inviteResult"
      style="margin-top:12px"
    ></div>
  `;

  card.appendChild(wrapper);

  document
    .querySelector("#inviteWifeBtn")
    .addEventListener(
      "click",
      createInvite
    );
}

async function createInvite() {
  const button =
    document.querySelector("#inviteWifeBtn");

  const result =
    document.querySelector("#inviteResult");

  button.disabled = true;
  result.textContent =
    "Создаём код…";

  try {
    const data =
      await api("invite.create");

    const code =
      data.invite.code;

    const expires =
      new Date(
        data.invite.expires_at
      ).toLocaleString("ru-RU");

    result.innerHTML = `
      <div
        style="
          padding:14px;
          border:1px solid #555;
          border-radius:12px;
          text-align:center;
        "
      >
        <div style="font-size:13px">
          Код для жены
        </div>

        <div
          style="
            font-size:30px;
            font-weight:800;
            letter-spacing:5px;
            margin:8px 0;
          "
        >
          ${escapeHtml(code)}
        </div>

        <div style="font-size:12px;opacity:.7">
          Действует до ${escapeHtml(expires)}
        </div>
      </div>
    `;

    button.textContent =
      "Создать новый код";
  } catch (error) {
    result.textContent =
      "Ошибка: " + error.message;
  } finally {
    button.disabled = false;
  }
}

async function authenticate() {
  if (retryBtn) {
    retryBtn.hidden = true;
  }

  statusEl.textContent =
    "Подключаем Telegram…";

  if (authText) {
    authText.textContent =
      "Проверяем пользователя и семейную базу.";
  }

  initData =
    tg?.initData || "";

  if (!initData) {
    statusEl.textContent =
      "Открой приложение из Telegram";

    if (authText) {
      authText.textContent =
        "Обычная вкладка браузера не получает Telegram initData.";
    }

    return;
  }

  try {
    bootstrapData =
      await api("bootstrap");

    statusEl.textContent =
      "Telegram подключён";

    const name =
      bootstrapData.member?.name ||
      bootstrapData.telegram_user
        ?.first_name ||
      "семья";

    hello.textContent =
      `Привет, ${name}!`;

    authCard.classList.add("hidden");
    home.classList.remove("hidden");

    addInviteButton();
  } catch (error) {
    if (
      error.code === "not_invited"
    ) {
      showJoinFamily();
      return;
    }

    statusEl.textContent =
      "Не удалось войти";

    if (authText) {
      authText.textContent =
        error.message ||
        "Ошибка авторизации";
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

    <p>
      Общие продукты семьи.
      Данные хранятся в Supabase.
    </p>

    <div
      style="
        display:grid;
        gap:10px;
        margin-bottom:18px;
      "
    >
      <input
        id="invName"
        placeholder="Продукт, например: куриная грудка"
        style="
          padding:12px;
          border-radius:10px;
          border:1px solid #555;
        "
      >

      <div
        style="
          display:grid;
          grid-template-columns:1fr 100px;
          gap:8px;
        "
      >
        <input
          id="invQty"
          type="number"
          step="0.001"
          min="0"
          placeholder="Количество"
          style="
            padding:12px;
            border-radius:10px;
            border:1px solid #555;
          "
        >

        <select
          id="invUnit"
          style="
            padding:12px;
            border-radius:10px;
            border:1px solid #555;
          "
        >
          <option value="g">г</option>
          <option value="ml">мл</option>
          <option value="pcs">шт</option>
        </select>
      </div>

      <select
        id="invState"
        style="
          padding:12px;
          border-radius:10px;
          border:1px solid #555;
        "
      >
        <option value="raw">Сырое</option>
        <option value="cooked">Готовое</option>
        <option value="semi_finished">
          Полуфабрикат
        </option>
        <option value="frozen">
          Замороженное
        </option>
        <option value="dry">Сухое</option>
        <option value="canned">
          Консервы
        </option>
      </select>

      <label>
        <input
          id="invUrgent"
          type="checkbox"
        >
        Срочно использовать
      </label>

      <button
        id="invAdd"
        style="
          padding:12px;
          border:0;
          border-radius:10px;
          font-weight:700;
        "
      >
        Добавить продукт
      </button>
    </div>

    <div id="inventoryStatus">
      Загружаем…
    </div>

    <div id="inventoryList"></div>
  `;

  document
    .querySelector("#invAdd")
    .addEventListener(
      "click",
      addInventory
    );

  await loadInventory();
}

async function loadInventory() {
  const listEl =
    document.querySelector(
      "#inventoryList"
    );

  const status =
    document.querySelector(
      "#inventoryStatus"
    );

  try {
    status.textContent =
      "Загружаем…";

    const data =
      await api("inventory.list");

    const items =
      data.items || [];

    status.textContent =
      items.length
        ? `Продуктов: ${items.length}`
        : "Остатков пока нет.";

    listEl.innerHTML =
      items
        .map(
          (item) => `
            <div
              style="
                padding:12px 0;
                border-top:1px solid #444;
                display:flex;
                justify-content:space-between;
                gap:12px;
              "
            >
              <div>
                <strong>
                  ${escapeHtml(item.name)}
                </strong>
                <br>

                ${escapeHtml(item.quantity)}
                ${escapeHtml(item.unit)}

                ${
                  item.urgent
                    ? " · ⚠️ срочно"
                    : ""
                }

                <br>

                <small>
                  ${escapeHtml(
                    stateLabel(item.state)
                  )}
                </small>
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
      .querySelectorAll(
        "[data-delete-inventory]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          async () => {
            await deleteInventory(
              button.dataset
                .deleteInventory
            );
          }
        );
      });
  } catch (error) {
    status.textContent =
      "Ошибка: " +
      error.message;
  }
}

async function addInventory() {
  const name =
    document
      .querySelector("#invName")
      .value
      .trim();

  const quantity =
    Number(
      document
        .querySelector("#invQty")
        .value
    );

  const unit =
    document
      .querySelector("#invUnit")
      .value;

  const state =
    document
      .querySelector("#invState")
      .value;

  const urgent =
    document
      .querySelector("#invUrgent")
      .checked;

  if (!name) {
    alert(
      "Введи название продукта"
    );
    return;
  }

  if (
    !Number.isFinite(quantity) ||
    quantity < 0
  ) {
    alert(
      "Проверь количество"
    );
    return;
  }

  try {
    await api(
      "inventory.add",
      {
        name,
        quantity,
        unit,
        state,
        urgent,
      }
    );

    document
      .querySelector("#invName")
      .value = "";

    document
      .querySelector("#invQty")
      .value = "";

    document
      .querySelector("#invUrgent")
      .checked = false;

    await loadInventory();
  } catch (error) {
    alert(
      "Не удалось добавить: " +
      error.message
    );
  }
}

async function deleteInventory(id) {
  try {
    await api(
      "inventory.delete",
      { id }
    );

    await loadInventory();
  } catch (error) {
    alert(
      "Не удалось удалить: " +
      error.message
    );
  }
}

if (retryBtn) {
  retryBtn.addEventListener(
    "click",
    authenticate
  );
}

document
  .querySelectorAll(".tile")
  .forEach((button) => {
    button.addEventListener(
      "click",
      async () => {
        const action =
          button.dataset.action;

        if (
          action === "inventory"
        ) {
          await showInventory();
          return;
        }

        const names = {
          rules:
            "Правила семьи",
          week:
            "Новая неделя",
          shopping:
            "Покупки",
        };

        placeholder.innerHTML = `
          <h2>
            ${names[action] || "Раздел"}
          </h2>

          <p>
            Подключим следующим этапом.
          </p>
        `;

        placeholder
          .classList
          .remove("hidden");
      }
    );
  });

authenticate();
