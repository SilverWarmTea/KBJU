// ====== DOM ======
const inputs = {
  k: document.getElementById("k"),
  b: document.getElementById("b"),
  j: document.getElementById("j"),
  u: document.getElementById("u"),
};

const titleInput = document.getElementById("title");
const weightInput = document.getElementById("weight");
const perPortionCheckbox = document.getElementById("perPortion");

function syncWeightDisabled() {
  const perPortion = perPortionCheckbox.checked;
  weightInput.disabled = perPortion;
  if (perPortion) weightInput.value = "";
}
perPortionCheckbox.addEventListener("change", syncWeightDisabled);
syncWeightDisabled();


const addBtn = document.getElementById("add");
const clearBtn = document.getElementById("clear");

const tbody = document.getElementById("tbody");
const sumEl = document.getElementById("sum");
const hintEl = document.getElementById("hint");

// Presets
const presetSelect = document.getElementById("preset");
const chooseBtn = document.getElementById("choose");

// ====== Storage ======
const STORAGE_KEY = "kbju_rows_v2"; // новая версия, чтобы не конфликтовать со старой
let rows = loadRows();
render();

// ====== Presets ======
let presets = []; // [{name,k,b,j,u,weight}]
initPresets();

// ====== Events ======
addBtn.addEventListener("click", () => {
  hint("");

  const label = (titleInput?.value || "").trim();
  const perPortion = !!perPortionCheckbox?.checked;

  let weight = null;
  if (!perPortion) {
    const weightRaw = (weightInput.value || "").trim();
    weight = parseInt(weightRaw, 10);

    if (!isValidWeight(weightRaw, weight)) {
      hint("Вес: целое положительное число, максимум 4 цифры (например 250).");
      return;
    }
  }

  const values = {};
  for (const key of ["k", "b", "j", "u"]) {
    const raw = normalizeNumber(inputs[key].value);

    if (raw === "") {
      hint("КБЖУ: заполните все 4 поля.");
      return;
    }

    const value = parseFloat(raw);

    // Для ручного ввода оставляем строго > 0 как ты просил изначально
    if (!isValidMacroStrict(raw, value)) {
      hint("КБЖУ: только положительные числа, до 4 цифр целой части и 1 знак после точки (например 1234.5).");
      return;
    }

    values[key] = value;
  }

  addRow(values, weight, label, perPortion);
});

clearBtn.addEventListener("click", () => {
  rows = [];
  saveRows();
  render();
  hint("Очищено.");
});

if (chooseBtn && presetSelect) {
  chooseBtn.addEventListener("click", () => {
    hint("");

    const idx = parseInt(presetSelect.value, 10);
    if (!Number.isFinite(idx) || !presets[idx]) {
      hint("Выберите продукт из списка.");
      return;
    }

    const p = presets[idx];

    // Заполним поля, чтобы было видно, что выбрано
    inputs.k.value = fmt1(p.k);
    inputs.b.value = fmt1(p.b);
    inputs.j.value = fmt1(p.j);
    inputs.u.value = fmt1(p.u);

    // Название подставим
    if (titleInput) titleInput.value = p.name;

    const perPortion = !!perPortionCheckbox?.checked;

    if (perPortion) {
      // На порцию: вес не нужен
      addRow({ k: p.k, b: p.b, j: p.j, u: p.u }, null, p.name, true);
    } else {
      // По весу: берём вес из пресета (и покажем его в инпуте)
      weightInput.value = String(p.weight);
      addRow({ k: p.k, b: p.b, j: p.j, u: p.u }, p.weight, p.name, false);
    }
  });
}

// ====== Core ======
function addRow(values, weight, label = "", perPortion = false) {
  const safeLabel = String(label || "").trim();

  const res = perPortion
    ? {
        label: safeLabel,
        perPortion: true,
        weight: "—",
        k: round1(values.k),
        b: round1(values.b),
        j: round1(values.j),
        u: round1(values.u),
      }
    : {
        label: safeLabel,
        perPortion: false,
        weight: weight,
        k: round1((values.k * weight) / 100),
        b: round1((values.b * weight) / 100),
        j: round1((values.j * weight) / 100),
        u: round1((values.u * weight) / 100),
      };

  rows.push(res);
  saveRows();
  render();
}

// ====== Render ======
function render() {
  tbody.innerHTML = "";

  rows.forEach((r, idx) => {
    const firstCol = (r.label && r.label.trim()) ? escapeHtml(r.label.trim()) : String(idx + 1);
    const w = (r.weight === "—") ? "—" : String(r.weight);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="#">${firstCol}</td>
      <td data-label="Вес, г">${escapeHtml(w)}</td>
      <td data-label="Ккал">${fmt1(r.k)}</td>
      <td data-label="Б">${fmt1(r.b)}</td>
      <td data-label="Ж">${fmt1(r.j)}</td>
      <td data-label="У">${fmt1(r.u)}</td>
      <td class="action" data-label="">
        <button class="icon-btn" data-repeat="${idx}" title="Повторить">Повторить</button>
        <button class="icon-btn" data-del="${idx}" title="Удалить">Удалить</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Delete
  tbody.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.getAttribute("data-del"), 10);
      if (!Number.isFinite(i) || !rows[i]) return;

      rows.splice(i, 1);
      saveRows();
      render();
    });
  });

  // Repeat
  tbody.querySelectorAll("button[data-repeat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.getAttribute("data-repeat"), 10);
      if (!Number.isFinite(i) || !rows[i]) return;

      rows.push({ ...rows[i] }); // копия строки
      saveRows();
      render();
    });
  });

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

  sumEl.textContent = `К: ${fmt1(total.k)} | Б: ${fmt1(total.b)} | Ж: ${fmt1(total.j)} | У: ${fmt1(total.u)}`;
}

// ====== Presets loading ======
async function initPresets() {
  if (!presetSelect) return;

  presetSelect.innerHTML = `<option value="">Загрузка…</option>`;
  try {
    const resp = await fetch("./products.json", { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    presets = sanitizePresets(data);

    if (presets.length === 0) {
      presetSelect.innerHTML = `<option value="">(Список пуст)</option>`;
      return;
    }

    presetSelect.innerHTML = presets
      .map((p, i) => `<option value="${i}">${escapeHtml(p.name)}</option>`)
      .join("");
  } catch (e) {
    presets = [];
    presetSelect.innerHTML = `<option value="">(Не удалось загрузить список)</option>`;
    hint("Не смог загрузить products.json. Проверь, что файл лежит рядом с index.html и попал в репозиторий.");
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
      // Для пресетов допускаем 0.0 (например углеводы 0)
      if (![p.k, p.b, p.j, p.u].every((n) => Number.isFinite(n) && n >= 0)) return false;
      if (!(Number.isFinite(p.weight) && p.weight > 0 && p.weight <= 9999)) return false;
      return true;
    });
}

// ====== Helpers ======
function normalizeNumber(str) {
  if (str == null) return "";
  return String(str).trim().replace(",", ".");
}

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

// Строго положительные (для ручного ввода)
function isValidMacroStrict(rawStr, value) {
  // допускаем 0 и 0.1+
  if (!Number.isFinite(value) || value < 0) return false;

  // rawStr уже нормализован (запятая -> точка)
  // разрешаем: 0, 0.1, 12, 12.3, 1234, 1234.5
  return /^(?:0|[1-9]\d{0,3})(?:\.\d)?$/.test(rawStr);

// Вес: строго положительное целое до 4 цифр
function isValidWeight(rawStr, value) {
  if (!Number.isFinite(value) || value <= 0) return false;
  return /^\d{1,4}$/.test(rawStr);
}

function round1(num) {
  return Math.round(safeNum(num) * 10) / 10;
}

function fmt1(num) {
  return (Math.round(safeNum(num) * 10) / 10).toFixed(1);
}

function hint(text) {
  hintEl.textContent = text || "";
}

function escapeHtml(s) {
  const str = String(s);
  return str.replace(/[&<>"']/g, (c) => ({
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
    hint("Не удалось сохранить данные (localStorage недоступен).");
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
        // если порция — вес может быть "—"
        if (r.weight === "—") return true;
        // иначе вес валидируем как число
        return Number.isFinite(r.weight) && r.weight > 0;
      });
  } catch {
    return [];
  }
}
