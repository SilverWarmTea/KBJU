// ====== Constants ======
const MACRO_KEYS = ["k", "b", "j", "u"];
const STORAGE_KEY = "kbju_rows_v3"; // новая версия под карточный UI
const PRODUCTS_URL = "./products.json";

// Разрешаем: 0..9999 и 1 знак после точки -> 0, 0.1, 12, 12.3, 1234.5
const MACRO_RE = /^(?:0|[1-9]\d{0,3})(?:\.\d)?$/;
// Вес: 1..9999 (целое)
const WEIGHT_RE = /^[0-9]{1,4}$/;

// ====== DOM ======
const dom = {
  // Inputs
  title: document.getElementById("title"),
  weight: document.getElementById("weight"),
  perPortion: document.getElementById("perPortion"),
  macros: {
    k: document.getElementById("k"),
    b: document.getElementById("b"),
    j: document.getElementById("j"),
    u: document.getElementById("u"),
  },
  copyTotals: document.getElementById("copyTotals"),

  // Buttons
  add: document.getElementById("add"),
  clear: document.getElementById("clear"),

  // Presets
  preset: document.getElementById("preset"),
  choose: document.getElementById("choose"),

  // UI
  hint: document.getElementById("hint"),
  list: document.getElementById("list"),

  // Totals
  sumK: document.getElementById("sumK"),
  sumB: document.getElementById("sumB"),
  sumJ: document.getElementById("sumJ"),
  sumU: document.getElementById("sumU"),
};

// ====== State ======
let rows = loadRows();        // [{label, weight, perPortion, k,b,j,u}]
let presets = [];             // [{name,k,b,j,u,weight}]

// ====== Init ======
init();
render();
dom.copyTotals?.addEventListener("click", copyTotalsToClipboard);


function init() {
  // Weight disable/enable
  dom.perPortion?.addEventListener("change", syncWeightDisabled);
  syncWeightDisabled();

  // Add & Clear
  dom.add?.addEventListener("click", onAdd);
  dom.clear?.addEventListener("click", onClear);

  // Presets
  if (dom.preset) initPresets();
  dom.choose?.addEventListener("click", onChoosePreset);

  // Delegated actions in list
  dom.list?.addEventListener("click", onListClick);
}

function syncWeightDisabled() {
  const per = !!dom.perPortion?.checked;
  if (!dom.weight) return;

  dom.weight.disabled = per;
  if (per) dom.weight.value = "";
}

// ====== Handlers ======
function onAdd() {
  setHint("");

  const perPortion = !!dom.perPortion?.checked;
  const label = (dom.title?.value || "").trim();

  const macros = readMacros();
  if (!macros) return;

  const weight = perPortion ? null : readWeight();
  if (!perPortion && weight == null) return;

  addRow({ macros, weight, label, perPortion });
}

function onClear() {
  rows = [];
  saveRows();
  render();
  setHint("Очищено.");
}

function onChoosePreset() {
  setHint("");

  const idx = parseInt(dom.preset?.value ?? "", 10);
  if (!Number.isFinite(idx) || !presets[idx]) {
    setHint("Выберите продукт из списка.");
    return;
  }

  const p = presets[idx];

  // Подставим в поля (чтобы видно было)
  dom.macros.k.value = fmt1(p.k);
  dom.macros.b.value = fmt1(p.b);
  dom.macros.j.value = fmt1(p.j);
  dom.macros.u.value = fmt1(p.u);
  if (dom.title) dom.title.value = p.name;

  const perPortion = !!dom.perPortion?.checked;

  if (perPortion) {
    addRow({ macros: { k: p.k, b: p.b, j: p.j, u: p.u }, weight: null, label: p.name, perPortion: true });
  } else {
    if (dom.weight) dom.weight.value = String(p.weight);
    addRow({ macros: { k: p.k, b: p.b, j: p.j, u: p.u }, weight: p.weight, label: p.name, perPortion: false });
  }
}

function onListClick(e) {
  const t = e.target;
  if (!(t instanceof Element)) return;

  const del = t.closest("[data-del]");
  const rep = t.closest("[data-repeat]");

  if (del) {
    const i = parseInt(del.getAttribute("data-del"), 10);
    if (!Number.isFinite(i) || !rows[i]) return;

    rows.splice(i, 1);
    saveRows();
    render();
    return;
  }

  if (rep) {
    const i = parseInt(rep.getAttribute("data-repeat"), 10);
    if (!Number.isFinite(i) || !rows[i]) return;

    rows.push({ ...rows[i] });
    saveRows();
    render();
  }
}

// ====== Read & Validate ======
function readMacros() {
  const out = {};

  for (const key of MACRO_KEYS) {
    const el = dom.macros[key];
    const raw = normalizeNumber(el?.value ?? "");

    if (raw === "") {
      setHint("КБЖУ: заполните все 4 поля.");
      return null;
    }

    if (!MACRO_RE.test(raw)) {
      setHint("КБЖУ: 0..9999 и 1 знак после точки (например 0, 0.1, 12.3, 1234.5).");
      return null;
    }

    const val = Number(raw);
    if (!Number.isFinite(val) || val < 0) {
      setHint("КБЖУ: значение должно быть неотрицательным числом.");
      return null;
    }

    out[key] = val;
  }

  return out;
}

function readWeight() {
  const raw = String(dom.weight?.value ?? "").trim();

  if (!WEIGHT_RE.test(raw)) {
    setHint("Вес: целое положительное число, максимум 4 цифры (например 250).");
    return null;
  }

  const w = parseInt(raw, 10);
  if (!Number.isFinite(w) || w <= 0) {
    setHint("Вес: должен быть > 0.");
    return null;
  }

  return w;
}

function normalizeNumber(str) {
  return String(str).trim().replace(",", ".");
}

// ====== Rows & Math ======
function addRow({ macros, weight, label, perPortion }) {
  const safeLabel = String(label || "").trim();

  const res = perPortion
    ? {
        label: safeLabel,
        perPortion: true,
        weight: "—",
        k: round1(macros.k),
        b: round1(macros.b),
        j: round1(macros.j),
        u: round1(macros.u),
      }
    : {
        label: safeLabel,
        perPortion: false,
        weight,
        ...calcByWeight(macros, weight),
      };

  rows.push(res);
  saveRows();
  render();
}

function calcByWeight(m, w) {
  return {
    k: round1((m.k * w) / 100),
    b: round1((m.b * w) / 100),
    j: round1((m.j * w) / 100),
    u: round1((m.u * w) / 100),
  };
}

// ====== Render ======
function render() {
  if (!dom.list) return;

  // Totals
  const total = rows.reduce(
    (acc, r) => {
      acc.k += safeNum(r.k);
      acc.b += safeNum(r.b);
      acc.j += safeNum(r.j);
      acc.u += safeNum(r.u);
      return acc;
    },
    { k: 0, b: 0, j: 0, u: 0 }
  );

  if (dom.sumK) dom.sumK.textContent = fmt1(total.k);
  if (dom.sumB) dom.sumB.textContent = fmt1(total.b);
  if (dom.sumJ) dom.sumJ.textContent = fmt1(total.j);
  if (dom.sumU) dom.sumU.textContent = fmt1(total.u);

  // List cards
  dom.list.innerHTML = rows
    .map((r, idx) => {
      const name = (r.label && r.label.trim()) ? escapeHtml(r.label.trim()) : `#${idx + 1}`;
      const per = r.weight === "—";
      const sub = per ? "Порция" : `Вес: ${r.weight} г`;

      return `
        <div class="item-card" data-idx="${idx}">
          <div class="item-head">
            <div>
              <div class="item-title">${name}</div>
              <div class="item-sub">${sub}</div>
            </div>
            <div class="item-actions">
              <button class="act-btn rep" data-repeat="${idx}" title="Повторить">↻</button>
              <button class="act-btn del" data-del="${idx}" title="Удалить">✕</button>
            </div>
          </div>

          <div class="macro-grid">
            <div class="macro-pill">
              <div class="macro-left">🔥 Ккал</div>
              <div class="macro-val">${fmt1(r.k)}</div>
            </div>
            <div class="macro-pill">
              <div class="macro-left">💪 Б</div>
              <div class="macro-val">${fmt1(r.b)}</div>
            </div>
            <div class="macro-pill">
              <div class="macro-left">🥑 Ж</div>
              <div class="macro-val">${fmt1(r.j)}</div>
            </div>
            <div class="macro-pill">
              <div class="macro-left">🌾 У</div>
              <div class="macro-val">${fmt1(r.u)}</div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

// ====== Presets ======
async function initPresets() {
  dom.preset.innerHTML = `<option value="">Загрузка…</option>`;

  try {
    const resp = await fetch(PRODUCTS_URL, { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json();
    presets = sanitizePresets(data);

    if (presets.length === 0) {
      dom.preset.innerHTML = `<option value="">(Список пуст)</option>`;
      return;
    }

    dom.preset.innerHTML = presets
      .map((p, i) => `<option value="${i}">${escapeHtml(p.name)}</option>`)
      .join("");
  } catch {
    presets = [];
    dom.preset.innerHTML = `<option value="">(Не удалось загрузить список)</option>`;
    setHint("Не смог загрузить products.json. Проверь, что файл рядом с index.html и попал в репозиторий.");
  }
}

function sanitizePresets(data) {
  if (!Array.isArray(data)) return [];

  return data
    .map((x) => ({
      name: String(x.name ?? "").trim(),
      k: Number(x.k),
      b: Number(x.b),
      j: Number(x.j),
      u: Number(x.u),
      weight: parseInt(x.weight, 10),
    }))
    .filter((p) => {
      if (!p.name) return false;
      // пресеты допускают 0.0
      if (![p.k, p.b, p.j, p.u].every((n) => Number.isFinite(n) && n >= 0)) return false;
      if (!(Number.isFinite(p.weight) && p.weight > 0 && p.weight <= 9999)) return false;
      return true;
    });
}

// ====== Utils ======
function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function round1(num) {
  return Math.round(safeNum(num) * 10) / 10;
}

function fmt1(num) {
  return (Math.round(safeNum(num) * 10) / 10).toFixed(1);
}

function setHint(text) {
  if (dom.hint) dom.hint.textContent = text || "";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c]));
}

// ====== LocalStorage ======
function saveRows() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    setHint("Не удалось сохранить данные (localStorage недоступен).");
  }
}

function loadRows() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];

    return data
      .map((r) => ({
        label: String(r.label ?? ""),
        perPortion: !!r.perPortion,
        weight: (r.weight === "—") ? "—" : parseInt(r.weight, 10),
        k: Number(r.k),
        b: Number(r.b),
        j: Number(r.j),
        u: Number(r.u),
      }))
      .filter((r) => {
        if (![r.k, r.b, r.j, r.u].every((n) => Number.isFinite(n))) return false;
        if (r.weight === "—") return true;
        return Number.isFinite(r.weight) && r.weight > 0;
      });
  } catch {
    return [];
  }
}

function getTotalsText() {
  const k = dom.sumK?.textContent ?? "0.0";
  const b = dom.sumB?.textContent ?? "0.0";
  const j = dom.sumJ?.textContent ?? "0.0";
  const u = dom.sumU?.textContent ?? "0.0";
  return `К: ${k} | Б: ${b} | Ж: ${j} | У: ${u}`;
}

async function copyTotalsToClipboard() {
  const text = getTotalsText();

  try {
    await navigator.clipboard.writeText(text);
    setHint("Скопировано ✅");
  } catch {
    // запасной вариант для старых браузеров
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      setHint("Скопировано ✅");
    } catch {
      setHint("Не удалось скопировать 😕");
    }
    document.body.removeChild(ta);
  }
}
