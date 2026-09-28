
(function () {
  function money(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) + " ₽" : "—";
  }

  function amount(value) {
    const n = Number(value || 0);
    if (Math.abs(n - Math.round(n)) < 0.001) return String(Math.round(n));
    return n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  function budgetLabel(status) {
    return ({
      within: "в пределах бюджета",
      over: "выше бюджета",
      unverified: "бюджет не подтверждён",
    })[status] || "ещё не рассчитан";
  }

  async function showServerShopping(start) {
    currentWeekStart = getMonday(start || currentWeekStart);
    placeholder.classList.remove("hidden");
    placeholder.innerHTML =
      '<h2>Покупки</h2>' +
      '<p>Список считает серверный планировщик: остатки вычитаются по продукту и состоянию, покупка округляется до целых упаковок.</p>' +
      '<div style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;margin-bottom:12px">' +
        '<button id="hardShoppingPrev">←</button>' +
        '<button id="hardShoppingToday">Текущая неделя</button>' +
        '<button id="hardShoppingNext">→</button>' +
      '</div>' +
      '<div id="hardShoppingStatus">Загружаем…</div>' +
      '<div id="hardShoppingContent"></div>';

    document.querySelector("#hardShoppingPrev").addEventListener("click", function () {
      showServerShopping(addDays(currentWeekStart, -7));
    });
    document.querySelector("#hardShoppingNext").addEventListener("click", function () {
      showServerShopping(addDays(currentWeekStart, 7));
    });
    document.querySelector("#hardShoppingToday").addEventListener("click", function () {
      showServerShopping(getMonday(new Date()));
    });

    const status = document.querySelector("#hardShoppingStatus");
    const box = document.querySelector("#hardShoppingContent");

    try {
      const weekData = await api("week.get", { week_start: isoDate(currentWeekStart) });
      const week = weekData.week;
      const data = await api("shopping.list", { week_id: week.id });
      const items = data.items || [];
      const cost = Number(week.estimated_cost);

      status.innerHTML =
        '<strong>' + escapeHtml(shortDate(currentWeekStart)) + "–" +
        escapeHtml(shortDate(addDays(currentWeekStart, 6))) + '</strong>' +
        '<div style="font-size:13px;opacity:.75;margin-top:4px">' +
        (Number.isFinite(cost) ? "Оценка: " + escapeHtml(money(cost)) + " · " : "") +
        escapeHtml(budgetLabel(week.budget_status)) +
        '</div>';

      if (!items.length) {
        box.innerHTML =
          '<div style="padding:14px;border:1px solid #555;border-radius:12px;margin-top:12px">' +
          'Покупки ещё не рассчитаны. Сначала открой «Новая неделя» и нажми «Составить неделю».' +
          '</div>';
        return;
      }

      const need = items.filter(function (x) { return Number(x.to_buy) > 0.0001; });
      const covered = items.filter(function (x) { return Number(x.to_buy) <= 0.0001; });

      let buyHtml = "";
      need.forEach(function (item) {
        buyHtml +=
          '<label style="display:grid;grid-template-columns:auto 1fr;gap:10px;padding:10px 0;border-top:1px solid #444;align-items:start">' +
            '<input type="checkbox" data-hard-shopping="' + escapeHtml(item.id) + '" ' + (item.purchased ? "checked" : "") + '>' +
            '<span><b>' + escapeHtml(item.product_name) + '</b><br>' +
              '<span style="font-size:13px">нужно ' + escapeHtml(amount(item.to_buy)) + " " + escapeHtml(item.unit) +
              (item.packages != null ? " · " + escapeHtml(item.packages) + " уп." : "") +
              (item.purchase_quantity != null ? " · купим " + escapeHtml(amount(item.purchase_quantity)) + " " + escapeHtml(item.unit) : "") +
              '</span><br>' +
              '<span style="font-size:12px;opacity:.7">' +
                (item.store ? escapeHtml(item.store) : "магазин не выбран") +
                (item.estimated_price != null ? " · ≈" + escapeHtml(money(item.estimated_price)) : " · цена неизвестна") +
                (item.price_verified ? " · цена подтверждена" : " · цена ориентировочная") +
              '</span>' +
            '</span>' +
          '</label>';
      });

      let coveredHtml = "";
      covered.forEach(function (item) {
        coveredHtml +=
          '<div style="padding:8px 0;border-top:1px solid #444">' +
          escapeHtml(item.product_name) + " — " + escapeHtml(amount(item.required_quantity)) + " " + escapeHtml(item.unit) +
          '</div>';
      });

      box.innerHTML =
        '<div style="margin-top:12px;padding:12px;border:1px solid #444;border-radius:12px">' +
          '<strong>Нужно купить · ' + need.length + '</strong>' +
          '<div style="margin-top:8px">' + buyHtml + '</div>' +
        '</div>' +
        (covered.length
          ? '<details style="margin-top:12px"><summary>Полностью покрыто остатками · ' + covered.length +
            '</summary>' + coveredHtml + '</details>'
          : "");

      box.querySelectorAll("[data-hard-shopping]").forEach(function (checkbox) {
        checkbox.addEventListener("change", async function () {
          checkbox.disabled = true;
          try {
            await api("shopping.purchase", {
              id: checkbox.dataset.hardShopping,
              purchased: checkbox.checked,
            });
          } catch (error) {
            checkbox.checked = !checkbox.checked;
            alert("Не удалось сохранить отметку: " + error.message);
          } finally {
            checkbox.disabled = false;
          }
        });
      });
    } catch (error) {
      status.textContent = "Ошибка: " + error.message;
      box.innerHTML = "";
    }
  }

  async function showPlannerSettings() {
    placeholder.classList.remove("hidden");
    placeholder.innerHTML =
      '<h2>Настройки семьи</h2>' +
      '<p>Эти значения использует валидатор и генератор недели.</p>' +
      '<div id="hardSettingsStatus">Загружаем…</div>' +
      '<div id="hardSettingsContent"></div>';

    const status = document.querySelector("#hardSettingsStatus");
    const box = document.querySelector("#hardSettingsContent");

    try {
      const data = await api("settings.get");
      const s = data.settings;
      if (!s) {
        status.textContent = "Настройки планировщика ещё не инициализированы.";
        return;
      }
      status.textContent = "";

      const h = (s.portion_ranges && s.portion_ranges.husband) || { min: 300, max: 400 };
      const w = (s.portion_ranges && s.portion_ranges.wife) || { min: 250, max: 350 };
      const ch = (s.portion_ranges && s.portion_ranges.child) || { min: 120, max: 180 };

      let storeOptions = '<option value="">Автоматически по цене</option>';
      (s.stores || []).forEach(function (store) {
        storeOptions += '<option value="' + escapeHtml(store) + '" ' +
          (s.preferred_store === store ? "selected" : "") + '>' + escapeHtml(store) + '</option>';
      });

      let capsHtml = "";
      (data.caps || []).forEach(function (cap) {
        capsHtml +=
          '<div style="padding:7px 0;border-top:1px solid #444">' +
            escapeHtml(cap.ingredient_id || cap.category) + " — до " +
            escapeHtml(cap.max_amount) + " " + escapeHtml(cap.unit) +
            (cap.enabled ? "" : " · выключено") +
          '</div>';
      });

      box.innerHTML =
        '<div style="display:grid;gap:12px">' +
          '<label>Бюджет на неделю, ₽' +
            '<input id="hardBudget" type="number" min="1" step="100" value="' + escapeHtml(s.weekly_budget_rub) + '" style="' + formControlStyle("margin-top:5px") + '">' +
          '</label>' +
          '<label>Режим порций' +
            '<select id="hardWeightMode" style="' + formControlStyle("margin-top:5px") + '">' +
              '<option value="mild_loss" ' + (s.weight_mode === "mild_loss" ? "selected" : "") + '>Мягкое снижение веса</option>' +
              '<option value="maintain" ' + (s.weight_mode === "maintain" ? "selected" : "") + '>Поддержание</option>' +
              '<option value="custom" ' + (s.weight_mode === "custom" ? "selected" : "") + '>Свои порции</option>' +
            '</select>' +
          '</label>' +
          '<div><b>Диапазоны готовой порции для обеда/ужина</b>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">' +
              '<label>Муж min<input id="hardHMin" type="number" value="' + escapeHtml(h.min) + '" style="' + formControlStyle("margin-top:4px") + '"></label>' +
              '<label>Муж max<input id="hardHMax" type="number" value="' + escapeHtml(h.max) + '" style="' + formControlStyle("margin-top:4px") + '"></label>' +
              '<label>Жена min<input id="hardWMin" type="number" value="' + escapeHtml(w.min) + '" style="' + formControlStyle("margin-top:4px") + '"></label>' +
              '<label>Жена max<input id="hardWMax" type="number" value="' + escapeHtml(w.max) + '" style="' + formControlStyle("margin-top:4px") + '"></label>' +
              '<label>Ребёнок min<input id="hardCMin" type="number" value="' + escapeHtml(ch.min) + '" style="' + formControlStyle("margin-top:4px") + '"></label>' +
              '<label>Ребёнок max<input id="hardCMax" type="number" value="' + escapeHtml(ch.max) + '" style="' + formControlStyle("margin-top:4px") + '"></label>' +
            '</div>' +
          '</div>' +
          '<label>Перекусов у жены в день<select id="hardWifeSnacks" style="' + formControlStyle("margin-top:5px") + '">' +
            [0,1,2].map(function (x) { return '<option value="' + x + '" ' + (Number(s.wife_snacks) === x ? "selected" : "") + '>' + x + '</option>'; }).join("") +
          '</select></label>' +
          '<label>Перекусов у мужа в день<select id="hardHusbandSnacks" style="' + formControlStyle("margin-top:5px") + '">' +
            [0,1,2].map(function (x) { return '<option value="' + x + '" ' + (Number(s.husband_snacks) === x ? "selected" : "") + '>' + x + '</option>'; }).join("") +
          '</select></label>' +
          '<label>Основной магазин<select id="hardStore" style="' + formControlStyle("margin-top:5px") + '">' + storeOptions + '</select></label>' +
          '<label><input id="hardAllowUnverified" type="checkbox" ' + (s.allow_unverified_budget ? "checked" : "") + '> Разрешать неделю, если часть цен ещё не подтверждена</label>' +
          '<button id="hardSaveSettings" style="padding:12px;border:0;border-radius:10px;font-weight:800">Сохранить настройки</button>' +
          '<div id="hardSettingsSaveStatus"></div>' +
          '<details><summary>Недельные лимиты продуктов · ' + (data.caps || []).length + '</summary>' +
            '<div style="font-size:13px;margin-top:8px">' + capsHtml + '</div>' +
          '</details>' +
        '</div>';

      document.querySelector("#hardSaveSettings").addEventListener("click", async function () {
        const button = document.querySelector("#hardSaveSettings");
        const saveStatus = document.querySelector("#hardSettingsSaveStatus");
        function num(id) { return Number(document.querySelector(id).value); }
        const ranges = {
          husband: { min: num("#hardHMin"), max: num("#hardHMax") },
          wife: { min: num("#hardWMin"), max: num("#hardWMax") },
          child: { min: num("#hardCMin"), max: num("#hardCMax") },
        };
        const badRange = Object.values(ranges).some(function (x) {
          return !Number.isFinite(x.min) || !Number.isFinite(x.max) || x.min <= 0 || x.max < x.min;
        });
        if (badRange) {
          alert("Проверь диапазоны порций");
          return;
        }

        button.disabled = true;
        saveStatus.textContent = "Сохраняем…";
        try {
          await api("settings.update", {
            settings: {
              weekly_budget_rub: num("#hardBudget"),
              weight_mode: document.querySelector("#hardWeightMode").value,
              portion_ranges: ranges,
              wife_snacks: num("#hardWifeSnacks"),
              husband_snacks: num("#hardHusbandSnacks"),
              preferred_store: document.querySelector("#hardStore").value || null,
              allow_unverified_budget: document.querySelector("#hardAllowUnverified").checked,
            },
          });
          saveStatus.textContent = "Сохранено. Следующая генерация использует новые настройки.";
        } catch (error) {
          saveStatus.textContent = "Ошибка: " + error.message;
        } finally {
          button.disabled = false;
        }
      });
    } catch (error) {
      status.textContent = "Ошибка: " + error.message;
    }
  }

  function feedbackKey(mealId, memberId) {
    return String(mealId) + "|" + String(memberId);
  }

  async function showPlannerFeedback(start) {
    currentWeekStart = getMonday(start || currentWeekStart);
    placeholder.classList.remove("hidden");
    placeholder.innerHTML =
      '<h2>Отзывы</h2>' +
      '<p>Оценки сохраняются для семьи и влияют на следующие генерации.</p>' +
      '<div style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;margin-bottom:12px">' +
        '<button id="hardFeedbackPrev">←</button>' +
        '<button id="hardFeedbackToday">Текущая неделя</button>' +
        '<button id="hardFeedbackNext">→</button>' +
      '</div>' +
      '<div id="hardFeedbackStatus">Загружаем…</div>' +
      '<div id="hardFeedbackContent"></div>';

    document.querySelector("#hardFeedbackPrev").addEventListener("click", function () {
      showPlannerFeedback(addDays(currentWeekStart, -7));
    });
    document.querySelector("#hardFeedbackNext").addEventListener("click", function () {
      showPlannerFeedback(addDays(currentWeekStart, 7));
    });
    document.querySelector("#hardFeedbackToday").addEventListener("click", function () {
      showPlannerFeedback(getMonday(new Date()));
    });

    const status = document.querySelector("#hardFeedbackStatus");
    const box = document.querySelector("#hardFeedbackContent");

    try {
      const weekData = await api("week.get", { week_start: isoDate(currentWeekStart) });
      const data = await api("feedback.list", { week_id: weekData.week.id });
      const people = (data.members || []).filter(function (m) {
        return m.role === "husband" || m.role === "wife";
      });
      const saved = new Map((data.feedback || []).map(function (x) {
        return [feedbackKey(x.meal_id, x.member_id), x];
      }));
      const meals = weekData.meals || [];

      status.textContent =
        shortDate(currentWeekStart) + "–" + shortDate(addDays(currentWeekStart, 6)) +
        " · блюд: " + meals.length;

      if (!meals.length) {
        box.innerHTML = "<p>Сначала составьте меню недели.</p>";
        return;
      }

      let mealsHtml = "";
      meals.forEach(function (meal) {
        let peopleHtml = "";
        people.forEach(function (person) {
          const x = saved.get(feedbackKey(meal.id, person.id)) || {};
          const boxKey = escapeHtml(meal.id) + "|" + escapeHtml(person.id);
          peopleHtml +=
            '<div data-hard-feedback-box="' + boxKey + '" style="padding:10px;border:1px solid #444;border-radius:10px">' +
              '<b>' + escapeHtml(person.role === "husband" ? "Муж" : "Жена") + " · " + escapeHtml(person.name) + '</b>' +
              '<div style="display:grid;gap:7px;margin-top:8px">' +
                '<select data-f="taste" style="' + formControlStyle("padding:8px") + '">' +
                  '<option value="">Вкус — не оценён</option>' +
                  '<option value="liked" ' + (x.taste === "liked" ? "selected" : "") + '>👍 понравилось</option>' +
                  '<option value="neutral" ' + (x.taste === "neutral" ? "selected" : "") + '>😐 нормально</option>' +
                  '<option value="disliked" ' + (x.taste === "disliked" ? "selected" : "") + '>👎 не понравилось</option>' +
                '</select>' +
                '<select data-f="portion" style="' + formControlStyle("padding:8px") + '">' +
                  '<option value="">Порция — не оценена</option>' +
                  '<option value="too_little" ' + (x.portion === "too_little" ? "selected" : "") + '>мало</option>' +
                  '<option value="ok" ' + (x.portion === "ok" ? "selected" : "") + '>нормально</option>' +
                  '<option value="too_much" ' + (x.portion === "too_much" ? "selected" : "") + '>много</option>' +
                '</select>' +
                '<label>Сытость 0–10<input data-f="satiety" type="number" min="0" max="10" value="' + escapeHtml(x.satiety == null ? "" : x.satiety) + '" style="' + formControlStyle("padding:8px;margin-top:3px") + '"></label>' +
                '<label><input data-f="snack_eaten" type="checkbox" ' + (x.snack_eaten ? "checked" : "") + '> перекус был съеден</label>' +
                '<label><input data-f="strong_hunger" type="checkbox" ' + (x.strong_hunger ? "checked" : "") + '> был сильный голод</label>' +
                '<label><input data-f="leftovers" type="checkbox" ' + (x.leftovers ? "checked" : "") + '> осталась еда</label>' +
                '<select data-f="action" style="' + formControlStyle("padding:8px") + '">' +
                  '<option value="">Частота — без изменения</option>' +
                  '<option value="more_often" ' + (x.action === "more_often" ? "selected" : "") + '>готовить чаще</option>' +
                  '<option value="less_often" ' + (x.action === "less_often" ? "selected" : "") + '>готовить реже</option>' +
                  '<option value="never" ' + (x.action === "never" ? "selected" : "") + '>больше не предлагать</option>' +
                '</select>' +
                '<textarea data-f="comment" rows="2" placeholder="Комментарий" style="' + formControlStyle("resize:vertical;padding:8px") + '">' + escapeHtml(x.comment || "") + '</textarea>' +
                '<button data-hard-feedback-save="' + boxKey + '">Сохранить</button>' +
                '<span data-hard-feedback-status style="font-size:12px;opacity:.75"></span>' +
              '</div>' +
            '</div>';
        });

        const mealLabel = (MEAL_TYPES.find(function (pair) { return pair[0] === meal.meal_type; }) || [null, meal.meal_type])[1];
        mealsHtml +=
          '<details style="padding:10px 0;border-top:1px solid #444">' +
            '<summary style="cursor:pointer"><b>' +
              escapeHtml(dayTitle(new Date(meal.meal_date + "T12:00:00"))) +
              '</b> · ' + escapeHtml(mealLabel) + ' · ' + escapeHtml(meal.title) +
            '</summary>' +
            '<div style="display:grid;gap:12px;margin-top:10px">' + peopleHtml + '</div>' +
          '</details>';
      });

      box.innerHTML =
        '<div style="margin-bottom:12px"><button id="hardExportFeedback">Выгрузить в ИИ</button></div>' +
        mealsHtml;

      box.querySelectorAll("[data-hard-feedback-save]").forEach(function (button) {
        button.addEventListener("click", async function () {
          const parts = button.dataset.hardFeedbackSave.split("|");
          const mealId = parts[0];
          const memberId = parts[1];
          const feedbackBox = box.querySelector('[data-hard-feedback-box="' + mealId + "|" + memberId + '"]');
          const get = function (name) { return feedbackBox.querySelector('[data-f="' + name + '"]'); };
          const message = feedbackBox.querySelector("[data-hard-feedback-status]");
          button.disabled = true;
          message.textContent = "Сохраняем…";
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
            message.textContent = "Сохранено";
          } catch (error) {
            message.textContent = "Ошибка: " + error.message;
          } finally {
            button.disabled = false;
          }
        });
      });

      document.querySelector("#hardExportFeedback").addEventListener("click", async function () {
        const fresh = await api("feedback.list", { week_id: weekData.week.id });
        const payload = {
          week_start: weekData.week.week_start,
          meals: meals.map(function (m) {
            return { id: m.id, date: m.meal_date, type: m.meal_type, title: m.title, recipe_key: m.recipe_key };
          }),
          feedback: fresh.feedback || [],
        };
        const text = JSON.stringify(payload, null, 2);
        try {
          await navigator.clipboard.writeText(text);
          document.querySelector("#hardExportFeedback").textContent = "Скопировано";
        } catch {
          prompt("Скопируй данные для ИИ", text);
        }
      });
    } catch (error) {
      status.textContent = "Ошибка: " + error.message;
      box.innerHTML = "";
    }
  }

  document.querySelectorAll(".tile").forEach(function (button) {
    button.addEventListener("click", async function () {
      const action = button.dataset.action;
      if (action === "shopping-server") {
        await showServerShopping();
      } else if (action === "settings") {
        await showPlannerSettings();
      } else if (action === "feedback") {
        await showPlannerFeedback();
      }
    });
  });
})();
