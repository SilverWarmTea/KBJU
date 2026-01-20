// ====== DOM ======
const inputs = {
  k: document.getElementById("k"),
  b: document.getElementById("b"),
  j: document.getElementById("j"),
  u: document.getElementById("u"),
};
const weightInput = document.getElementById("weight");

const addBtn = document.getElementById("add");
const clearBtn = document.getElementById("clear");
const tbody = document.getElementById("tbody");
const sumEl = document.getElementById("sum");
const hintEl = document.getElementById("hint");

// ====== Storage ======
const STORAGE_KEY = "kbju_rows_v1";

// rows: [{ weight, k, b, j, u }]
let rows = loadRows();
render();

// ====== Events ======
addBtn.addEventListener("click", () => {
  hint("");

  const weightRaw = (weightInput.value || "").trim();
  const weight = parseInt(weightRaw, 10);

  if (!isValidWeight(weightRaw, weight)) {
    hint("Вес: целое положительное число, максимум 4 цифры (например 250).");
    return;
  }

  const per100 = {};
  for (const key of ["k", "b", "j", "u"]) {
    const raw = normalizeNumber(inputs[key].value);

    // пусто / не число
    if (raw === "" || raw === null) {
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

  const res = {
    weight,
    k: round1((per100.k * weight) / 100),
    b: round1((per100.b * weight) / 100),
    j: round1((per100.j * weight) / 100),
    u: round1((per100.u * weight) / 100),
  };

  rows.push(res);
  saveRows();
  render();
});

clearBtn.addEventListener("click", () => {
  rows = [];
  saveRows();
  render();
  hint("Очищено.");
});

// ====== Render ======
function render() {
  tbody.innerHTML = "";

  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${r.weight}</td>
      <td>${fmt1(r.k)}</td>
      <td>${fmt1(r.b)}</td>
      <td>${fmt1(r.j)}</td>
      <td>${fmt1(r.u)}</td>
      <td><button class="icon-btn" data-del="${idx}" title="Удалить">✕</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Удаление строки
  tbody.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.getAttribute("data-del"), 10);
      if (!Number.isFinite(i)) return;

      rows.splice(i, 1);
      saveRows();
      render();
    });
  });

  // Сумма
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
  // строго положительные
  if (!Number.isFinite(value) || value <= 0) return false;

  // до 4 цифр целой части и 1 знак после точки (или без дробной)
  // rawStr уже нормализован (точка)
  // примеры OK: 1, 12, 1234, 0.1, 12.3, 1234.5
  // НЕ OK: 12345, 1.23, -1, 0, 00.1 (строгость можно ослабить при желании)
  return /^\d{1,4}(\.\d)?$/.test(rawStr);
}

function isValidWeight(rawStr, value) {
  // строго положительный вес
  if (!Number.isFinite(value) || value <= 0) return false;

  // целое до 4 цифр
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
  } catch (e) {
    // Если storage переполнен/запрещён — хотя для твоих объёмов это почти нереально
    hint("Не удалось сохранить данные (localStorage недоступен).");
  }
}

function loadRows() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) return [];
    // лёгкая санитария данных
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
