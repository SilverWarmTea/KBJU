// ====== DOM ======
const inputs = {
  k: document.getElementById("k"),
  b: document.getElementById("b"),
  j: document.getElementById("j"),
  u: document.getElementById("u"),
};
const weightInput = document.getElementById("weight");
const perPortionCheckbox = document.getElementById("perPortion");

const addBtn = document.getElementById("add");
const clearBtn = document.getElementById("clear");
const tbody = document.getElementById("tbody");
const sumEl = document.getElementById("sum");
const hintEl = document.getElementById("hint");

// Presets UI (добавь в index.html)
const presetSelect = document.getElementById("preset");
const chooseBtn = document.getElementById("choose");

// ====== Storage ======
const STORAGE_KEY = "kbju_rows_v1";
let rows = loadRows();
render();

// ====== Presets ======
let presets = []; // [{name,k,b,j,u,weight}]
initPresets();

// ====== Events ======
addBtn.addEventListener("click", () => {
  hint("");

const perPortion = perPortionCheckbox.checked;

let weight = 0;
if (!perPortion) {
  const weightRaw = (weightInput.value || "").trim();
  weight = parseInt(weightRaw, 10);

  if (!isValidWeight(weightRaw, weight)) {
    hint("Вес: целое положительное число, максимум 4 цифры (например 250).");
    return;
  }
}

  const per100 = {};
  for (const key of ["k", "b", "j", "u"]) {
    const raw = normalizeNumber(inputs[key].value);
    if (raw === "") {
      hint("КБЖУ/100г: заполните все 4 поля.");
      return;
    }
    const value = parseFloat(raw);
    if (!isValidMacro(raw, value)) {
      hint("КБЖУ/100г: только положительные, до 4 цифр целой части и 1 знак после точки (например 1234.5).");
      return;
    }
    per100[key] = value;
  }

  addRowFromValues(per100, weight);
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

    // Заполним поля формы (удобно, чтобы видно было откуда взялось)
    inputs.k.value = fmt1(p.k);
    inputs.b.value = fmt1(p.b);
    inputs.j.value = fmt1(p.j);
    inputs.u.value = fmt1(p.u);
    weightInput.value = String(p.weight);

    // И сразу добавим строку в таблицу
    addRowFromValues({ k: p.k, b: p.b, j: p.j, u: p.u }, p.weight);
  });
}

// ====== Core ======
function addRowFromValues(per100, weight) {
  const perPortion = perPortionCheckbox.checked;

  const res = perPortion
    ? {
        weight: "—",
        k: round1(per100.k),
        b: round1(per100.b),
        j: round1(per100.j),
        u: round1(per100.u),
      }
    : {
        weight,
        k: round1((per100.k * weight) / 100),
        b: round1((per100.b * weight) / 100),
        j: round1((per100.j * weight) / 100),
        u: round1((per100.u * weight) / 100),
      };

  rows.push(res);
  saveRows();
  render();
}
// ====== Render ======
function render() {
  tbody.innerHTML = "";

  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="#">${idx + 1}</td>
      <td data-label="Вес, г">${r.weight}</td>
      <td data-label="Ккал">${fmt1(r.k)}</td>
      <td data-label="Б">${fmt1(r.b)}</td>
      <td data-label="Ж">${fmt1(r.j)}</td>
      <td data-label="У">${fmt1(r.u)}</td>
      <td class="action" data-label="">
      <button class="icon-btn" data-del="${idx}" title="Удалить">Удалить</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.getAttribute("data-del"), 10);
      if (!Number.isFinite(i)) return;
      rows.splice(i, 1);
      saveRows();
      render();
    });
  });

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
    // файл лежит рядом с index.html
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
    hint("Не смог загрузить products.json. Проверь, что файл есть в репозитории и лежит рядом с index.html.");
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
      // Здесь допускаю 0.0 для макросов (иногда реально 0)
      // но ты изначально хотел строго положительные — если хочешь строго, поменяем на >0
      if (![p.k, p.b, p.j, p.u].every((n) => Number.isFinite(n) && n >= 0)) return false;
      if (!(Number.isFinite(p.weight) && p.weight > 0 && p.weight <= 9999)) return false;
      return true;
    });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c]));
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
function isValidMacro(rawStr, value) {
  if (!Number.isFinite(value) || value <= 0) return false;
  return /^\d{1,4}(\.\d)?$/.test(rawStr);
}
function isValidWeight(rawStr, value) {
  if (!Number.isFinite(value) || value <= 0) return false;
  return /^\d{1,4}$/.test(rawStr);
}
function round1(num) {
  return Math.round(num * 10) / 10;
}
function fmt1(num) {
  return (Math.round(safeNum(num) * 10) / 10).toFixed(1);
}
function hint(text) {
  hintEl.textContent = text || "";
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
        weight: parseInt(r.weight, 10),
        k: Number(r.k),
        b: Number(r.b),
        j: Number(r.j),
        u: Number(r.u),
      }))
      .filter((r) => Number.isFinite(r.weight) && r.weight > 0);
  } catch {
    return [];
  }
}
