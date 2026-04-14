import { loadStocksFromDB, consumeStockInDB } from "./db.js";

const listEl = document.getElementById("stocksList");
const hintEl = document.getElementById("stocksHint");

let stocks = [];

init();

async function init() {
  await reloadStocks();
  listEl?.addEventListener("keydown", onStocksKeydown);
}

async function reloadStocks() {
  stocks = await loadStocksFromDB();
  renderStocks();
}

function renderStocks() {
  if (!listEl) return;

  if (!stocks.length) {
    listEl.innerHTML = `<div class="preset-empty">(Список пуст)</div>`;
    return;
  }

  listEl.innerHTML = stocks
    .map((s, i) => {
      const companyText = s.company ? `Фирма: ${escapeHtml(s.company)}` : "Без фирмы";

      return `
        <div class="stock-card" data-stock-idx="${i}">
          <div class="stock-head">
            <div>
              <div class="stock-title">${escapeHtml(s.name)}</div>
              <div class="stock-sub">${companyText}</div>
              <div class="stock-sub">Остаток: ${fmt1(s.stock_g)} г</div>
            </div>
          </div>

          <div class="stock-macro-grid">
            <div class="stock-macro-pill stock-k">
              <span class="stock-macro-left">🔥 Калории</span>
              <span class="stock-macro-val">${fmt1(s.k)}</span>
            </div>
            <div class="stock-macro-pill stock-b">
              <span class="stock-macro-left">💪 Белки</span>
              <span class="stock-macro-val">${fmt1(s.b)}</span>
            </div>
            <div class="stock-macro-pill stock-j">
              <span class="stock-macro-left">🥑 Жиры</span>
              <span class="stock-macro-val">${fmt1(s.j)}</span>
            </div>
            <div class="stock-macro-pill stock-u">
              <span class="stock-macro-left">🌾 Углеводы</span>
              <span class="stock-macro-val">${fmt1(s.u)}</span>
            </div>
          </div>

          <div class="stock-bottom">
            <div class="stock-portion">Базовая порция: ${fmt1(s.per_weight_g)} г</div>
            <input
              type="text"
              class="stock-consume-input"
              placeholder="Списать: 200 или x2"
              data-consume-idx="${i}"
            />
          </div>
        </div>
      `;
    })
    .join("");
}

async function onStocksKeydown(e) {
  if (e.key !== "Enter") return;

  const input = e.target instanceof Element ? e.target.closest("[data-consume-idx]") : null;
  if (!input) return;

  const idx = Number(input.getAttribute("data-consume-idx"));
  if (!Number.isFinite(idx) || !stocks[idx]) return;

  const stock = stocks[idx];
  const raw = String(input.value ?? "").trim();
  const amountG = parseConsumeInput(raw, stock.per_weight_g);

  if (!amountG || amountG <= 0) {
    setHint("Не понял количество. Пример: 200 или x2");
    return;
  }

  try {
    await consumeStockInDB(stock, amountG);

    // редирект на главную
    window.location.href = "./index.html";
  } catch (err) {
    console.error(err);
     const msg = String(err?.message || "");
  if (msg.includes("not enough stock")) {
    setHint("Нельзя списать больше, чем есть в запасе 😕");
  } else {
    setHint("Не удалось списать запас 😕");
  }
  }
}

function parseConsumeInput(raw, portionG) {
  const text = String(raw).trim().toLowerCase().replace(",", ".");

  if (!text) return 0;

  if (/^x\s*\d+(\.\d+)?$/.test(text)) {
    const count = Number(text.replace("x", "").trim());
    return count * portionG;
  }

  if (/^\d+(\.\d+)?\s*шт$/.test(text)) {
    const count = Number(text.replace("шт", "").trim());
    return count * portionG;
  }

  const grams = Number(text);
  return Number.isFinite(grams) ? grams : 0;
}

function setHint(text) {
  if (hintEl) hintEl.textContent = text || "";
}

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function fmt1(num) {
  return (Math.round(safeNum(num) * 10) / 10).toFixed(1);
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