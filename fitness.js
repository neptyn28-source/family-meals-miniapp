// Вкладка «Фитнес»: две 12-недельные программы в DDX — жены (fitness-wife.json) и мужа (fitness-me.json).
// Переключатель «Жена / Муж» вверху; у каждого свой дневник. Фото тренажёров — fitness-img/<модель>.webp (копии с сайта Matrix).
// Подключается из app-v2.js; дневник — family-api (fitness.get / fitness.save с who), общий для всей семьи.
(function () {
  "use strict";

  const PEOPLE = {
    wife: { label: "Жена", url: "fitness-wife.json", prog: "wife-split-1", suffix: "" },
    me: { label: "Муж", url: "fitness-me.json", prog: "me-aesthetic-1", suffix: "_me" },
  };
  const WHO_KEY = "doma_fitness_who";
  // Названия упражнений старой программы — чтобы старые записи журнала читались правильно.
  const OLD_NAMES = {
    A: ["Жим ногами", "Ягодичный мост в тренажёре", "Сгибание ног сидя", "Отведение бёдер", "Тяга верхнего блока", "Жим от груди"],
    B: ["Разгибание ног", "Сгибание ног", "Горизонтальная тяга", "Жим от груди", "Отведение ноги назад", "Жим Паллофа", "«Мёртвый жук»"],
    C: ["Жим ногами", "Ягодичный мост в тренажёре", "Отведение бёдер", "Тяга верхнего блока", "Тяга каната к лицу", "Удержание гантелей", "Боковая планка с колен"],
  };
  const LETTER = { A: "А", B: "Б", C: "В" };
  const MUSCLE = {
    chest_upper: "верх груди", chest_mid: "середина груди", delt_front: "передняя дельта", delt_mid: "средняя дельта",
    delt_rear: "задняя дельта", triceps: "трицепс", biceps: "бицепс", forearms: "предплечья и хват", lats: "широчайшие",
    traps_mid: "середина трапеции", traps_upper: "верх трапеции", rhomboids: "ромбовидные", lower_back: "поясница",
    abs: "пресс", obliques: "косые мышцы живота", glute_max: "большая ягодичная", glute_med: "средняя ягодичная",
    adductors: "приводящие", quads: "квадрицепс", hamstrings: "бицепс бедра", calves: "икры",
  };
  const SLEEP = ["Менее 6 часов", "6–7 часов", "7–8 часов", "Более 8 часов"];
  const WEEK_MS = 7 * 24 * 3600 * 1000;
  const male = () => P?.gender === "m";
  const moods = () => ["Комфортно", "Было тяжело, но техника сохранялась", male() ? "Сильно устал" : "Сильно устала", "Была боль или необычные симптомы"];
  const energy = () => ["Хорошее", "Обычное", male() ? "Устал" : "Устала", "Плохое"];
  const isTired = (e) => e === "Устала" || e === "Устал" || e === "Плохое";

  // ---------- состояние ----------
  // В checks/logs старой программы ключи — номера упражнений; у новой — код тренажёра. Номера отбрасываем.
  const byCode = (o) => {
    const out = {};
    for (const [d, v] of Object.entries(o && typeof o === "object" ? o : {})) {
      if (!v || typeof v !== "object") continue;
      const kept = Object.fromEntries(Object.entries(v).filter(([k]) => !/^\d+$/.test(k)));
      if (Object.keys(kept).length) out[d] = kept;
    }
    return out;
  };
  const norm = (d) => {
    d = d && typeof d === "object" ? d : {};
    return {
      checks: byCode(d.checks), logs: byCode(d.logs),
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
  let who = PEOPLE[store.get(WHO_KEY)] ? store.get(WHO_KEY) : "wife";
  const person = () => PEOPLE[who];
  const PROG = () => person().prog;
  // Ключи телефона: у жены прежние (без суффикса), у мужа — с «_me».
  const CACHE = () => "doma_fitness_cache" + person().suffix;
  const DIRTY = () => "doma_fitness_dirty" + person().suffix;
  const PCACHE = () => "doma_fitness_program" + person().suffix;
  const readState = () => { try { return norm(JSON.parse(store.get(CACHE()))); } catch { return norm(); } };
  const readProgram = () => { try { return JSON.parse(store.get(PCACHE())) || null; } catch { return null; } };
  let S = readState();
  let P = readProgram();
  let ctx = null, box = null, sub = "train";
  let day = ({ 1: "A", 2: "B", 3: "B", 4: "C", 5: "C" })[new Date().getDay()] || "A";
  let timer = 0, busy = false, again = false, moved = false, syncText = "";

  const week = () => Math.min(12, Math.max(1, Math.floor((Date.now() - (S.start || Date.now())) / WEEK_MS) + 1));
  // Фазы берём из программы: «1–2», «3–6», «12»… Строки без цифр («Всегда») — не фазы.
  const phases = () => (P?.phases || []).filter((x) => /^\d/.test(String(x.weeks)));
  const range = (s) => { const [a, b] = String(s).split("–").map(Number); return [a, b || a]; };
  const phaseOf = (w) => Math.max(0, phases().findIndex((x) => { const [a, b] = range(x.weeks); return w >= a && w <= b; }));
  const phaseKey = (i) => "w" + String(phases()[i]?.weeks || "1–2").replace("–", "_");
  const codeOf = (it) => (String(it.model).match(/\(([A-Z]+\d*-[A-Z]+\d+)/) || [])[1] || it.name;
  // Стартовый вес: у жены одно число, у мужа — план по подходам (берём первый рабочий).
  const startKg = (it) => it.start_kg ?? (it.plan_kg || []).find((x) => x.set !== "разминка")?.kg ?? "";
  const planLine = (it) => (it.plan_kg || []).map((x) => (x.set === "разминка" ? "разминка " : "") + (x.kg ? String(x.kg).replace(".", ",") + " кг" : "свой вес") + " × " + x.reps).join(" → ");
  const items = (d) => P?.days?.[d]?.items || [];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const today = () => new Date().toLocaleDateString("ru-RU");
  const esc = (v) => ctx.esc(v);
  const kg = (n) => String(n).replace(".", ",") + " кг";

  // Последний записанный вес этого упражнения — подсказка в поле «Вес».
  function lastWeight(d, code) {
    for (const s of S.sessions) {
      if (s.day !== d || s.prog !== PROG()) continue;
      const w = s.logs?.[code]?.w;
      if (w) return w;
    }
    return "";
  }
  // Сегодня отмечен плохой сон или усталость — напоминание не повышать веса.
  function tiredToday() {
    const x = S.daily.find((e) => e.date === today());
    return !!x && (x.sleep === SLEEP[0] || isTired(x.energy));
  }

  // ---------- программа ----------
  async function loadProgram() {
    try {
      const r = await fetch(person().url + "?v=" + Date.now(), { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      P = await r.json();
      store.set(PCACHE(), JSON.stringify(P));
    } catch (e) {
      if (!P) throw new Error("Не загрузилась программа тренировок, проверьте интернет");
    }
  }

  // ---------- синхронизация с базой ----------
  function setSync(text) {
    syncText = text;
    box?.querySelectorAll(".fx-sync").forEach((el) => { el.textContent = text; });
  }
  function cache() { store.set(CACHE(), JSON.stringify(S)); }
  function save() {
    S.start = S.start || Date.now();
    cache();
    store.set(DIRTY(), "1");
    setSync("Сохраняю…");
    clearTimeout(timer);
    timer = setTimeout(push, 700);
  }
  async function push() {
    if (busy) { again = true; return; }
    busy = true;
    const m = moved; moved = false;
    try {
      const w = who, state = { ...S, start_set: m };
      const r = await ctx.api("fitness.save", { who: w, state });
      if (w !== who) return; // пока сохраняли, переключились на другого — его S не трогаем
      store.set(DIRTY(), null);
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
      const w = who;
      const r = await ctx.api("fitness.get", { who: w });
      if (w !== who) return false;
      const hasLocal = S.start || S.sessions.length || S.measures.length || S.daily.length;
      if (store.get(DIRTY()) === "1" || !r.state) {
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
  const para = (title, text) => (text ? `<b>${esc(title)}</b><p>${esc(text)}</p>` : "");
  const plural = (n) => (/(^|[^1])1$/.test(n) ? "подход" : /(^|[^1])[234]$/.test(n) ? "подхода" : "подходов");

  function muscles(it) {
    const chip = (k, cls) => `<span class="fx-m ${cls}">${esc(MUSCLE[k] || k)}</span>`;
    return `<div class="fx-muscles">${(it.muscles_main || []).map((k) => chip(k, "main")).join("")}${(it.muscles_secondary || []).map((k) => chip(k, "sec")).join("")}</div>`;
  }
  function photo(it) {
    const local = "fitness-img/" + codeOf(it).toLowerCase() + ".webp";
    return `<figure class="fx-photo"><img src="${esc(local)}" data-alt-src="${esc(it.image || "")}" alt="${esc(it.model)}" loading="lazy" decoding="async">
      <figcaption>${esc(it.model)}</figcaption></figure>`;
  }

  function exerciseHtml(it, i, ph, c, logs) {
    const code = codeOf(it), l = logs[code] || {}, sets = it.sets?.[phaseKey(ph)] || "2";
    const last = lastWeight(day, code);
    return `<article class="fx-ex${c[code] ? " done" : ""}">
      <label class="fx-ex-head"><span class="fx-num">${i + 1}</span><b>${esc(it.name)}</b><input type="checkbox" data-check="${esc(code)}" ${c[code] ? "checked" : ""} aria-label="Сделано"></label>
      <div class="fx-tags"><span>${esc(sets)} ${plural(sets)}</span><span>${esc(it.reps)}</span><span>Отдых ${esc(it.rest)}</span><span class="fx-kg">Старт ${esc(kg(startKg(it)))}</span></div>
      ${it.plan_kg ? `<p class="fx-plan">${esc(planLine(it))}</p>` : ""}
      ${photo(it)}
      ${muscles(it)}
      <div class="feedback-grid">
        ${field("Вес, кг", `<input data-log="${esc(code)}" data-f="w" value="${esc(l.w || "")}" inputmode="decimal" placeholder="${esc(last ? "Было " + last : String(startKg(it)).replace(".", ","))}">`)}
        ${field("Повторы", `<input data-log="${esc(code)}" data-f="r" value="${esc(l.r || "")}" placeholder="${esc(it.reps)}">`)}
      </div>
      <details><summary>Настройка и техника</summary><div class="fx-inst">
        ${para("Мышцы", it.target)}
        ${it.combined_note ? `<div class="success-box">${esc(it.combined_note)}</div>` : ""}
        ${para("Настройка тренажёра", it.setup)}${para("Положение тела", it.position)}${para("Как выполнять", it.tech)}
        ${para("Докуда опускать и поднимать", it.range)}${para("Дыхание", it.breath)}${para("Частые ошибки", it.errors)}
        ${para("Как понять, что всё правильно", it.check)}${para("Когда прибавлять вес", it.step_rule)}${para("Если тренажёр занят", it.swap)}
      </div></details>
    </article>`;
  }

  function trainHtml() {
    const w = week(), ph = phaseOf(w), D = P.days[day], list = items(day), c = S.checks[day] || {}, logs = S.logs[day] || {};
    const done = list.filter((it) => c[codeOf(it)]).length;
    const phase = phases()[ph] || {};
    return `
      <div class="card fx-hero">
        <div class="fx-eyebrow">Сплит на 12 недель · Пн, Ср, Пт</div>
        <div class="fx-week">
          <button class="btn-ghost" data-wk="-1" aria-label="Неделя назад" ${w <= 1 ? "disabled" : ""}>−</button>
          <b>Неделя ${w} из 12</b>
          <button class="btn-ghost" data-wk="1" aria-label="Неделя вперёд" ${w >= 12 ? "disabled" : ""}>+</button>
        </div>
        <p class="muted"><b>${String(phase.weeks).includes("–") ? "Недели" : "Неделя"} ${esc(phase.weeks)}.</b> ${esc(phase.hint)}</p>
      </div>
      ${tiredToday() && P.recovery_rule ? `<div class="error-box fx-tired">${esc(P.recovery_rule)}</div>` : ""}
      <div class="fb-chips fx-days" role="tablist">${Object.keys(P.days).map((k) =>
        `<button class="fb-chip${k === day ? " on" : ""}" data-day="${k}" role="tab" aria-selected="${k === day}">${esc(P.days[k].chip)}</button>`).join("")}</div>
      <div class="shopping-progress">
        <div class="fx-prog"><b>${esc(D.title)}</b><span id="fxCount">${done}/${list.length}</span></div>
        <progress id="fxBar" max="${list.length}" value="${done}"></progress>
      </div>
      <div class="card fx-text fx-before">
        <p class="muted">${esc(D.focus || "")}</p>
        <details><summary>Разминка · 5–7 минут</summary><p>${esc(D.warmup)}</p></details>
      </div>
      ${list.map((it, i) => exerciseHtml(it, i, ph, c, logs)).join("")}
      <div class="card fx-text fx-after">
        <details><summary>Кардио после силовой</summary><p>${esc(D.cardio)}</p></details>
        <details><summary>Заминка · 5 минут</summary><p>${esc(D.cooldown)}</p></details>
        <details><summary>Хаммам и сауна</summary><p>${esc(D.spa)}</p></details>
      </div>
      <div class="card">
        <h3>Завершение занятия</h3>
        ${field("Как прошло занятие?", `<select id="fxMood">${options(moods())}</select>`)}
        <button id="fxSaveWork" class="fx-wide">Сохранить тренировку</button>
        <button id="fxReset" class="btn-ghost fx-wide">Сбросить отметки дня</button>
        ${syncLine()}
      </div>`;
  }

  const MEASURE_FIELDS = {
    wife: [["w", "Вес, кг", "65"], ["waist", "Талия, см"], ["belly", "Живот по пупку, см"], ["pelvis", "Бёдра (таз), см"],
      ["hips", "Ягодицы, см"], ["thigh", "Обхват бедра, см"], ["chest", "Грудь, см"]],
    me: [["w", "Вес, кг (среднее за неделю)", "87,5"], ["waist", "Талия, см"], ["chest", "Грудь, см"], ["shoulders", "Плечи, см"],
      ["arm", "Бицепс, см"], ["thigh", "Бедро, см"]],
  };
  const mfields = () => MEASURE_FIELDS[who];
  function measuresHtml() {
    return S.measures.length ? S.measures.map((x) => {
      const parts = mfields().slice(1).filter(([k]) => x[k]).map(([k, label]) => label.replace(", см", "").toLowerCase() + " " + x[k]);
      return `<div class="fx-row"><b>${esc(x.date)}</b>
      <span>Вес ${esc(x.w || "—")} кг${parts.length ? " · " + esc(parts.join(" · ")) + " см" : ""}</span>
      ${x.note ? `<small>${esc(x.note)}</small>` : ""}</div>`;
    }).join("") : '<p class="muted">Пока нет записей.</p>';
  }
  function exName(s, key) {
    if (s.logs?.[key]?.n) return s.logs[key].n;
    if (s.prog === PROG()) return items(s.day).find((it) => codeOf(it) === key)?.name || key;
    return (who === "wife" && OLD_NAMES[s.day]?.[key]) || "Упражнение";
  }
  function sessionsHtml() {
    return S.sessions.length ? S.sessions.map((x) => {
      const weights = Object.entries(x.logs || {}).filter(([, l]) => l && (l.w || l.r))
        .map(([k, l]) => `${exName(x, k)}: ${[l.w && l.w + " кг", l.r && "× " + l.r].filter(Boolean).join(" ")}`);
      return `<div class="fx-row"><b>${esc(x.date)} · тренировка ${esc(LETTER[x.day] || x.day)}${x.prog === PROG() ? "" : " (старая программа)"}</b>
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
        <p class="muted">${esc(P.measures_when || "")}</p>
        <div class="feedback-grid">
          ${mfields().map(([k, label, ph]) => field(label, `<input data-m="${k}" type="number" step=".1" inputmode="decimal"${ph ? ` placeholder="${ph}"` : ""}>`)).join("")}
        </div>
        ${field("Комментарий", '<textarea id="fxMNote" rows="2" placeholder="Фото сделаны, самочувствие…"></textarea>')}
        <button id="fxSaveMeasure" class="fx-wide">Сохранить замеры</button>
        ${syncLine()}
      </div>
      <h3>История замеров</h3><div id="fxMeasures">${measuresHtml()}</div>
      <h3>Журнал тренировок</h3><div id="fxSessions">${sessionsHtml()}</div>
      <h3>Дни</h3><div id="fxDaily">${dailyHtml()}</div>`;
  }

  function dayHtml() {
    const w = week();
    const steps = (P.steps || []).find((s) => {
      const [a, b] = String(s.weeks).split("–").map(Number);
      return w >= a && w <= (b || a);
    });
    return `
      <div class="card">
        <h3>Ежедневная отметка</h3>
        <div class="feedback-grid">
          ${field("Шаги", '<input id="fxSteps" type="number" inputmode="numeric" placeholder="5000">')}
          ${field("Сон", `<select id="fxSleep"><option value="">Выбрать</option>${options(SLEEP)}</select>`)}
        </div>
        ${field("Самочувствие", `<select id="fxEnergy">${options(energy())}</select>`)}
        ${field("Заметка", '<textarea id="fxDNote" rows="2" placeholder="${who === "me" ? "Спина, стресс, сауна…" : "Прогулка, стресс, цикл…"}"></textarea>')}
        <button id="fxSaveDay" class="fx-wide">Сохранить день</button>
        ${syncLine()}
      </div>
      <div class="card fx-text">
        <h3>Шаги</h3>
        <p>${steps ? `Неделя ${w}: <b>${esc(steps.target)}</b> шагов в день.` : ""} ${esc(P.steps_hint || "")}</p>
        <h3>Сон</h3>
        <ul>${(P.sleep || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      </div>`;
  }

  function guideHtml() {
    const rows = P.week_rows || [["Пн", "Тренировка А — " + P.days.A.title.toLowerCase()], ["Вт", "Прогулки 10–15 минут после еды"], ["Ср", "Тренировка Б — " + P.days.B.title.toLowerCase()],
      ["Чт", "Прогулки, мягкая мобильность"], ["Пт", "Тренировка В — " + P.days.C.title.toLowerCase()], ["Сб, Вс", "Отдых и прогулки"]];
    const sec = (title, text) => (text ? `<h3>${esc(title)}</h3><p>${esc(text)}</p>` : "");
    return `
      <div class="card">
        <h3>Ритм недели</h3>
        ${rows.map(([d, t]) => `<div class="meal-row"><span class="meal-label">${d}</span><span>${esc(t)}</span></div>`).join("")}
        <p class="muted fx-note">${esc(P.split_check || "")}</p>
      </div>
      <div class="card">
        <h3>Путь на 12 недель</h3>
        <div class="fx-path">${phases().map((x) => `<div><b>${esc(x.weeks)}</b><span>${esc(x.hint)}</span></div>`).join("")}</div>
        <div class="success-box">${esc(P.progression_rule)}</div>
        ${P.recovery_rule ? `<p class="muted fx-note">${esc(P.recovery_rule)}</p>` : ""}
        <p class="muted fx-note">${esc(P.stack_note)}</p>
      </div>
      <div class="card fx-text">
        ${sec("Цель", P.goal)}${sec("Подготовка к пилону", P.pole)}${sec("Хаммам и сауна", P.spa)}${sec("Цикл", P.cycle)}
        ${sec("Если заболела спина между лопатками", P.back_flare)}${sec("Пример записи в журнал", P.log_example)}
        <h3>Замеры</h3><p>${esc((P.measures || []).join(", "))}. ${esc(P.measures_when || "")}</p>
      </div>
      <div class="card fx-text">
        <div class="error-box"><b>Стоп-сигналы.</b> ${esc(P.stop_signals)}</div>
      </div>
      <p class="muted fx-foot">Личный тренировочный помощник · не заменяет медицинскую консультацию</p>`;
  }

  // ---------- отрисовка и обработчики ----------
  function render() {
    if (!box?.isConnected) return;
    const html = { train: trainHtml, progress: progressHtml, day: dayHtml, guide: guideHtml }[sub] || trainHtml;
    const chips = Object.entries(PEOPLE).map(([k, p]) =>
      `<button class="fb-chip${k === who ? " on" : ""}" data-who="${k}" role="tab" aria-selected="${k === who}">${esc(p.label)}</button>`).join("");
    box.innerHTML = `<div class="fb-chips fx-who" role="tablist" aria-label="Чья программа">${chips}</div>` + html();
    bind();
  }
  function refreshHistory() {
    const set = (id, html) => { const el = box?.querySelector(id); if (el) el.innerHTML = html; };
    set("#fxMeasures", measuresHtml()); set("#fxSessions", sessionsHtml()); set("#fxDaily", dailyHtml());
  }
  const val = (id) => box.querySelector(id)?.value?.trim() || "";

  function bind() {
    const on = (sel, ev, fn) => box.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, () => fn(el)));
    // своя копия фото не загрузилась — берём оригинал с сайта Matrix, не вышло и он — прячем рамку
    box.querySelectorAll(".fx-photo img").forEach((img) => img.addEventListener("error", () => {
      const alt = img.dataset.altSrc;
      if (alt && img.src !== alt) { img.src = alt; img.dataset.altSrc = ""; } else img.closest(".fx-photo")?.remove();
    }));
    on("[data-wk]", "click", (b) => {
      const d = Number(b.dataset.wk), w = week() + d;
      if (w < 1 || w > 12) return;
      S.start = (S.start || Date.now()) - d * WEEK_MS;
      moved = true;
      ctx.haptic();
      save(); render();
    });
    on("[data-who]", "click", (b) => { if (b.dataset.who !== who) { ctx.haptic(); switchTo(b.dataset.who); } });
    on("[data-day]", "click", (b) => { if (b.dataset.day === day) return; day = b.dataset.day; ctx.haptic(); render(); });
    on("[data-check]", "change", (cb) => {
      S.checks[day] = S.checks[day] || {};
      S.checks[day][cb.dataset.check] = cb.checked;
      cb.closest(".fx-ex").classList.toggle("done", cb.checked);
      const n = items(day).filter((it) => S.checks[day][codeOf(it)]).length;
      box.querySelector("#fxCount").textContent = n + "/" + items(day).length;
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
      const c = S.checks[day] || {}, list = items(day), cur = S.logs[day] || {}, logs = {};
      for (const it of list) {
        const code = codeOf(it), l = cur[code];
        if (l && (l.w || l.r)) logs[code] = { w: l.w || "", r: l.r || "", n: it.name };
      }
      S.sessions.unshift({ id: uid(), ts: Date.now(), date: today(), day, prog: PROG(), week: week(),
        done: list.filter((it) => c[codeOf(it)]).length, total: list.length, mood: val("#fxMood"), logs });
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
      const m = { note: val("#fxMNote") };
      box.querySelectorAll("[data-m]").forEach((el) => { m[el.dataset.m] = el.value.trim(); });
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

  // Переключение «Жена / Муж»: сначала дописываем несохранённое текущего, потом грузим другого.
  async function switchTo(k) {
    if (!PEOPLE[k]) return;
    if (timer) { clearTimeout(timer); timer = 0; if (store.get(DIRTY()) === "1") await push(); }
    who = k; store.set(WHO_KEY, k);
    S = readState(); P = readProgram(); syncText = "";
    await mount(box, ctx, sub);
  }

  async function mount(el, context, screen) {
    ctx = context; box = el; sub = screen || "train";
    if (!P) box.innerHTML = '<p class="muted">Загружаю программу…</p>';
    try {
      await loadProgram();
    } catch (e) {
      box.innerHTML = `<p>${esc(e.message)}</p><button id="fxRetry">Повторить</button>`;
      box.querySelector("#fxRetry")?.addEventListener("click", () => mount(el, context, screen));
      return;
    }
    render();
    if (await pull()) render();
  }

  window.Fitness = { mount, _test: { norm, phaseOf, phaseKey, codeOf, startKg, planLine, setProgram: (p) => { P = p; } } };
})();
