// Вкладка «Фитнес»: стартовый 12-недельный план жены в DDX — занятия A/B/C, дневник, справка.
// Подключается из app-v2.js; данные — family-api (fitness.get / fitness.save), общие для всей семьи.
(function () {
  "use strict";

  // [название, подходы, повторы, отдых, мышцы, как выполнять, контроль, если тренажёра нет]
  const EX = {
    A: [
      ["Жим ногами", "2–3", "10–12", "90–120 сек", "Ноги и ягодицы", "Сядь, прижми спину и таз к спинке. Стопы на ширине плеч, вся стопа на платформе. Опускай платформу до комфортной глубины, пока таз не отрывается. Выжимай без резкого выпрямления коленей.", "Колени направлены туда же, куда носки. Не подкручивай таз и не отрывай пятки.", "Если не знаешь, как снять фиксатор, попроси сотрудника показать."],
      ["Ягодичный мост в тренажёре", "2–3", "10–12", "90–120 сек", "Ягодицы", "Валик на области таза. Подними таз до положения, где корпус и бёдра почти на одной линии. Сожми ягодицы и медленно опусти.", "Не прогибай поясницу и не поднимай таз за счёт спины.", "Если тренажёра нет — мост на полу без веса."],
      ["Сгибание ног сидя", "2", "12–15", "60–90 сек", "Задняя поверхность бедра", "Настрой валик на нижнюю часть голени, зафиксируй бёдра. Согни ноги и плавно вернись.", "Таз остаётся на сиденье. Не бросай вес.", "Можно использовать тренажёр для сгибания ног лёжа."],
      ["Отведение бёдер", "2", "15–20", "60 сек", "Средняя ягодичная", "Сядь глубоко, спина на опоре. Медленно разведи колени, затем верни обратно.", "Не раскачивай корпус и не раскрывай ноги через боль.", "Отведение ноги в сторону в блоке — только после показа настройки."],
      ["Тяга верхнего блока", "2–3", "10–12", "75–90 сек", "Спина", "Зафиксируй бёдра. Потяни рукоять к верхней части груди, локти направляй вниз. Медленно выпрями руки.", "Не тяни за голову и не раскачивай корпус.", "Попроси показать настройку фиксаторов."],
      ["Жим от груди", "2", "10–12", "75–90 сек", "Грудь и руки", "Настрой сиденье так, чтобы рукояти были на уровне середины груди. Выжми вперёд и плавно верни.", "Не поднимай плечи к ушам и не блокируй локти.", "Если плечу неприятно — остановись."],
    ],
    B: [
      ["Разгибание ног", "2", "12–15", "60–75 сек", "Передняя поверхность бедра", "Ось тренажёра примерно на уровне колена. Разогни ноги плавно и медленно опусти валик.", "Без рывка и чрезмерного веса.", "Можно заменить лёгким жимом ногами."],
      ["Сгибание ног", "2–3", "10–12", "75–90 сек", "Задняя поверхность бедра", "Зафиксируй бёдра, согни ноги против сопротивления и плавно верни.", "Таз не отрывается от опоры.", "Другой тренажёр для сгибания ног."],
      ["Горизонтальная тяга", "2–3", "10–12", "75–90 сек", "Средняя часть спины", "Сядь устойчиво. Потяни рукоять к нижним рёбрам, локти веди назад. Медленно выпрями руки.", "Не раскачивайся и не округляй поясницу.", "Тяга с упором грудью."],
      ["Жим от груди", "2", "10–12", "75–90 сек", "Грудные мышцы", "Спина прижата, стопы на полу. Выжми рукояти вперёд и верни контролируемо.", "При боли в плече прекрати упражнение.", "Другой грудной тренажёр с комфортной траекторией."],
      ["Отведение ноги назад", "2", "12–15 на ногу", "60 сек", "Ягодицы", "С манжетой нижнего блока держись за опору и отведи ногу назад на небольшую амплитуду.", "Таз вперёд, не прогибай поясницу.", "Только если сотрудник показал настройку манжеты."],
      ["Жим Паллофа (удержание корпуса от поворота)", "2", "8–10 на сторону", "45–60 сек", "Корпус", "Встань боком к блоку. Рукоять у груди. Выпрями руки, не позволяя корпусу повернуться. Верни и поменяй сторону.", "Не вращай таз и не задерживай дыхание.", "Если не уверена в блоке, пропусти и уточни технику."],
      ["«Мёртвый жук» — пресс лёжа", "2", "6–8 на сторону", "45 сек", "Пресс и контроль корпуса", "Лёжа на спине, подними согнутые ноги и руки. Медленно опусти противоположные руку и ногу, сохраняя поясницу стабильной.", "Сократи амплитуду, если поясница прогибается.", "Скольжение пяткой по полу."],
    ],
    C: [
      ["Жим ногами", "2", "12", "90 сек", "Ноги и ягодицы", "Поставь стопы на ширине плеч. Опусти платформу комфортно и плавно выжми.", "Умеренный вес, не проверяй рекорды.", "Попроси показать тренажёр для ног."],
      ["Ягодичный мост в тренажёре", "2–3", "10–12", "90–120 сек", "Ягодицы", "Подними таз за счёт ягодиц, задержись на секунду и плавно опустись.", "Без переразгибания поясницы.", "Мост на полу."],
      ["Отведение бёдер", "2", "15–20", "60 сек", "Средняя ягодичная", "Разводи колени с контролем и возвращай обратно.", "Без раскачивания.", "Отведение ноги с манжетой после инструктажа."],
      ["Тяга верхнего блока", "2–3", "10–12", "75–90 сек", "Спина и подготовка к пилону", "Потяни рукоять к груди, веди локти вниз, верни руки плавно.", "Не тяни за голову и не дёргай вес.", "Нейтральный хват на верхнем блоке."],
      ["Тяга каната к лицу", "2", "12–15", "60 сек", "Плечи и лопатки", "Канат на высоте лица. Потяни к лицу, разводя кисти в стороны. Верни медленно.", "Лёгкий вес, плечи не поднимай к ушам.", "Обратная бабочка с лёгким весом после настройки."],
      ["Удержание гантелей", "2", "15–20 сек", "60 сек", "Хват и предплечья", "Возьми лёгкие гантели, руки вдоль тела. Стой ровно, затем поставь их на место.", "Не задерживай дыхание. Не продолжай при боли или онемении.", "Удержание устойчивых рукоятей."],
      ["Боковая планка с колен", "2", "15–25 сек на сторону", "45 сек", "Боковые мышцы корпуса", "Локоть под плечом, колени согнуты. Подними таз и удерживай, спокойно дыша.", "Не проваливайся в плечо.", "Боковое удержание у стены."],
    ],
  };
  const DAYS = {
    A: { chip: "ПН · А", letter: "А", title: "Ягодицы, ноги и спина" },
    B: { chip: "СР · Б", letter: "Б", title: "Всё тело и корпус" },
    C: { chip: "ПТ · В", letter: "В", title: "Ягодицы, верх тела и хват" },
  };
  const PHASES = [
    null,
    { weeks: "Недели 1–2", hint: "Осваиваем технику. Два рабочих подхода, лёгкий вес, 3–4 повтора в запасе." },
    { weeks: "Недели 3–4", hint: "Закрепляем движения. Третий подход — только если хорошо восстанавливаешься." },
    { weeks: "Недели 5–8", hint: "Постепенно увеличиваем вес при стабильной технике." },
    { weeks: "Недели 9–12", hint: "Закрепляем прогресс. Не тестируем максимальные веса." },
  ];
  const MOODS = ["Комфортно", "Было тяжело, но техника сохранялась", "Сильно устала", "Была боль или необычные симптомы"];
  const SLEEP = ["Менее 6 часов", "6–7 часов", "7–8 часов", "Более 8 часов"];
  const ENERGY = ["Хорошее", "Обычное", "Устала", "Плохое"];
  const WEEK_MS = 7 * 24 * 3600 * 1000;
  const CACHE = "doma_fitness_cache";
  const DIRTY = "doma_fitness_dirty";

  // ---------- состояние ----------
  const norm = (d) => {
    d = d && typeof d === "object" ? d : {};
    return {
      checks: d.checks || {}, logs: d.logs || {},
      sessions: Array.isArray(d.sessions) ? d.sessions : [],
      measures: Array.isArray(d.measures) ? d.measures : [],
      daily: Array.isArray(d.daily) ? d.daily : [],
      start: Number(d.start) > 0 ? Number(d.start) : null,
    };
  };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
  };
  let S = (() => { try { return norm(JSON.parse(store.get(CACHE))); } catch { return norm(); } })();
  let ctx = null, box = null, sub = "train";
  let day = ({ 1: "A", 2: "B", 3: "B", 4: "C", 5: "C" })[new Date().getDay()] || "A";
  let timer = 0, busy = false, again = false, moved = false, syncText = "";

  const week = () => Math.min(12, Math.max(1, Math.floor((Date.now() - (S.start || Date.now())) / WEEK_MS) + 1));
  const phaseOf = (w) => (w <= 2 ? 1 : w <= 4 ? 2 : w <= 8 ? 3 : 4);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const today = () => new Date().toLocaleDateString("ru-RU");
  const esc = (v) => ctx.esc(v);

  // ---------- синхронизация с базой ----------
  function setSync(text) {
    syncText = text;
    box?.querySelectorAll(".fx-sync").forEach((el) => { el.textContent = text; });
  }
  function cache() { store.set(CACHE, JSON.stringify(S)); }
  function save() {
    S.start = S.start || Date.now();
    cache();
    store.set(DIRTY, "1");
    setSync("Сохраняю…");
    clearTimeout(timer);
    timer = setTimeout(push, 700);
  }
  async function push() {
    if (busy) { again = true; return; }
    busy = true;
    const m = moved; moved = false;
    try {
      const r = await ctx.api("fitness.save", { state: { ...S, start_set: m } });
      store.set(DIRTY, null);
      // сервер добавил записи с других телефонов — берём журналы, текущие поля не трогаем
      const n = norm(r.state);
      S.sessions = n.sessions; S.measures = n.measures; S.daily = n.daily;
      if (n.start) S.start = n.start;
      cache();
      setSync("Сохранено · видно всей семье");
      if (sub === "progress") refreshHistory();
    } catch {
      moved = moved || m;
      setSync("Нет связи — сохраню, когда появится");
    } finally {
      busy = false;
      if (again) { again = false; push(); }
    }
  }
  async function pull() {
    setSync("Загружаю…");
    try {
      const r = await ctx.api("fitness.get");
      const hasLocal = S.start || S.sessions.length || S.measures.length || S.daily.length;
      if (store.get(DIRTY) === "1" || !r.state) {
        if (r.state || hasLocal) await push(); else setSync("Сохранено · видно всей семье");
        return false;
      }
      S = norm(r.state);
      cache();
      setSync("Сохранено · видно всей семье");
      return true;
    } catch {
      setSync("Нет связи — показываю копию с телефона");
      return false;
    }
  }

  // ---------- экраны ----------
  const field = (label, html) => `<label class="fx-field">${label}${html}</label>`;
  const options = (list, sel) => list.map((x) => `<option${x === sel ? " selected" : ""}>${esc(x)}</option>`).join("");
  const syncLine = () => `<p class="muted fx-sync">${esc(syncText)}</p>`;

  function trainHtml() {
    const w = week(), p = phaseOf(w), list = EX[day], c = S.checks[day] || {}, logs = S.logs[day] || {};
    const done = list.filter((_, i) => c[i]).length;
    return `
      <div class="card fx-hero">
        <div class="fx-eyebrow">Цикл 12 недель · Пн, Ср, Пт</div>
        <div class="fx-week">
          <button class="btn-ghost" data-wk="-1" aria-label="Неделя назад" ${w <= 1 ? "disabled" : ""}>−</button>
          <b>Неделя ${w} из 12</b>
          <button class="btn-ghost" data-wk="1" aria-label="Неделя вперёд" ${w >= 12 ? "disabled" : ""}>+</button>
        </div>
        <p class="muted"><b>${PHASES[p].weeks}.</b> ${esc(PHASES[p].hint)}</p>
      </div>
      <div class="fb-chips fx-days" role="tablist">${Object.keys(DAYS).map((k) =>
        `<button class="fb-chip${k === day ? " on" : ""}" data-day="${k}" role="tab" aria-selected="${k === day}">${DAYS[k].chip}</button>`).join("")}</div>
      <div class="shopping-progress">
        <div class="fx-prog"><b>${esc(DAYS[day].title)}</b><span id="fxCount">${done}/${list.length}</span></div>
        <progress id="fxBar" max="${list.length}" value="${done}"></progress>
      </div>
      ${list.map((x, i) => {
        const l = logs[i] || {};
        return `<article class="fx-ex${c[i] ? " done" : ""}">
          <label class="fx-ex-head"><span class="fx-num">${i + 1}</span><b>${esc(x[0])}</b><input type="checkbox" data-check="${i}" ${c[i] ? "checked" : ""} aria-label="Сделано"></label>
          <div class="fx-tags"><span>${p === 1 ? "2" : esc(x[1])} подхода</span><span>${esc(x[2])}</span><span>Отдых ${esc(x[3])}</span><span>${esc(x[4])}</span></div>
          <div class="feedback-grid">
            ${field("Вес / настройка", `<input data-log="${i}" data-f="w" value="${esc(l.w || "")}" placeholder="Например, 15 кг">`)}
            ${field("Повторы", `<input data-log="${i}" data-f="r" value="${esc(l.r || "")}" placeholder="${esc(x[2])}">`)}
          </div>
          <details><summary>Техника и подсказки</summary><div class="fx-inst">
            <b>Как выполнять</b><p>${esc(x[5])}</p><b>Контроль</b><p>${esc(x[6])}</p><b>Если тренажёра нет</b><p>${esc(x[7])}</p>
          </div></details>
        </article>`;
      }).join("")}
      <div class="card">
        <h3>Завершение занятия</h3>
        ${field("Как прошло занятие?", `<select id="fxMood">${options(MOODS)}</select>`)}
        <button id="fxSaveWork" class="fx-wide">Сохранить тренировку</button>
        <button id="fxReset" class="btn-ghost fx-wide">Сбросить отметки дня</button>
        ${syncLine()}
      </div>`;
  }

  function measuresHtml() {
    return S.measures.length ? S.measures.map((x) => `<div class="fx-row"><b>${esc(x.date)}</b>
      <span>Вес ${esc(x.w || "—")} кг · талия ${esc(x.waist || "—")} · живот ${esc(x.belly || "—")} · ягодицы ${esc(x.hips || "—")} см</span>
      ${x.note ? `<small>${esc(x.note)}</small>` : ""}</div>`).join("") : '<p class="muted">Пока нет записей.</p>';
  }
  function sessionsHtml() {
    return S.sessions.length ? S.sessions.map((x) => {
      const list = EX[x.day] || [];
      const weights = Object.entries(x.logs || {}).filter(([, l]) => l && (l.w || l.r))
        .map(([i, l]) => `${list[i]?.[0] || "Упражнение"}: ${[l.w, l.r && "× " + l.r].filter(Boolean).join(" ")}`);
      return `<div class="fx-row"><b>${esc(x.date)} · тренировка ${esc(DAYS[x.day]?.letter || x.day)}</b>
        <span>${Number(x.done) || 0}/${Number(x.total) || 0} упражнений · ${esc(x.mood)}</span>
        ${weights.length ? `<small>${esc(weights.join("; "))}</small>` : ""}</div>`;
    }).join("") : '<p class="muted">Пока нет записей.</p>';
  }
  function dailyHtml() {
    return S.daily.length ? S.daily.slice(0, 30).map((x) => `<div class="fx-row"><b>${esc(x.date)}</b>
      <span>${[x.steps && x.steps + " шагов", x.sleep && x.sleep !== "Выбрать" && "сон " + x.sleep.toLowerCase(), x.energy && "самочувствие: " + x.energy.toLowerCase()].filter(Boolean).map(esc).join(" · ") || "—"}</span>
      ${x.note ? `<small>${esc(x.note)}</small>` : ""}</div>`).join("") : '<p class="muted">Пока нет записей.</p>';
  }

  function progressHtml() {
    return `
      <div class="card">
        <h3>Замеры</h3>
        <p class="muted">Раз в 4 недели, утром и в одинаковых условиях.</p>
        <div class="feedback-grid">
          ${field("Вес, кг", '<input id="fxW" type="number" step=".1" inputmode="decimal" placeholder="65">')}
          ${field("Талия, см", '<input id="fxWaist" type="number" step=".1" inputmode="decimal">')}
          ${field("Живот, см", '<input id="fxBelly" type="number" step=".1" inputmode="decimal">')}
          ${field("Ягодицы, см", '<input id="fxHips" type="number" step=".1" inputmode="decimal">')}
        </div>
        ${field("Комментарий", '<textarea id="fxMNote" rows="2" placeholder="Самочувствие, изменения…"></textarea>')}
        <button id="fxSaveMeasure" class="fx-wide">Сохранить замеры</button>
        ${syncLine()}
      </div>
      <h3>История замеров</h3><div id="fxMeasures">${measuresHtml()}</div>
      <h3>Журнал тренировок</h3><div id="fxSessions">${sessionsHtml()}</div>
      <h3>Дни</h3><div id="fxDaily">${dailyHtml()}</div>`;
  }

  function dayHtml() {
    return `
      <div class="card">
        <h3>Ежедневная отметка</h3>
        <div class="feedback-grid">
          ${field("Шаги", '<input id="fxSteps" type="number" inputmode="numeric" placeholder="4500">')}
          ${field("Сон", `<select id="fxSleep"><option value="">Выбрать</option>${options(SLEEP)}</select>`)}
        </div>
        ${field("Самочувствие", `<select id="fxEnergy">${options(ENERGY)}</select>`)}
        ${field("Заметка", '<textarea id="fxDNote" rows="2" placeholder="Прогулка, стресс, восстановление…"></textarea>')}
        <button id="fxSaveDay" class="fx-wide">Сохранить день</button>
        ${syncLine()}
      </div>
      <div class="card fx-text">
        <h3>Небольшие ориентиры</h3>
        <ul>
          <li>Сейчас ориентир — 3–5 тысяч шагов. Добавляй понемногу, небольшими прогулками.</li>
          <li>Постепенно увеличивай время сна; взрослым обычно рекомендуют 7–9 часов.</li>
          <li>После плохого сна не повышай веса. При выраженной усталости облегчи занятие.</li>
          <li>В дни без зала достаточно прогулки и восстановления.</li>
        </ul>
      </div>`;
  }

  function guideHtml() {
    const rows = [["Пн", "Тренировка А — ноги, ягодицы, спина"], ["Вт", "Прогулка и обычная активность"], ["Ср", "Тренировка Б — всё тело и корпус"],
      ["Чт", "Прогулка, мягкая мобильность"], ["Пт", "Тренировка В — ягодицы, верх тела, хват"], ["Сб, Вс", "Отдых и прогулки по желанию"]];
    const path = [["1–2", "Освоить тренажёры и технику."], ["3–4", "Закрепить движения, при готовности добавить подход."],
      ["5–8", "Постепенно увеличивать рабочие веса."], ["9–12", "Закрепить прогресс и оценить готовность к следующему этапу."]];
    return `
      <div class="card">
        <h3>Ритм недели</h3>
        ${rows.map(([d, t]) => `<div class="meal-row"><span class="meal-label">${d}</span><span>${t}</span></div>`).join("")}
      </div>
      <div class="card">
        <h3>Путь на 12 недель</h3>
        <div class="fx-path">${path.map(([w, t]) => `<div><b>${w}</b><span>${t}</span></div>`).join("")}</div>
        <div class="success-box">Повышай вес, только если верхняя граница повторений получается с хорошей техникой и запасом 2–3 повтора на двух тренировках подряд. Не увеличивай одновременно вес, подходы и кардио.</div>
      </div>
      <div class="card fx-text">
        <h3>Как начать в зале</h3>
        <ol>
          <li>Выбери тренировку А, Б или В, возьми воду и переоденься.</li>
          <li>5–7 минут спокойно походи на дорожке или покрути велосипед.</li>
          <li>Найди первый тренажёр, прочитай схему на корпусе. Если настройки или фиксаторы непонятны — попроси сотрудника показать.</li>
          <li>Начни с минимального веса и сделай пробный подход.</li>
          <li>Выполняй упражнения по порядку, отдыхай указанное время.</li>
          <li>В конце спокойно походи, запиши веса и самочувствие.</li>
        </ol>
      </div>
      <div class="card fx-text">
        <h3>Техника и безопасность</h3>
        <ul>
          <li>Двигай вес плавно, не бросай груз.</li>
          <li>Выдыхай на усилии, вдыхай при возвращении.</li>
          <li>Не задерживай дыхание и не работай через острую боль.</li>
          <li>На старте оставляй 3–4 повтора в запасе.</li>
          <li>Если тренажёр незнаком — не угадывай настройки.</li>
        </ul>
        <div class="error-box"><b>Останови тренировку</b>, если появилась боль или сдавление в груди, предобморочное состояние, необычная сильная одышка, выраженное головокружение или острая суставная боль. При тяжёлых или сохраняющихся симптомах обратись за медицинской помощью.</div>
      </div>
      <div class="card fx-text">
        <h3>Подготовка к пилону</h3>
        <p>Первый цикл укрепляет спину, плечи, лопатки, хват и мышцы корпуса. После трёхлетнего перерыва не начинай самостоятельно сложные висы, инверты и трюки. Возвращайся постепенно, с инструктором и страховкой.</p>
        <h3>Сауна и хаммам</h3>
        <p>Это необязательная возможность расслабиться, а не способ сжигать жир. Начинай с короткого посещения, выходи при ухудшении самочувствия. Не используй жару при обезвоживании или головокружении.</p>
        <h3>Важно помнить</h3>
        <p>Нельзя локально сжечь жир на животе отдельными упражнениями. Тренировка грудных мышц укрепляет мышцы и может улучшить осанку, но не увеличивает ткань молочной железы. Вес 50 кг при росте 168 см ниже стандартной нижней границы ИМТ — ориентируйся прежде всего на силу, здоровье и состав тела, а не на эту цифру.</p>
      </div>
      <p class="muted fx-foot">Личный тренировочный помощник · не заменяет медицинскую консультацию</p>`;
  }

  // ---------- отрисовка и обработчики ----------
  function render() {
    if (!box?.isConnected) return;
    const html = { train: trainHtml, progress: progressHtml, day: dayHtml, guide: guideHtml }[sub] || trainHtml;
    box.innerHTML = html();
    bind();
  }
  function refreshHistory() {
    const set = (id, html) => { const el = box?.querySelector(id); if (el) el.innerHTML = html; };
    set("#fxMeasures", measuresHtml()); set("#fxSessions", sessionsHtml()); set("#fxDaily", dailyHtml());
  }
  const val = (id) => box.querySelector(id)?.value?.trim() || "";

  function bind() {
    const on = (sel, ev, fn) => box.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, () => fn(el)));
    on("[data-wk]", "click", (b) => {
      const d = Number(b.dataset.wk), w = week() + d;
      if (w < 1 || w > 12) return;
      S.start = (S.start || Date.now()) - d * WEEK_MS;
      moved = true;
      ctx.haptic();
      save(); render();
    });
    on("[data-day]", "click", (b) => { if (b.dataset.day === day) return; day = b.dataset.day; ctx.haptic(); render(); });
    on("[data-check]", "change", (cb) => {
      S.checks[day] = S.checks[day] || {};
      S.checks[day][cb.dataset.check] = cb.checked;
      cb.closest(".fx-ex").classList.toggle("done", cb.checked);
      const n = EX[day].filter((_, i) => S.checks[day][i]).length;
      box.querySelector("#fxCount").textContent = n + "/" + EX[day].length;
      box.querySelector("#fxBar").value = n;
      ctx.haptic(cb.checked ? "light" : "select");
      save();
    });
    on("[data-log]", "input", (el) => {
      const logs = (S.logs[day] = S.logs[day] || {});
      logs[el.dataset.log] = { ...(logs[el.dataset.log] || {}), [el.dataset.f]: el.value };
      save();
    });
    on("#fxSaveWork", "click", () => {
      const c = S.checks[day] || {};
      S.sessions.unshift({ id: uid(), ts: Date.now(), date: today(), day, done: Object.values(c).filter(Boolean).length,
        total: EX[day].length, mood: val("#fxMood"), logs: JSON.parse(JSON.stringify(S.logs[day] || {})) });
      ctx.haptic("medium");
      save();
      ctx.notify("Тренировка сохранена в журнал.");
    });
    on("#fxReset", "click", async () => {
      if (!(await ctx.confirm("Сбросить отметки и веса этого дня?"))) return;
      delete S.checks[day]; delete S.logs[day];
      save(); render();
    });
    on("#fxSaveMeasure", "click", () => {
      const m = { w: val("#fxW"), waist: val("#fxWaist"), belly: val("#fxBelly"), hips: val("#fxHips"), note: val("#fxMNote") };
      if (!Object.values(m).some(Boolean)) { ctx.notify("Заполни хотя бы одно поле."); return; }
      S.measures.unshift({ id: uid(), ts: Date.now(), date: today(), ...m });
      ctx.haptic("medium");
      save(); render();
    });
    on("#fxSaveDay", "click", () => {
      const d = { steps: val("#fxSteps"), sleep: val("#fxSleep"), energy: val("#fxEnergy"), note: val("#fxDNote") };
      S.daily.unshift({ id: uid(), ts: Date.now(), date: today(), ...d });
      ctx.haptic("medium");
      save(); render();
      ctx.notify("День сохранён.");
    });
  }

  async function mount(el, context, screen) {
    ctx = context; box = el; sub = screen || "train";
    render();
    if (await pull()) render();
  }

  window.Fitness = { mount, _test: { norm, phaseOf, EX } };
})();
