import { addStockToDB } from "./db.js";

function safeNum(x) {
  const n = Number(String(x ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function round1(num) {
  return Math.round(safeNum(num) * 10) / 10;
}

const rowsEl = document.getElementById("calcRows");
const addBtn = document.getElementById("addCalcRow");
const heatTreatmentEl = document.getElementById("heatTreatment");
const cookedWeightEl = document.getElementById("cookedWeight");
const resultTitleEl = document.getElementById("resultTitle");
const saveToStocksBtn = document.getElementById("saveToStocks");

const resultEls = {
  k: document.getElementById("resultK"),
  b: document.getElementById("resultB"),
  j: document.getElementById("resultJ"),
  u: document.getElementById("resultU"),
  w: document.getElementById("resultW"),
};

init();

function init() {
  addCalcRow();

  addBtn?.addEventListener("click", addCalcRow);
  rowsEl?.addEventListener("input", onRowsChange);
  rowsEl?.addEventListener("keydown", onRowsKeydown);

  heatTreatmentEl?.addEventListener("change", onHeatTreatmentChange);
  cookedWeightEl?.addEventListener("input", recalc);

  saveToStocksBtn?.addEventListener("click", onSaveToStocks);

  recalc();
  updateAddButtonState();
  syncCookedWeightDisabled();
}

function addCalcRow() {
  const row = document.createElement("div");
  row.className = "calc-row";

  row.innerHTML = `
    <input type="text" class="calc-name" placeholder="Ингредиент" maxlength="60" />
    <input type="number" class="calc-k" placeholder="🔥 Ккал" step="0.1" min="0" />
    <input type="number" class="calc-b" placeholder="💪 Белки" step="0.1" min="0" />
    <input type="number" class="calc-j" placeholder="🥑 Жиры" step="0.1" min="0" />
    <input type="number" class="calc-u" placeholder="🌾 Углеводы" step="0.1" min="0" />
    <input type="number" class="calc-w" placeholder="⚖️ Вес" step="1" min="0" />
  `;

  rowsEl?.appendChild(row);

  const firstInput = row.querySelector(".calc-name");
  if (firstInput instanceof HTMLInputElement) {
    firstInput.focus();
  }

  updateAddButtonState();
  recalc();
}

function onRowsChange() {
  recalc();
  updateAddButtonState();
}

function onRowsKeydown(e) {
  if (e.key !== "Enter") return;

  const row = e.target instanceof Element ? e.target.closest(".calc-row") : null;
  if (!row) return;

  const isLastRow = row === getLastRow();
  if (!isLastRow) return;
  if (!isLastRowComplete()) return;

  e.preventDefault();
  addCalcRow();
}

function onHeatTreatmentChange() {
  syncCookedWeightDisabled();
  recalc();
}

function syncCookedWeightDisabled() {
  const enabled = !!heatTreatmentEl?.checked;
  if (!cookedWeightEl) return;

  cookedWeightEl.disabled = !enabled;

  if (!enabled) {
    cookedWeightEl.value = "";
  }
}

function getLastRow() {
  const rows = rowsEl ? [...rowsEl.querySelectorAll(".calc-row")] : [];
  return rows.length ? rows[rows.length - 1] : null;
}

function isLastRowComplete() {
  const row = getLastRow();
  if (!row) return false;

  const k = row.querySelector(".calc-k")?.value ?? "";
  const b = row.querySelector(".calc-b")?.value ?? "";
  const j = row.querySelector(".calc-j")?.value ?? "";
  const u = row.querySelector(".calc-u")?.value ?? "";
  const w = row.querySelector(".calc-w")?.value ?? "";

  return [k, b, j, u, w].every(v => String(v).trim() !== "");
}

function updateAddButtonState() {
  if (!addBtn) return;
  addBtn.disabled = !isLastRowComplete();
}

function calculateTotals() {
  const rows = [...document.querySelectorAll(".calc-row")];

  let totalK = 0;
  let totalB = 0;
  let totalJ = 0;
  let totalU = 0;
  let totalRawW = 0;

  for (const row of rows) {
    const k = safeNum(row.querySelector(".calc-k")?.value);
    const b = safeNum(row.querySelector(".calc-b")?.value);
    const j = safeNum(row.querySelector(".calc-j")?.value);
    const u = safeNum(row.querySelector(".calc-u")?.value);
    const w = safeNum(row.querySelector(".calc-w")?.value);

    if (w > 0) {
      totalK += (k * w) / 100;
      totalB += (b * w) / 100;
      totalJ += (j * w) / 100;
      totalU += (u * w) / 100;
      totalRawW += w;
    }
  }

  let finalWeight = totalRawW;

  if (heatTreatmentEl?.checked) {
    const cookedWeight = safeNum(cookedWeightEl?.value);
    if (cookedWeight > 0) {
      finalWeight = cookedWeight;
    }
  }

  return {
    totalK: round1(totalK),
    totalB: round1(totalB),
    totalJ: round1(totalJ),
    totalU: round1(totalU),
    finalWeight: Math.round(finalWeight),
  };
}

function recalc() {
  const totals = calculateTotals();

  resultEls.k.textContent = totals.totalK.toFixed(1);
  resultEls.b.textContent = totals.totalB.toFixed(1);
  resultEls.j.textContent = totals.totalJ.toFixed(1);
  resultEls.u.textContent = totals.totalU.toFixed(1);
  resultEls.w.textContent = String(totals.finalWeight);
}

async function onSaveToStocks() {
  const title = String(resultTitleEl?.value ?? "").trim();
  if (!title) {
    alert("Сначала укажи название блюда.");
    return;
  }

  const totals = calculateTotals();

  if (totals.finalWeight <= 0) {
    alert("Итоговый вес должен быть больше 0.");
    return;
  }

  const per100K = round1((totals.totalK * 100) / totals.finalWeight);
  const per100B = round1((totals.totalB * 100) / totals.finalWeight);
  const per100J = round1((totals.totalJ * 100) / totals.finalWeight);
  const per100U = round1((totals.totalU * 100) / totals.finalWeight);

  try {
    await addStockToDB({
      name: title,
      company: null,
      k: per100K,
      b: per100B,
      j: per100J,
      u: per100U,
      per_weight_g: 100,
      stock_g: totals.finalWeight,
    });

    window.location.href = "./stocks.html";
  } catch (err) {
    console.error(err);
    alert("Не удалось сохранить в запасы.");
  }
}