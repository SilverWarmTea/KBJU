import {
  loadFoodsV2FromDB,
  addCurrentItemV2ToDB,
  loadStocksV2FromDB,
  addStockV2ToDB,
  addAmountToStockV2,
  deleteFoodV2InDB,
  setFoodFavoriteV2InDB
} from "../shared/db.js";

import { renderProductCard } from "../shared/product-card.js";

const listEl = document.getElementById("productsList");
const hintEl = document.getElementById("hint");
const searchEl = document.getElementById("productsSearch");
const companyEl = document.getElementById("productsCompany");

let presets = [];
let filteredPresets = [];
let stocks = [];

init();

async function init() {
  try {
    await reloadAll();
  } catch (e) {
    console.error(e);
    setHint("Не удалось загрузить продукты.");
  }

  listEl?.addEventListener("click", onProductsClick);
  searchEl?.addEventListener("input", applyFilters);
  companyEl?.addEventListener("change", applyFilters);
}

async function reloadAll() {
  presets = await loadFoodsV2FromDB();
  stocks = await loadStocksV2FromDB();
  renderCompanyOptions();
  applyFilters();
}

function renderCompanyOptions() {
  const companies = [...new Set(
    presets.map(p => p.company).filter(Boolean)
  )];

  companyEl.innerHTML = `
    <option value="__all__">Все</option>
    <option value="__none__">Без фирмы</option>
    ${companies.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("")}
  `;
}

function applyFilters() {
  const query = (searchEl?.value || "").toLowerCase().trim();
  const company = companyEl?.value ?? "__all__";

  filteredPresets = presets.filter(p => {
    const matchSearch = !query || String(p.name).toLowerCase().includes(query);

    let matchCompany = true;
    if (company === "__none__") matchCompany = !p.company;
    else if (company !== "__all__") matchCompany = p.company === company;

    return matchSearch && matchCompany;
  });

  filteredPresets.sort((a, b) => {
    if (!!a.is_favorite !== !!b.is_favorite) {
      return a.is_favorite ? -1 : 1;
    }

    return String(a.name).localeCompare(String(b.name), "ru", { sensitivity: "base" });
  });

  renderProducts();
}

function renderProducts() {
  if (!listEl) return;

  if (!filteredPresets.length) {
    listEl.innerHTML = `<div class="preset-empty">(Список пуст)</div>`;
    return;
  }

  listEl.innerHTML = filteredPresets.map((p, i) => {
    const modeText =
      p.calc_mode === "unit"
        ? "Режим: поштучно"
        : "Режим: по весу";

    const baseText =
      p.calc_mode === "unit"
        ? `База: ${p.base_amount} шт`
        : `База: ${p.base_amount} г`;

    const defaultAmount = p.calc_mode === "unit" ? 1 : p.base_amount;

    return renderProductCard(
      {
        name: p.name,
        company: p.company,
        k: p.k,
        b: p.b,
        j: p.j,
        u: p.u,
        modeText,
        baseText,
        extraTitle: p.is_favorite ? "⭐ Избранное" : "Продукт",
        extraText: ""
      },
      {
        actionPanel: `
          <div class="product-card__inline-action">
            <input
              type="text"
              class="product-amount-input"
              placeholder="${p.calc_mode === "unit" ? "1 шт" : "граммы"}"
              value="${defaultAmount}"
              data-amount-idx="${i}"
            />

            <button
              type="button"
              class="product-card__action-btn"
              data-action="add:${i}"
            >
              В лист
            </button>

            <button
              type="button"
              class="product-card__action-btn"
              data-action="stock:${i}"
            >
              В запас
            </button>

            <button
              type="button"
              class="product-card__action-btn"
              data-action="favorite:${i}"
            >
              ${p.is_favorite ? "★ Убрать" : "☆ Избранное"}
            </button>

            <button
              type="button"
              class="product-card__action-btn"
              data-action="delete:${i}"
            >
              Удалить
            </button>
          </div>
        `
      }
    );
  }).join("");
}

async function onProductsClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const [kind, idxText] = btn.dataset.action.split(":");
  const idx = Number(idxText);
  const p = filteredPresets[idx];

  if (!p) return;

  if (kind === "add") {
    const amount = readAmount(idx, p);

    if (!amount || amount <= 0) {
      setHint("Не понял количество.");
      return;
    }

    await addCurrentItemV2ToDB({
      food_v2_id: p.id ?? null,
      name: p.name,
      company: p.company,
      k: p.k,
      b: p.b,
      j: p.j,
      u: p.u,
      calc_mode: p.calc_mode,
      base_amount: p.base_amount,
      base_unit: p.base_unit,
      qty_amount: amount
    });

    window.location.href = "../main/index.html";
    return;
  }

  if (kind === "stock") {
    const amount = readAmount(idx, p);

    if (!amount || amount <= 0) {
      setHint("Не понял количество.");
      return;
    }

    const existing = stocks.find(s =>
      s.name === p.name && s.company === p.company
    );

    if (existing) {
      await addAmountToStockV2(existing.id, amount);
    } else {
      await addStockV2ToDB({
        food_v2_id: p.id ?? null,
        name: p.name,
        company: p.company,
        k: p.k,
        b: p.b,
        j: p.j,
        u: p.u,
        calc_mode: p.calc_mode,
        base_amount: p.base_amount,
        base_unit: p.base_unit,
        stock_amount: amount
      });
    }

    setHint("Добавлено в запас ✅");
    stocks = await loadStocksV2FromDB();
    return;
  }

  if (kind === "favorite") {
    await setFoodFavoriteV2InDB(p.id, !p.is_favorite);

    p.is_favorite = !p.is_favorite;
    const original = presets.find(x => x.id === p.id);
    if (original) original.is_favorite = p.is_favorite;

    applyFilters();
    return;
  }

  if (kind === "delete") {
    const ok = confirm(`Удалить продукт "${p.name}"?`);
    if (!ok) return;

    await deleteFoodV2InDB(p.id);

    presets = presets.filter(x => x.id !== p.id);
    filteredPresets = filteredPresets.filter(x => x.id !== p.id);

    renderCompanyOptions();
    applyFilters();

    setHint("Продукт удалён");
  }
}

function readAmount(idx, product) {
  const input = listEl?.querySelector(`[data-amount-idx="${idx}"]`);
  const raw = String(input?.value ?? "").trim().toLowerCase().replace(",", ".");

  if (!raw) {
    return product.calc_mode === "unit" ? 1 : product.base_amount;
  }

  if (product.calc_mode === "unit") {
    const cleaned = raw.replace("шт", "").replace("x", "").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  const cleaned = raw.replace("г", "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function setHint(t) {
  if (hintEl) hintEl.textContent = t;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[ch]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}