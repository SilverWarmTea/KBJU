import {
  loadFoodsV2FromDB,
  addCurrentItemV2ToDB,
  loadStocksV2FromDB,
  addStockV2ToDB,
  addAmountToStockV2
} from "./db.js";

import { renderProductCard } from "./product-card.js";

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
    presets = await loadFoodsV2FromDB();
    stocks = await loadStocksV2FromDB();

    renderCompanyOptions();
    applyFilters();
  } catch (e) {
    console.error(e);
    setHint("Не удалось загрузить продукты.");
  }

  listEl?.addEventListener("click", onProductsClick);
  searchEl?.addEventListener("input", applyFilters);
  companyEl?.addEventListener("change", applyFilters);
}

function renderCompanyOptions() {
  const companies = [...new Set(
    presets.map(p => p.company).filter(Boolean)
  )];

  companyEl.innerHTML = `
    <option value="__all__">Все</option>
    <option value="__none__">Без фирмы</option>
    ${companies.map(c => `<option value="${c}">${c}</option>`).join("")}
  `;
}

function applyFilters() {
  const query = (searchEl?.value || "").toLowerCase().trim();
  const company = companyEl?.value ?? "__all__";

  filteredPresets = presets.filter(p => {
    const matchSearch = !query || p.name.toLowerCase().includes(query);

    let matchCompany = true;
    if (company === "__none__") matchCompany = !p.company;
    else if (company !== "__all__") matchCompany = p.company === company;

    return matchSearch && matchCompany;
  });

  renderProducts();
}

function renderProducts() {
  listEl.innerHTML = filteredPresets.map((p, i) => {

    const modeText =
      p.calc_mode === "unit"
        ? "Режим: поштучно"
        : "Режим: по весу";

    const baseText =
      p.calc_mode === "unit"
        ? `База: ${p.base_amount} шт`
        : `База: ${p.base_amount} г`;

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
        extraTitle: "Продукт",
        extraText: ""
      },
      {
        actions: [
          { label: "В лист", action: `add:${i}` },
          { label: "В запас", action: `stock:${i}` }
        ]
      }
    );
  }).join("");
}

async function onProductsClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const [kind, idxText] = btn.dataset.action.split(":");
  const p = filteredPresets[Number(idxText)];
  if (!p) return;

  // 👉 В ЛИСТ
  if (kind === "add") {
    await addCurrentItemV2ToDB({
      name: p.name,
      company: p.company,
      k: p.k,
      b: p.b,
      j: p.j,
      u: p.u,
      calc_mode: p.calc_mode,
      base_amount: p.base_amount,
      base_unit: p.base_unit,
      qty_amount: p.calc_mode === "unit" ? 1 : p.base_amount
    });

    window.location.href = "./index.html";
  }

  // 👉 В ЗАПАС
  if (kind === "stock") {
    const existing = stocks.find(s =>
      s.name === p.name && s.company === p.company
    );

    const amount = p.calc_mode === "unit" ? 1 : p.base_amount;

    if (existing) {
      await addAmountToStockV2(existing.id, amount);
    } else {
      await addStockV2ToDB({
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
  }
}

function setHint(t) {
  if (hintEl) hintEl.textContent = t;
}