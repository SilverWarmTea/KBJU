import { loadStocksV2FromDB, consumeStockV2InDB } from "./db.js";
import { renderProductCard } from "./product-card.js";

const listEl = document.getElementById("stocksList");
const hintEl = document.getElementById("stocksHint");

let stocks = [];

init();

async function init() {
  await reloadStocks();
  listEl?.addEventListener("keydown", onStocksKeydown);
  listEl?.addEventListener("click", onStocksClick);
}

async function reloadStocks() {
  stocks = await loadStocksV2FromDB();
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
      const modeText = "Режим: по весу";
      const baseText = `База: ${fmt1(s.per_weight_g || 100)} г`;

      const extraTitle = "Запасы";
      const extraText =
        s.calc_mode === "unit"
          ? `Осталось: ${s.stock_amount} шт`
          : `Осталось: ${s.stock_amount} г`;

      return `
        <div class="stock-item-wrap">
          ${renderProductCard(
            {
              name: s.name,
              company: s.company ?? null,
              k: fmt1(s.k),
              b: fmt1(s.b),
              j: fmt1(s.j),
              u: fmt1(s.u),
              modeText,
              baseText,
              extraTitle,
              extraText
            },
            {
  actionPanel: `
    <div class="product-card__inline-action">
      <input
        type="text"
        class="stock-consume-input"
        placeholder="200 или x2"
        data-consume-idx="${i}"
      />
      <button
        type="button"
        class="product-card__action-btn"
        data-action="consume:${i}"
      >
        Списать
      </button>
    </div>
  `
}
          )}
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

function onStocksClick(e) {
  const btn = e.target instanceof Element ? e.target.closest("[data-action]") : null;
  if (!btn) return;

  const raw = btn.getAttribute("data-action") || "";
  const [kind, idxText] = raw.split(":");
  const idx = Number(idxText);

  if (kind === "consume") {
    handleConsume(idx);
    return;
  }
}

async function handleConsume(idx) {
  if (!Number.isFinite(idx) || !stocks[idx]) return;

  const stock = stocks[idx];
  const input = listEl?.querySelector(`[data-consume-idx="${idx}"]`);
  if (!(input instanceof HTMLInputElement)) return;

  const raw = String(input.value ?? "").trim();
  const amountG = parseConsumeInput(raw, stock.per_weight_g);

  if (!amountG || amountG <= 0) {
    setHint("Не понял количество. Пример: 200 или x2");
    return;
  }

  try {
    await consumeStockV2InDB(stock, amountG);
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