// ====== Constants ======
const MACRO_KEYS = ["k", "b", "j", "u"];
const STORAGE_KEY = "kbju_rows_v2";
const PRODUCTS_URL = "./products.json";

// Разрешаем: 0..9999 и + (одна цифра после точки) -> 0, 0.1, 12, 12.3, 1234.5
const MACRO_RE = /^(?:0|[1-9]\d{0,3})(?:\.\d)?$/;
const WEIGHT_RE = /^\d{1,4}$/; // 1..9999 (проверим дополнительно > 0)

// ====== DOM ======
const dom = {
  inputs: {
    k: document.getElementById("k"),
    b: document.getElementById("b"),
    j: document.getElementById("j"),
    u: document.getElementById("u"),
  },

  title: document.getElementById("title"),
  weight: document.getElementById("weight"),
  perPortion: document.getElementById("perPortion"),

  add: document.getElementById("add"),
  clear: document.getElementById("clear"),

  tbody: document.getElementById("tbody"),
  sum: document.getElementById("sum"),
  hint: document.getElementById("hint"),

  preset: document.getElementById("preset"),
  choose: document.getElementById("choose"),
};

// ====== State ======
let rows = loadRows();
let presets = []; // [{name,k,b,j,u,weight}]

// ====== Init ======
init();
render();

// ====== Init Functions ======
function init() {
  // Включаем/выключаем вес при "На порцию"
  if (dom.perPortion && dom.weight) {
    dom.perPortion.addEventListener("change", syncWeightDisabled);
    syncWeightDisabled();
  }

  // Add
  dom.add?.addEventListener("click", onAdd);

  // Clear
  dom.clear?.addEventListener("click", () => {
    rows = [];
    saveRows();
    render();
    setHint("Очищено.");
  });

  // Presets
  if (dom.preset) initPresets();

  dom.choose?.addEventListener("click", onChoosePreset);

  // Делегирование кликов в таблице (Удалить/Повторить)
  dom.tbody?.addEventListener("click", onTableClick);
}

function syncWeightDisabled() {
  const per = !!dom.perPortion?.checked;
  dom.weight.disabled = per;
  if (per) dom.weight.value = "";
}

// ====== Handlers ======
function onAdd() {
  setHint("");

  const perPortion = !!dom.perPortion?.checked;
  const label = (dom.title?.value || "").trim();

  const macros = readMacrosFromInputs();
  if (!macros) return; // hint уже выставлен

  const weight = perPortion ? null : readWeight();
  if (!perPortion && weight == null) return;

  addRow(macros, weight, label, perPortion);
}

function onChoosePreset() {
  setHint("");

  const idx = parseInt(dom.preset?.value ?? "", 10);
  if (!Number.isFinite(idx) || !presets[idx]) {
    setHint("Выберите продукт из списка.");
    return;
  }

  const p = presets[idx];

  // Подставим значения в поля, чтобы было видно
  if (dom.inputs.k) dom.inputs.k.value = fmt1(p.k);
  if (dom.inputs.b) dom.inputs.b.value = fmt1(p.b);
  if (dom.inputs.j) dom.inputs.j.value = fmt1(p.j);
  if (dom.inputs.u) dom.inputs.u.value = fmt1(p.u);
  if (dom.title) dom.title.value = p.name;

  const perPortion = !!dom.perPortion?.checked;

  if (perPortion) {
    addRow({ k: p.k, b: p.b, j: p.j, u: p.u }, null, p.name, true);
  } else {
    if (dom.weight) dom.weight.value = String(p.weight);
    addRow({ k: p.k, b: p.b, j: p.j, u: p.u }, p.weight, p.name, false);
  }
}

function onTableClick(e) {
  const target = e.target;
  if (!(target instanceof Element)) return;

  const delBtn = target.closest("[data-del]");
  const repBtn = target.closest("[data-repeat]");

  if (delBtn) {
    const i = parseInt(delBtn.getAttribute("data-del"), 10);
    if (!Number.isFinite(i) || !rows[i]) return;
    rows.splice(i, 1);
    saveRows();
    render();
    return;
  }

  if (repBtn) {
    const i = parseInt(repBtn.getAttribute("data-repeat"), 10);
    if (!Number.isFinite(i) || !rows[i]) return;
    rows.push({ ...rows[i] });
    saveRows();
    render();
  }
}

// ====== Reading & Validation ======
function readMacrosFromInputs() {
  const out = {};

  for (const key of MACRO_KEYS) {
    const el = dom.inputs[key];
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

// ====== Rows ======
function addRow(macros, weight, label, perPortion) {
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
        weight: weight,
        ...calcByWeight(macros, weight),
      };

  rows.push(res);
  saveRows();
  render();
}

function calcByWeight(macros, weight) {
  return {
    k: round1((macros.k * weight) / 100),
    b: round1((macros.b * weight) / 100),
    j: round1((macros.j * weight) / 100),
    u: round1((macros.u * weight) / 100),
  };
}

// ====== Render ======
function render() {
  if (!dom.tbody || !dom.sum) return;

  // Table body
  dom.tbody.innerHTML = rows
    .map((r, idx) => {
      const label = (r.label && r.label.trim()) ? escapeHtml(r.label.trim()) : String(idx + 1);
      const w = (r.weight === "—") ? "—" : String(r.weight);

      return `
        <tr>
          <td data-label="#">${label}</td>
          <td data-label="Вес, г">${escapeHtml(w)}</td>
          <td data-label="Ккал">${fmt1(r.k)}</td>
          <td data-label="Б">${fmt1(r.b)}</td>
          <td data-label="Ж">${fmt1(r.j)}</td>
          <td data-label="У">${fmt1(r.u)}</td>
          <td class="action" data-label="">
            <button class="icon-btn" data-repeat="${idx}" title="Повторить">Повторить</button>
            <button class="icon-btn" data-del="${idx}" title="Удалить">Удалить</button>
          </td>
        </tr>
      `;
    })
    .join("");

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

  dom.sum.textContent = `К: ${fmt1(total.k)} | Б: ${fmt1(total.b)} | Ж: ${fmt1(total.j)} | У: ${fmt1(total.u)}`;
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
      // пресеты: допускаем 0.0
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
        // макросы должны быть числами
        if (![r.k, r.b, r.j, r.u].every((n) => Number.isFinite(n))) return false;
        // "на порцию"
        if (r.weight === "—") return true;
        // иначе — валидный вес
        return Number.isFinite(r.weight) && r.weight > 0;
      });
  } catch {
    return [];
  }
}
