// «Хранение» на плане квартиры: план → комната → шкаф спереди → полка.
// Подключается из app-v2.js; данные — home-wms-api (wms.plan.load / wms.furniture.update).
(function () {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";
  const CHILD_LIMIT_CM = 150; // выше ребёнок 2 лет не дотянется
  const SNAP_M = 0.15;

  // ---------- Чистые функции (тестируются в tests/wms-plan-ui.test.ts) ----------
  const r5 = (v) => Math.round(v / 5) * 5;
  const norm = (s) => String(s ?? "").toLowerCase().replaceAll("ё", "е").trim();

  /** Тип мебели по названию — от него зависит картинка. */
  function kindOf(name) {
    const n = norm(name);
    const rules = [
      [/угловой диван/, "sofaCorner"], [/диван/, "sofa"], [/кровать/, "bed"], [/купе/, "wardrobe"],
      [/навесн|над стиральн|над ванн|полки над/, "wall"], [/тумбочк/, "nightstand"], [/место под ванн|ванн(а|ой)$/, "bathtub"],
      [/раковин|мойк/, "sink"], [/аквариум/, "aquarium"], [/телевиз|тв\b/, "tv"], [/компьютерн|письменн/, "desk"],
      [/обеденн|стол$/, "dining"], [/косметическ|туалетн/, "vanity"], [/комод/, "dresser"], [/стеллаж/, "rack"],
      [/пуф/, "pouf"], [/бутылочниц/, "bottle"], [/варочн|плит/, "hob"], [/шкаф/, "cabinet"],
    ];
    for (const [re, kind] of rules) if (re.test(n)) return kind;
    return "cabinet";
  }

  /** Предлагаемый размер предмета (см) по его полкам, с объяснением для человека. */
  function suggestSize(f) {
    const kind = kindOf(f.name);
    const secs = f.sections.map((s) => {
      const bottom = [...(s.cells || [])].sort((a, b) => a.from - b.from)[0];
      return { w: (bottom && bottom.width) || 0, d: (bottom && bottom.depth) || 0 };
    });
    if (!secs.some((s) => s.w)) {
      if (kind === "bathtub") return { width: 150, depth: 70, why: "стандартная ванна" };
      return { width: 60, depth: 40, why: "полки без размеров, взял типовой" };
    }
    const n = secs.length;
    if (kind === "bed") {
      const w = Math.max(...secs.map((s) => s.w)), d = secs.reduce((a, s) => a + s.d, 0);
      return { width: r5(w + 10), depth: r5(d + 10), why: `${n} отсека по ${secs.map((s) => s.d).join(" + ")} см вдоль кровати, ширина ${w} см, плюс рама` };
    }
    const w = secs.reduce((a, s) => a + (s.w || 30), 0) + 2 * (n + 1);
    const extra = kind === "wardrobe" ? 8 : kind === "sofa" || kind === "sofaCorner" ? 30 : 2;
    const d = Math.max(...secs.map((s) => s.d || 30)) + extra;
    const why = (n > 1 ? `секции ${secs.map((s) => s.w).join(" + ")} см` : `полка ${secs[0].w} см`) + " + стенки" +
      (kind === "wardrobe" ? ", к глубине — двери-купе" : extra === 30 ? ", к глубине — спинка" : "");
    return { width: Math.max(10, r5(w)), depth: Math.max(10, r5(d)), why };
  }

  /** Прямоугольник предмета на плане в метрах с учётом поворота. */
  function footprint(f) {
    const w = (f.width ?? f.suggest.width) / 100, d = (f.depth ?? f.suggest.depth) / 100;
    return f.rotation % 2 ? { w: d, h: w } : { w, h: d };
  }

  /** Прилипание к стенам: предмет остаётся в части комнаты, где его центр, и липнет к стене ближе 15 см. */
  function snap(rect, parts) {
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    const part = parts.find((p) => cx >= p[0] && cx <= p[0] + p[2] && cy >= p[1] && cy <= p[1] + p[3]) ||
      parts.reduce((best, p) => (dist(p, cx, cy) < dist(best, cx, cy) ? p : best), parts[0]);
    const [x0, y0, w, h] = part;
    let x = Math.min(Math.max(rect.x, x0), x0 + Math.max(0, w - rect.w));
    let y = Math.min(Math.max(rect.y, y0), y0 + Math.max(0, h - rect.h));
    if (Math.abs(x - x0) < SNAP_M) x = x0;
    if (Math.abs(x0 + w - (x + rect.w)) < SNAP_M) x = x0 + w - rect.w;
    if (Math.abs(y - y0) < SNAP_M) y = y0;
    if (Math.abs(y0 + h - (y + rect.h)) < SNAP_M) y = y0 + h - rect.h;
    return { ...rect, x: round3(x), y: round3(y) };
  }
  function dist(p, cx, cy) {
    const dx = Math.max(p[0] - cx, 0, cx - (p[0] + p[2])), dy = Math.max(p[1] - cy, 0, cy - (p[1] + p[3]));
    return Math.hypot(dx, dy);
  }
  const round3 = (v) => Math.round(v * 1000) / 1000;

  const overlaps = (a, b) => a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6;

  /**
   * Свободное место у стены для нового предмета: спиной к стене, фасадом в комнату, не налезая на другую мебель.
   * size — {w, d} в метрах (ширина вдоль фасада, глубина). Возвращает {x, y, rotation} или null.
   */
  function findSpot(parts, size, others) {
    const part = parts.reduce((a, p) => (p[2] * p[3] > a[2] * a[3] ? p : a));
    const [x0, y0, W, H] = part, step = 0.05;
    const walls = [
      { rotation: 0, w: size.w, h: size.d, at: (t) => ({ x: x0 + t, y: y0 }), len: W - size.w },
      { rotation: 3, w: size.d, h: size.w, at: (t) => ({ x: x0, y: y0 + t }), len: H - size.w },
      { rotation: 1, w: size.d, h: size.w, at: (t) => ({ x: x0 + W - size.d, y: y0 + t }), len: H - size.w },
      { rotation: 2, w: size.w, h: size.d, at: (t) => ({ x: x0 + t, y: y0 + H - size.d }), len: W - size.w },
    ];
    for (const wall of walls) {
      if (wall.len < -1e-6) continue;
      for (let t = 0; t <= wall.len + 1e-6; t += step) {
        const r = { ...wall.at(t), w: wall.w, h: wall.h };
        if (!others.some((o) => overlaps(r, o))) return { x: round3(r.x), y: round3(r.y), rotation: wall.rotation };
      }
    }
    return null;
  }

  /** Поиск вещей по всем полкам. */
  function searchItems(furniture, query) {
    const words = norm(query).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const out = [];
    for (const f of furniture) for (const s of f.sections) for (const c of s.cells) {
      const hits = c.items.filter((i) => { const t = norm(i.name); return words.every((w) => t.includes(w)); });
      if (hits.length) out.push({ f, s, c, items: hits });
    }
    return out;
  }

  // ---------- Картинки мебели (вид сверху). Локальные координаты: ширина w, глубина d, фасад снизу. ----------
  const R = (x, y, w, h, cls, rx = 0.02) => `<rect class="${cls}" x="${x}" y="${y}" width="${Math.max(0.001, w)}" height="${Math.max(0.001, h)}" rx="${rx}"/>`;
  const C = (cx, cy, r, cls) => `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${Math.max(0.001, r)}"/>`;
  const Ln = (x1, y1, x2, y2, cls = "wp-ln") => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const E = (cx, cy, rx, ry, cls) => `<ellipse class="${cls}" cx="${cx}" cy="${cy}" rx="${Math.max(0.001, rx)}" ry="${Math.max(0.001, ry)}"/>`;

  const DRAW = {
    bed(w, d) {
      const head = Math.min(0.12, d * 0.07), pw = Math.min(0.62, (w - 0.16) / 2);
      return R(0, 0, w, d, "wp-wood") + R(0.03, head, w - 0.06, d - head - 0.03, "wp-fab", 0.04) +
        R(w / 2 - pw - 0.03, head + 0.06, pw, Math.min(0.32, d * 0.17), "wp-soft", 0.07) +
        R(w / 2 + 0.03, head + 0.06, pw, Math.min(0.32, d * 0.17), "wp-soft", 0.07) +
        R(0.03, d * 0.42, w - 0.06, d * 0.58 - 0.03, "wp-blanket", 0.04) + Ln(0.03, d * 0.42 + 0.06, w - 0.03, d * 0.42 + 0.06, "wp-fold");
    },
    sofa(w, d) {
      const back = Math.min(0.22, d * 0.28), arm = Math.min(0.2, w * 0.12), n = Math.max(1, Math.round((w - 2 * arm) / 0.7));
      let s = R(0, 0, w, d, "wp-fab-dark", 0.06) + R(arm, back, w - 2 * arm, d - back - 0.02, "wp-fab", 0.04);
      for (let i = 1; i < n; i++) { const x = arm + ((w - 2 * arm) / n) * i; s += Ln(x, back + 0.03, x, d - 0.05, "wp-seam"); }
      for (let i = 0; i < n; i++) s += R(arm + ((w - 2 * arm) / n) * i + 0.05, back + 0.03, (w - 2 * arm) / n - 0.1, 0.12, "wp-soft", 0.05);
      return s;
    },
    sofaCorner(w, d) {
      const back = Math.min(0.2, Math.min(w, d) * 0.3), seat = Math.min(w, d) - back;
      return R(0, 0, w, back, "wp-fab-dark", 0.05) + R(0, 0, back, d, "wp-fab-dark", 0.05) +
        R(back, back, w - back, Math.min(seat, d - back), "wp-fab", 0.04) + R(back, back, Math.min(seat, w - back), d - back, "wp-fab", 0.04) +
        R(back + 0.05, back + 0.05, Math.max(0.1, Math.min(seat, w - back) - 0.1), 0.12, "wp-soft", 0.05);
    },
    wardrobe(w, d) {
      const door = Math.min(0.06, d * 0.1), n = Math.max(2, Math.round(w / 0.8));
      let s = R(0, 0, w, d, "wp-wood", 0.01) + R(0.02, 0.02, w - 0.04, d - door * 2 - 0.04, "wp-inner", 0.005);
      for (let i = 0; i < n; i++) {
        const x = (w / n) * i, y = d - door * (i % 2 ? 1 : 2) - 0.015;
        s += R(x + 0.01, y, w / n + (i < n - 1 ? 0.06 : -0.02), door, i % 2 ? "wp-door" : "wp-door2", 0.005);
      }
      const rods = Math.max(1, Math.floor(w / 0.9));
      for (let i = 0; i < rods; i++) s += Ln((w / rods) * i + 0.08, (d - door * 2) / 2, (w / rods) * (i + 1) - 0.08, (d - door * 2) / 2, "wp-rod");
      return s;
    },
    cabinet(w, d) {
      const n = Math.max(1, Math.round(w / 0.5));
      let s = R(0, 0, w, d, "wp-wood", 0.01) + R(0.015, 0.015, w - 0.03, d - 0.045, "wp-top", 0.005);
      for (let i = 1; i < n; i++) s += Ln((w / n) * i, d - 0.03, (w / n) * i, d, "wp-ln");
      for (let i = 0; i < n; i++) s += Ln((w / n) * (i + 0.5) - 0.05, d - 0.012, (w / n) * (i + 0.5) + 0.05, d - 0.012, "wp-handle");
      return s;
    },
    dresser(w, d) {
      return DRAW.cabinet(w, d) + Ln(0.06, d * 0.35, w - 0.06, d * 0.35, "wp-grain") + Ln(0.06, d * 0.6, w - 0.06, d * 0.6, "wp-grain");
    },
    nightstand(w, d) {
      const r = Math.min(w, d) * 0.22;
      return R(0, 0, w, d, "wp-wood", 0.02) + R(0.015, 0.015, w - 0.03, d - 0.045, "wp-top", 0.01) +
        C(w / 2, d * 0.42, r, "wp-lamp") + C(w / 2, d * 0.42, r * 0.45, "wp-lamp-in") + Ln(w / 2 - 0.05, d - 0.012, w / 2 + 0.05, d - 0.012, "wp-handle");
    },
    desk(w, d) {
      const mw = Math.min(0.6, w * 0.4);
      return R(0, 0, w, d, "wp-wood", 0.015) + R(0.015, 0.015, w - 0.03, d - 0.03, "wp-top", 0.01) +
        R(w / 2 - mw / 2, 0.05, mw, 0.04, "wp-screen", 0.01) + R(w / 2 - 0.22, d * 0.55, 0.44, Math.min(0.14, d * 0.25), "wp-kbd", 0.015) +
        E(w / 2 + 0.32, d * 0.62, 0.035, 0.05, "wp-kbd") + C(w / 2, d + 0.2, Math.min(0.24, w * 0.2), "wp-chair");
    },
    dining(w, d) {
      const n = Math.max(1, Math.round(w / 0.6));
      let s = "";
      for (let i = 0; i < n; i++) {
        const x = (w / n) * (i + 0.5);
        s += R(x - 0.2, -0.3, 0.4, 0.34, "wp-chair", 0.07) + R(x - 0.2, d - 0.04, 0.4, 0.34, "wp-chair", 0.07);
      }
      s += R(0, 0, w, d, "wp-wood", 0.06) + R(0.03, 0.03, w - 0.06, d - 0.06, "wp-top", 0.05);
      for (let i = 0; i < n; i++) {
        const x = (w / n) * (i + 0.5);
        s += C(x, 0.17, Math.min(0.11, d * 0.15), "wp-plate") + C(x, d - 0.17, Math.min(0.11, d * 0.15), "wp-plate");
      }
      return s;
    },
    vanity(w, d) {
      return R(0, 0, w, d, "wp-wood", 0.015) + R(0.015, 0.015, w - 0.03, d - 0.03, "wp-top", 0.01) +
        E(w / 2, 0.06, Math.min(0.22, w * 0.35), 0.04, "wp-mirror") + C(w * 0.25, d * 0.6, 0.03, "wp-dot") + C(w * 0.35, d * 0.55, 0.02, "wp-dot") +
        C(w / 2, d + 0.2, Math.min(0.18, w * 0.25), "wp-chair");
    },
    rack(w, d) {
      let s = R(0, 0, w, d, "wp-metal-bg", 0.005);
      s += R(0, 0, 0.035, d, "wp-metal", 0) + R(w - 0.035, 0, 0.035, d, "wp-metal", 0);
      for (let i = 1; i < 4; i++) s += Ln(0.035, (d / 4) * i, w - 0.035, (d / 4) * i, "wp-ln");
      s += R(w * 0.18, d * 0.2, w * 0.25, d * 0.5, "wp-box", 0.01) + R(w * 0.52, d * 0.3, w * 0.3, d * 0.42, "wp-box2", 0.01);
      return s;
    },
    pouf(w, d) {
      let s = R(0, 0, w, d, "wp-fab-dark", 0.1) + R(0.03, 0.03, w - 0.06, d - 0.06, "wp-fab", 0.08);
      const n = Math.max(2, Math.round(w / 0.25));
      for (let i = 1; i < n; i++) s += C((w / n) * i, d / 2, 0.012, "wp-dot");
      return s;
    },
    sink(w, d) {
      return R(0, 0, w, d, "wp-wood", 0.015) + R(0.015, 0.015, w - 0.03, d - 0.03, "wp-ceramic", 0.03) +
        E(w / 2, d * 0.55, Math.min(0.2, w * 0.33), Math.min(0.15, d * 0.3), "wp-basin") + C(w / 2, d * 0.18, 0.02, "wp-metal") +
        C(w / 2, d * 0.55, 0.012, "wp-metal");
    },
    bathtub(w, d) {
      return R(0, 0, w, d, "wp-ceramic", 0.06) + R(0.05, 0.05, w - 0.1, d - 0.1, "wp-basin", Math.min(w, d) * 0.3) +
        C(w - 0.14, d / 2, 0.02, "wp-metal") + Ln(0.12, d * 0.3, 0.12, d * 0.7, "wp-water-ln");
    },
    aquarium(w, d) {
      const tw = Math.min(w, Math.max(0.3, w * 0.9));
      return R(0, 0, w, d, "wp-wood", 0.01) + R((w - tw) / 2, 0.01, tw, d - 0.03, "wp-water", 0.01) +
        Ln((w - tw) / 2 + 0.04, d * 0.35, (w + tw) / 2 - 0.04, d * 0.35, "wp-water-ln") +
        `<path class="wp-fish" d="M${w * 0.42} ${d * 0.55} q0.04 -0.03 0.08 0 q-0.04 0.03 -0.08 0 z M${w * 0.5} ${d * 0.55} l0.03 -0.02 v0.04 z"/>`;
    },
    tv(w, d) {
      const tvw = Math.min(w * 0.85, 1.4);
      return DRAW.cabinet(w, d) + R(w / 2 - tvw / 2, 0.03, tvw, 0.035, "wp-screen", 0.005) + R(w / 2 - 0.12, 0.065, 0.24, 0.05, "wp-screen", 0.01);
    },
    bottle(w, d) {
      let s = R(0, 0, w, d, "wp-wood", 0.01);
      for (let y = 0.08; y < d - 0.05; y += 0.1) s += C(w / 2, y, Math.min(0.035, w * 0.3), "wp-glass");
      return s;
    },
    hob(w, d) {
      const r = Math.min(w, d) * 0.12;
      return R(0, 0, w, d, "wp-wood", 0.01) + R(0.04, 0.04, w - 0.08, d - 0.08, "wp-glass-top", 0.02) +
        C(w * 0.32, d * 0.35, r, "wp-burner") + C(w * 0.68, d * 0.35, r * 0.8, "wp-burner") +
        C(w * 0.32, d * 0.68, r * 0.8, "wp-burner") + C(w * 0.68, d * 0.68, r, "wp-burner");
    },
    wall(w, d) {
      let s = R(0, 0, w, d, "wp-wall", 0.01);
      const n = Math.max(1, Math.round(w / 0.4));
      for (let i = 1; i < n; i++) s += Ln((w / n) * i, 0, (w / n) * i, d, "wp-wall-ln");
      return s;
    },
  };

  function furnitureSvg(f, rect, opts) {
    const fw = (f.width ?? f.suggest.width) / 100, fd = (f.depth ?? f.suggest.depth) / 100;
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    const art = (DRAW[f.kind] || DRAW.cabinet)(fw, fd);
    const label = opts.label && (f.kind !== "wall" || opts.sel) ? labelSvg(f, rect) : "";
    return `<g class="wp-fur${opts.sel ? " sel" : ""}${opts.pulse ? " pulse" : ""}${f.kind === "wall" ? " is-wall" : ""}" data-fur="${f.id}">` +
      `<rect class="wp-hit" x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}"/>` +
      `<g transform="translate(${cx} ${cy}) rotate(${f.rotation * 90}) translate(${-fw / 2} ${-fd / 2})">${art}</g>` +
      (opts.sel ? `<rect class="wp-sel" x="${rect.x - 0.03}" y="${rect.y - 0.03}" width="${rect.w + 0.06}" height="${rect.h + 0.06}" rx="0.04"/>` : "") +
      label + "</g>";
  }

  function labelSvg(f, rect) {
    const text = shortName(f.name);
    const long = Math.max(rect.w, rect.h);
    const fit = (long * 0.9) / (text.length * 0.55);
    if (long < 0.3 || fit < 0.075) return "";
    const size = Math.min(0.15, fit);
    const vertical = rect.h > rect.w * 1.4;
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    return `<text class="wp-label" style="font-size:${size}px" x="${cx}" y="${cy}"${vertical ? ` transform="rotate(-90 ${cx} ${cy})"` : ""}>${esc(text)}</text>`;
  }

  function shortName(n) {
    return String(n).replace(/\s*\(.*?\)/g, "").replace("Прикроватная тумбочка", "Тумбочка").replace("Компьютерный стол", "Комп. стол").replace("Косметический стол-консоль", "Косметический стол")
      .replace("Полка над стиральной машиной", "Полка над стиралкой").replace("Навесной шкафчик с зеркалом", "Шкафчик с зеркалом").trim();
  }

  // ---------- Состояние экрана ----------
  let deps = null, root = null, data = null, view = { k: "plan" }, edit = false, sizing = null, hitCell = null;
  let tour = [], drag = null, vb = null, anim = null, toastTimer = null, focusItem = null;
  const esc = (s) => (deps ? deps.esc(s) : String(s));

  function setDepth() { deps?.onDepth?.(view.k === "plan" ? 0 : view.k === "room" ? 1 : 2); }

  async function mount(el, d, opts = {}) {
    deps = d; root = el; focusItem = opts.focusItemId || null;
    view = { k: "plan" }; edit = false; sizing = null; hitCell = null; stopTour();
    root.innerHTML = `<div class="wp">
      <div class="wp-search"><input id="wpQ" type="search" placeholder="Где лежит… например, лоферы" autocomplete="off" aria-label="Найти вещь на плане"></div>
      <div class="wp-results" id="wpResults"></div>
      <div class="wp-crumbs" id="wpCrumbs"></div>
      <div class="wp-toast" id="wpToast" role="status" hidden></div>
      <div class="wp-stage" id="wpStage"><div class="skeleton" style="height:180px;margin:0"></div></div>
      <div class="wp-tray" id="wpTray"></div></div>`;
    root.querySelector("#wpQ").addEventListener("input", onSearch);
    try {
      const res = await deps.api("wms.plan.load");
      if (!root.isConnected) return;
      data = prepare(res);
    } catch (error) {
      if (!root.isConnected) return;
      root.querySelector("#wpStage").innerHTML = `<div class="wp-empty"><b>Не удалось загрузить план</b><p>${esc(error.message)}</p><button id="wpRetry">Повторить</button></div>`;
      root.querySelector("#wpRetry").addEventListener("click", () => mount(el, d, opts));
      return;
    }
    if (!data.plan) {
      root.querySelector("#wpStage").innerHTML = `<div class="wp-empty"><b>План квартиры ещё не загружен</b><p>Пока ищите вещи во вкладке «Найти».</p></div>`;
      return;
    }
    buildStage();
    render();
    if (focusItem) {
      const hit = findItem(focusItem);
      focusItem = null;
      if (hit) go(hit);
    }
  }

  function prepare(res) {
    const plan = res.plan;
    const rooms = plan ? plan.rooms.map((r) => ({ id: r.location_id, name: r.name, parts: r.parts, label: r.label })) : [];
    const furniture = (res.furniture || []).map((f) => {
      const x = { ...f, kind: kindOf(f.name) };
      x.suggest = suggestSize(x);
      return x;
    });
    return { plan, rooms, furniture };
  }

  function findItem(itemId) {
    for (const f of data.furniture) for (const s of f.sections) for (const c of s.cells) {
      const it = c.items.find((i) => i.id === itemId);
      if (it) return { f, s, c, items: [it] };
    }
    return null;
  }

  const roomById = (id) => data.rooms.find((r) => r.id === id);
  const roomName = (r) => (r ? r.name.replace(/\s+с коридором$/i, "") : "");
  const furById = (id) => data.furniture.find((f) => f.id === id);
  const placed = (f) => f.x !== null && f.x !== undefined;
  function rectOf(f) { const fp = footprint(f); return { x: f.x, y: f.y, w: fp.w, h: fp.h }; }
  function bbox(parts) {
    const x0 = Math.min(...parts.map((p) => p[0])), y0 = Math.min(...parts.map((p) => p[1]));
    const x1 = Math.max(...parts.map((p) => p[0] + p[2])), y1 = Math.max(...parts.map((p) => p[1] + p[3]));
    return [x0, y0, x1 - x0, y1 - y0];
  }
  function planBox() {
    const all = data.rooms.flatMap((r) => r.parts);
    const b = bbox(all);
    return [b[0] - 0.3, b[1] - 0.3, b[2] + 0.6, b[3] + 0.6];
  }

  function buildStage() {
    const stage = root.querySelector("#wpStage");
    stage.innerHTML = `<svg class="wp-svg" id="wpSvg" xmlns="${SVGNS}" role="img" aria-label="План квартиры"></svg>`;
    const svg = stage.querySelector("svg");
    svg.addEventListener("pointerdown", onDown);
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerup", onUp);
    svg.addEventListener("pointercancel", () => { drag = null; });
    svg.addEventListener("click", onClick);
    stage.addEventListener("pointerdown", () => { if (tour.length) finishTour(); }, true);
    root.querySelector("#wpTray").addEventListener("click", onTray);
    root.querySelector("#wpCrumbs").addEventListener("click", (e) => {
      const b = e.target.closest("[data-crumb]");
      if (!b) return;
      stopTour();
      if (b.dataset.crumb === "plan") { view = { k: "plan" }; hitCell = null; sizing = null; }
      if (b.dataset.crumb === "room") { view = { k: "room", room: view.room }; hitCell = null; }
      render();
    });
  }

  function setViewBox(target, ms = 420) {
    const svg = root.querySelector("#wpSvg");
    if (!svg) return;
    if (anim) cancelAnimationFrame(anim);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!vb || reduce || ms === 0) { vb = target.slice(); svg.setAttribute("viewBox", vb.join(" ")); return; }
    const from = vb.slice(), t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      vb = from.map((v, i) => v + (target[i] - v) * e);
      svg.setAttribute("viewBox", vb.join(" "));
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  function toast(text, ms = 2400) {
    const t = root.querySelector("#wpToast");
    if (!t) return;
    t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer);
    if (ms) toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  // ---------- Отрисовка ----------
  function render() {
    if (!data) return;
    const t = root.querySelector("#wpToast");
    if (t && !tour.length) t.hidden = true;
    renderCrumbs();
    setDepth();
    if (view.k === "front") return renderFront();
    const svg = root.querySelector("#wpSvg");
    const rid = view.k === "room" ? view.room : null;
    svg.classList.toggle("editing", edit && !!rid);
    svg.classList.remove("front");
    let h = `<defs><pattern id="wpFloor" width="0.3" height="0.3" patternUnits="userSpaceOnUse"><rect width="0.3" height="0.3" class="wp-floor"/><path d="M0 0.3 L0.3 0" class="wp-floor-ln"/></pattern></defs>`;
    for (const r of data.rooms) {
      const dim = rid && rid !== r.id;
      h += `<g class="wp-room${view.hi === r.id ? " hi" : ""}${dim ? " dim" : ""}" data-room="${r.id}">` +
        r.parts.map((p) => `<rect x="${p[0]}" y="${p[1]}" width="${p[2]}" height="${p[3]}"/>`).join("") + "</g>";
    }
    for (const o of data.plan.openings || []) h += `<line class="wp-open" x1="${o[0]}" y1="${o[1]}" x2="${o[2]}" y2="${o[3]}"/>`;
    for (const d of data.plan.doors || []) h += `<line class="wp-door-gap" x1="${d[0]}" y1="${d[1]}" x2="${d[2]}" y2="${d[3]}"/>`;
    const list = data.furniture.filter((f) => placed(f) && (!rid || f.locationId === rid));
    const order = [...list.filter((f) => f.kind !== "wall"), ...list.filter((f) => f.kind === "wall")];
    for (const f of order) h += furnitureSvg(f, rectOf(f), { label: !!rid, sel: sizing === f.id, pulse: view.pulse === f.id });
    if (!rid) {
      for (const r of data.rooms) {
        const [lx, ly] = r.label || bbox(r.parts).slice(0, 2);
        h += `<text class="wp-rname${Math.min(...bbox(r.parts).slice(2)) < 1.75 ? " sm" : ""}" x="${lx}" y="${ly}">${esc(roomName(r))}</text>`;
      }
    }
    svg.innerHTML = h;
    if (rid) {
      const b = bbox(roomById(rid).parts), m = 0.3;
      setViewBox([b[0] - m, b[1] - m, b[2] + 2 * m, b[3] + 2 * m]);
    } else setViewBox(planBox());
    renderTray();
  }

  function renderCrumbs() {
    const c = root.querySelector("#wpCrumbs");
    const parts = [`<button data-crumb="plan" class="${view.k === "plan" ? "on" : ""}">${esc(data.plan?.title || "План")}</button>`];
    if (view.k !== "plan") parts.push(`<button data-crumb="room" class="${view.k === "room" ? "on" : ""}">${esc(roomName(roomById(view.room)))}</button>`);
    if (view.k === "front") parts.push(`<button class="on">${esc(shortName(furById(view.fur).name))}</button>`);
    c.innerHTML = parts.join('<span aria-hidden="true">›</span>');
  }

  function renderTray() {
    const tray = root.querySelector("#wpTray");
    if (view.k === "plan") {
      const total = data.furniture.length, on = data.furniture.filter(placed).length;
      tray.innerHTML = `<p class="muted">Нажмите на комнату, чтобы открыть её.${on < total ? ` На плане ${on} из ${total} предметов — остальные можно расставить в комнатах.` : ""}</p>`;
      return;
    }
    const list = data.furniture.filter((f) => f.locationId === view.room);
    const rest = list.filter((f) => !placed(f));
    if (sizing) return renderSizing(tray);
    const editBtn = `<button class="wp-edit${edit ? " on" : ""}" data-act="edit">${edit ? "✓ Готово" : "✏️ Править размеры"}</button>`;
    if (!edit) {
      tray.innerHTML = `<div class="wp-row">${editBtn}</div>` +
        (list.length ? `<div class="wp-chips">${list.map((f) => `<button class="wp-chip${placed(f) ? "" : " off"}" data-open="${f.id}">${placed(f) ? "" : "◌ "}${esc(shortName(f.name))}</button>`).join("")}</div>` : "") +
        `<p class="muted">${rest.length ? `${rest.length} ${plural(rest.length, "предмет", "предмета", "предметов")} ещё не на плане: нажмите «Править размеры», чтобы расставить. ` : ""}Нажмите на мебель, чтобы заглянуть внутрь.</p>`;
      return;
    }
    tray.innerHTML = `<div class="wp-row">${editBtn}</div>` +
      `<p class="muted">Перетаскивайте мебель пальцем — у стены она прилипает. Нажмите на предмет, чтобы поправить размер или повернуть.</p>` +
      (rest.length ? `<div class="wp-sub">Не на плане</div><div class="wp-chips">${rest.map((f) => `<button class="wp-chip off" data-size="${f.id}">+ ${esc(shortName(f.name))}</button>`).join("")}</div>` : "") +
      (list.length - rest.length ? `<div class="wp-sub">На плане</div><div class="wp-chips">${list.filter(placed).map((f) => `<button class="wp-chip" data-size="${f.id}">${esc(shortName(f.name))} · ${dimsText(f)}</button>`).join("")}</div>` : "");
  }

  function dimsText(f) { return `${Math.round(f.width ?? f.suggest.width)}×${Math.round(f.depth ?? f.suggest.depth)}`; }
  function plural(n, a, b, c) { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; }

  function renderSizing(tray) {
    const f = furById(sizing);
    const w = Math.round(f.width ?? f.suggest.width), d = Math.round(f.depth ?? f.suggest.depth);
    const fromDb = f.width !== null && f.width !== undefined;
    tray.innerHTML = `<div class="wp-sheet">
      <div class="wp-sheet-h"><b>${esc(shortName(f.name))}</b><span class="muted">${fromDb ? "Сохранённый размер" : "Посчитал по полкам: " + esc(f.suggest.why)}</span></div>
      <div class="wp-sz">
        <label for="wpW">Ширина, см<input id="wpW" type="number" inputmode="numeric" min="10" max="600" value="${w}"></label>
        <label for="wpD">Глубина, см<input id="wpD" type="number" inputmode="numeric" min="10" max="400" value="${d}"></label>
      </div>
      <div class="wp-row">
        <button data-act="rotl" aria-label="Повернуть против часовой">⟲</button>
        <button data-act="rotr" aria-label="Повернуть по часовой">⟳</button>
        <span class="muted wp-face">Фасад: ${["вниз", "влево", "вверх", "вправо"][f.rotation]}</span>
      </div>
      <div class="wp-row">
        <button class="primary" data-act="apply">${placed(f) ? "Сохранить" : "Поставить на план"}</button>
        ${placed(f) ? '<button data-act="remove">Убрать с плана</button>' : ""}
        <button data-act="cancel">Отмена</button>
      </div></div>`;
  }

  // ---------- Шкаф спереди ----------
  function renderFront() {
    const svg = root.querySelector("#wpSvg");
    svg.classList.remove("editing");
    svg.classList.add("front");
    const f = furById(view.fur);
    const secs = f.sections.map((s) => {
      const bottom = [...s.cells].sort((a, b) => a.from - b.from)[0];
      return { ...s, w: Math.max(30, (bottom && bottom.width) || Math.max(0, ...s.cells.map((c) => c.width || 0)) || 60) };
    });
    const top = Math.max(100, ...secs.flatMap((s) => s.cells.map((c) => (c.type === "rod" ? c.from : c.from + (c.height || 10))))) + 6;
    const gap = 2.5, W = secs.reduce((a, s) => a + s.w, 0) + gap * (secs.length + 1);
    const Y = (v) => top - v;
    let h = `<g class="wf-ruler">`;
    for (let v = 0; v <= top; v += 50) h += `<line x1="-4" y1="${Y(v)}" x2="${W + 4}" y2="${Y(v)}"/><text x="-7" y="${Y(v) + 2}">${v}</text>`;
    h += `</g>`;
    h += `<rect class="wf-carcass" x="0" y="${Y(top - 2)}" width="${W}" height="${top - 2}" rx="1.5"/>`;
    let x = gap;
    for (const s of secs) {
      h += `<rect class="wf-back" x="${x}" y="${Y(top - 4)}" width="${s.w}" height="${top - 4}"/>`;
      s.cells.forEach((c) => { h += cellSvg(c, x, Math.min(s.w, c.width || s.w), Y); });
      if (secs.length > 1) h += `<text class="wf-sec" x="${x + s.w / 2}" y="${Y(0) + 8}">${esc((s.name.match(/секция\s+\d+/) || [""])[0])}</text>`;
      x += s.w + gap;
    }
    h += `<line class="wf-kid" x1="-4" y1="${Y(CHILD_LIMIT_CM)}" x2="${W + 4}" y2="${Y(CHILD_LIMIT_CM)}"/><text class="wf-kidt" x="${W + 5}" y="${Y(CHILD_LIMIT_CM) + 2}">150</text>`;
    h += `<line class="wf-floor" x1="-6" y1="${Y(0)}" x2="${W + 6}" y2="${Y(0)}"/>`;
    svg.innerHTML = h;
    setViewBox([-16, -4, W + 32, top + 16], 0);
    const tray = root.querySelector("#wpTray");
    const hit = hitCell && findCellById(f, hitCell);
    tray.innerHTML = hit ? cellSheet(f, hit.s, hit.c) :
      `<p class="muted">Полки и штанги стоят на своей высоте от пола. Красная линия — 150 см: выше ребёнок не дотянется. Нажмите на полку, чтобы увидеть, что на ней.</p>`;
  }

  function cellSvg(c, x, w, Y) {
    const hh = c.height || 8, hit = hitCell === c.id ? " hit" : "";
    const names = groupNames(c.items);
    let g = `<g class="wf-cell${hit}" data-cell="${c.id}">`;
    const chips = (y0, maxRows) => {
      let s = "", cx = x + 2, cy = y0, rows = 0;
      for (const n of names) {
        const tw = Math.min(w - 4, n.length * 2.6 + 4);
        if (cx + tw > x + w - 1) { cx = x + 2; cy += 6.4; rows++; }
        if (rows >= maxRows) { s += `<text class="wf-more" x="${x + w - 2}" y="${cy - 1.6}">…</text>`; break; }
        s += `<rect class="wf-chip" x="${cx}" y="${cy}" width="${tw}" height="5.4" rx="1.6"/><text class="wf-chipt" x="${cx + 2}" y="${cy + 3.9}">${esc(n)}</text>`;
        cx += tw + 1.2;
      }
      return s;
    };
    if (c.type === "rod") {
      const span = Math.min(hh, c.from);
      g += `<rect class="wf-space" x="${x + 0.6}" y="${Y(c.from)}" width="${w - 1.2}" height="${span}"/>`;
      g += `<line class="wf-rod" x1="${x + 1.5}" y1="${Y(c.from) + 1.2}" x2="${x + w - 1.5}" y2="${Y(c.from) + 1.2}"/>`;
      for (let k = x + 6; k < x + w - 4; k += 7) g += `<path class="wf-hanger" d="M${k} ${Y(c.from) + 1.2} l-2.8 4.2 h5.6 z"/>`;
      g += `<text class="wf-lbl" x="${x + 2}" y="${Y(c.from) + 10}">${esc(c.label)} · штанга</text>` + chips(Y(c.from) + 12, Math.max(1, Math.floor((span - 14) / 6.4)));
    } else if (c.type === "drawer" || c.type === "bulky") {
      g += `<rect class="wf-drawer" x="${x + 0.6}" y="${Y(c.from + hh)}" width="${w - 1.2}" height="${hh}" rx="1"/>`;
      if (c.type === "drawer" && hh >= 5) g += `<line class="wf-handle" x1="${x + w / 2 - 5}" y1="${Y(c.from + hh) + Math.min(3, hh / 3)}" x2="${x + w / 2 + 5}" y2="${Y(c.from + hh) + Math.min(3, hh / 3)}"/>`;
      g += `<text class="wf-lbl" x="${x + 2}" y="${Y(c.from + hh) + (hh >= 12 ? 9 : hh - 1.5)}">${esc(c.label)}${c.type === "bulky" ? " · отсек" : ""}</text>`;
      if (hh >= 16) g += chips(Y(c.from + hh) + 11, Math.max(1, Math.floor((hh - 12) / 6.4)));
      else if (names.length) g += `<circle class="wf-dot" cx="${x + w - 3}" cy="${Y(c.from + hh / 2)}" r="1.6"/>`;
    } else {
      g += `<rect class="wf-space" x="${x + 0.6}" y="${Y(c.from + hh)}" width="${w - 1.2}" height="${hh}"/>`;
      g += `<rect class="wf-board" x="${x}" y="${Y(c.from)}" width="${w}" height="1.8"/>`;
      const room = Math.max(1, Math.floor((hh - 9) / 6.4));
      g += `<text class="wf-lbl" x="${x + 2}" y="${Y(c.from + hh) + 6}">${esc(c.label)}</text>`;
      g += names.length ? chips(Y(c.from + hh) + 8, room) : "";
    }
    return g + `<rect class="wf-tap" x="${x}" y="${c.type === "rod" ? Y(c.from) : Y(c.from + hh)}" width="${w}" height="${c.type === "rod" ? Math.max(6, Math.min(hh, c.from)) : Math.max(6, hh)}"/></g>`;
  }

  function groupNames(items) {
    const m = new Map();
    for (const i of items) m.set(i.name, (m.get(i.name) || 0) + (i.quantity || 1));
    return [...m].map(([n, q]) => (q > 1 ? `${n} ×${q}` : n));
  }

  function findCellById(f, id) {
    for (const s of f.sections) for (const c of s.cells) if (c.id === id) return { s, c };
    return null;
  }

  function cellSheet(f, s, c) {
    const kind = { rod: "штанга", drawer: "ящик", bulky: "отсек", hook: "крючок" }[c.type] || "полка";
    const where = c.type === "rod" ? `висит на ${c.from} см` : `${c.from} см от пола`;
    const names = groupNames(c.items);
    return `<div class="wp-sheet"><div class="wp-sheet-h"><b>${esc(c.label)} · ${kind}</b>
      <span class="muted">${esc(f.sections.length > 1 ? s.name : shortName(f.name))} · ${where}${c.width ? ` · ${c.width}×${c.depth || "?"} см` : ""}${c.from > CHILD_LIMIT_CM ? " · ребёнок не достанет" : ""}</span></div>
      ${names.length ? `<ul class="wp-items">${names.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : `<p class="muted">Здесь пока ничего не записано.</p>`}</div>`;
  }

  // ---------- Жесты ----------
  function svgPoint(e) {
    const svg = root.querySelector("#wpSvg");
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }

  function onDown(e) {
    if (view.k !== "room" || !edit) return;
    const g = e.target.closest("[data-fur]");
    if (!g) return;
    const f = furById(g.dataset.fur), p = svgPoint(e);
    drag = { f, sx: p.x, sy: p.y, ox: f.x, oy: f.y, moved: false, g };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onMove(e) {
    if (!drag) return;
    const p = svgPoint(e), dx = p.x - drag.sx, dy = p.y - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 0.05) return;
    drag.moved = true;
    const fp = footprint(drag.f);
    const r = snap({ x: drag.ox + dx, y: drag.oy + dy, w: fp.w, h: fp.h }, roomById(view.room).parts);
    drag.f.x = r.x; drag.f.y = r.y;
    drag.g = replaceSvg(drag.g, furnitureSvg(drag.f, rectOf(drag.f), { label: true, sel: false }));
  }

  function replaceSvg(node, markup) {
    const tmp = document.createElementNS(SVGNS, "svg");
    tmp.innerHTML = markup;
    const fresh = tmp.firstElementChild;
    node.replaceWith(fresh);
    return fresh;
  }

  function onUp() {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) { openSizing(d.f.id); return; }
    deps.haptic?.("light");
    save(d.f, { x: d.ox, y: d.oy });
  }

  function onClick(e) {
    if (drag) return;
    if (view.k === "plan") {
      const r = e.target.closest("[data-room]");
      if (r) { stopTour(); view = { k: "room", room: r.dataset.room }; deps.haptic?.("light"); render(); }
      return;
    }
    if (view.k === "room") {
      if (edit) return;
      const g = e.target.closest("[data-fur]");
      if (g) openFront(g.dataset.fur);
      return;
    }
    if (view.k === "front") {
      const c = e.target.closest("[data-cell]");
      hitCell = c ? c.dataset.cell : null;
      if (c) deps.haptic?.("light");
      renderFront();
    }
  }

  function openFront(id) { stopTour(); view = { k: "front", room: furById(id).locationId, fur: id }; hitCell = null; deps.haptic?.("light"); render(); }
  function openSizing(id) { sizing = id; deps.haptic?.("light"); render(); }

  function onTray(e) {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.open) return openFront(b.dataset.open);
    if (b.dataset.size) return openSizing(b.dataset.size);
    const act = b.dataset.act;
    if (act === "edit") { edit = !edit; sizing = null; deps.haptic?.(); render(); return; }
    if (act === "cancel") { sizing = null; render(); return; }
    const f = sizing && furById(sizing);
    if (!f) return;
    if (act === "rotl" || act === "rotr") {
      f.rotation = (f.rotation + (act === "rotr" ? 1 : 3)) % 4;
      if (placed(f)) { const before = { x: f.x, y: f.y, rotation: (f.rotation + (act === "rotr" ? 3 : 1)) % 4 }; refit(f, before); save(f, before); }
      render(); return;
    }
    if (act === "remove") { const before = { x: f.x, y: f.y }; f.x = null; f.y = null; sizing = null; save(f, before); render(); return; }
    if (act === "apply") {
      const w = clampNum(root.querySelector("#wpW").value, 10, 600), dd = clampNum(root.querySelector("#wpD").value, 10, 400);
      if (w === null || dd === null) { toast("Ширина 10–600 см, глубина 10–400 см"); return; }
      const before = { x: f.x, y: f.y, width: f.width, depth: f.depth, rotation: f.rotation };
      f.width = w; f.depth = dd;
      if (!placed(f)) {
        const room = roomById(view.room);
        const others = data.furniture.filter((o) => o !== f && placed(o) && o.locationId === f.locationId && (o.kind === "wall") === (f.kind === "wall")).map(rectOf);
        const spot = findSpot(room.parts, { w: w / 100, d: dd / 100 }, others);
        if (spot) { f.rotation = spot.rotation; f.x = spot.x; f.y = spot.y; }
        else {
          const big = room.parts.reduce((a, p) => (p[2] * p[3] > a[2] * a[3] ? p : a)), fp = footprint(f);
          const r = snap({ x: big[0] + big[2] / 2 - fp.w / 2, y: big[1] + big[3] / 2 - fp.h / 2, w: fp.w, h: fp.h }, room.parts);
          f.x = r.x; f.y = r.y;
        }
        before.rotation = before.rotation ?? 0;
        toast("Поставил к свободной стене — перетащите туда, где он стоит на самом деле");
      } else refit(f, before);
      sizing = null;
      save(f, before);
      render();
    }
  }

  function refit(f, before) {
    // после смены размера или поворота держим центр на месте и не вылезаем из комнаты
    const old = footprint({ ...f, ...before, rotation: before.rotation ?? f.rotation });
    const cx = f.x + old.w / 2, cy = f.y + old.h / 2, fp = footprint(f);
    const r = snap({ x: cx - fp.w / 2, y: cy - fp.h / 2, w: fp.w, h: fp.h }, roomById(f.locationId).parts);
    f.x = r.x; f.y = r.y;
  }

  function clampNum(v, min, max) { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= min && n <= max ? n : null; }

  async function save(f, before) {
    try {
      await deps.api("wms.furniture.update", {
        id: f.id, x: f.x ?? null, y: f.y ?? null,
        width: Math.round(f.width ?? f.suggest.width), depth: Math.round(f.depth ?? f.suggest.depth), rotation: f.rotation,
      });
      if (f.width == null) { f.width = Math.round(f.suggest.width); f.depth = Math.round(f.suggest.depth); }
    } catch (error) {
      Object.assign(f, before);
      if (root.isConnected) { toast("Не сохранилось: " + error.message, 3500); render(); }
    }
  }

  // ---------- Поиск-навигатор: план → комната → шкаф → полка ----------
  function onSearch(e) {
    const q = e.target.value, box = root.querySelector("#wpResults");
    if (!data) return;
    const res = searchItems(data.furniture, q);
    if (!q.trim()) { box.innerHTML = ""; return; }
    if (!res.length) { box.innerHTML = `<p class="muted">На полках «${esc(q.trim())}» не нашлось. Попробуйте вкладку «Найти» — там подсказка по категории.</p>`; return; }
    box.innerHTML = res.slice(0, 8).map((r, k) => `<button class="wp-res" data-res="${k}"><b>${esc(groupNames(r.items).join(", "))}</b>` +
      `<span>${esc(roomName(roomById(r.f.locationId)))} › ${esc(shortName(r.f.name))} › ${esc(r.c.label)}</span></button>`).join("");
    box.onclick = (ev) => {
      const b = ev.target.closest("[data-res]");
      if (!b) return;
      e.target.blur();
      box.innerHTML = "";
      go(res[Number(b.dataset.res)]);
    };
  }

  function stopTour() { tour.forEach(clearTimeout); tour = []; }
  function finishTour() { const last = tour.final; stopTour(); if (last) last(); }

  function go(hit) {
    stopTour();
    const room = roomById(hit.f.locationId);
    const label = groupNames(hit.items).join(", ");
    const end = () => {
      view = { k: "front", room: hit.f.locationId, fur: hit.f.id }; hitCell = hit.c.id; render();
      toast(`${hit.c.label}${hit.c.type === "rod" ? " (штанга)" : ""}: ${label}`, 4000);
    };
    if (!room) return end();
    sizing = null; edit = false;
    view = { k: "plan", hi: room.id }; render(); toast(roomName(room), 0);
    tour.final = end;
    tour.push(setTimeout(() => {
      if (!placed(hit.f)) { tour.push(setTimeout(end, 50)); return; }
      view = { k: "room", room: room.id, pulse: hit.f.id }; render(); toast(`${roomName(room)} › ${shortName(hit.f.name)}`, 0);
      tour.push(setTimeout(() => { tour.final = null; end(); }, 1300));
    }, 1000));
  }

  /** Назад внутри плана; false — уже на плане целиком. */
  function back() {
    if (!data || view.k === "plan") return false;
    stopTour(); sizing = null;
    if (view.k === "front") { view = { k: "room", room: view.room }; hitCell = null; } else { view = { k: "plan" }; edit = false; }
    render();
    return true;
  }

  window.WmsPlan = { mount, back, _test: { kindOf, suggestSize, footprint, snap, findSpot, searchItems, shortName, DRAW } };
})();
