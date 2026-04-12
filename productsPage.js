import { loadPresetsFromDB, saveRowToDB } from "./db.js";

const listEl = document.getElementById("productsList");
const hintEl = document.getElementById("hint");
const searchEl = document.getElementById("productsSearch");
const companyEl = document.getElementById("productsCompany");

let presets = [];
let filteredPresets = [];

init();

async function init() {
  try {
    presets = await loadPresetsFromDB();
    renderCompanyOptions();
    applyFilters();
  } catch (e) {
    console.error(e);
    setHint("Не удалось загрузить продукты.");
  }

  listEl?.addEventListener("click", onProductsClick);
  searchEl?.addEventListener("input", applyFilters);
  searchEl?.addEventListener("keydown", onSearchKeydown);
  companyEl?.addEventListener("change", applyFilters);
}

function onSearchKeydown(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    applyFilters();
  }
}

function renderCompanyOptions() {
  if (!companyEl) return;

  const uniqueCompanies = [...new Set(
    presets
      .map(p => p.company)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "ru", { sensitivity: "base" }))
  )];

  companyEl.innerHTML = `
    <option value="__all__">Все</option>
    <option value="__none__">Без фирмы</option>
    ${uniqueCompanies.map(c => `<option value="${escapeHtmlAttr(c)}">${escapeHtml(c)}</option>`).join("")}
  `;
}

function applyFilters() {
  const query = normalizeText(searchEl?.value ?? "");
  const companyValue = companyEl?.value ?? "__all__";

  filteredPresets = presets.filter((p) => {
    const matchesSearch = !query || normalizeText(p.name).includes(query);

    let matchesCompany = true;
    if (companyValue === "__none__") {
      matchesCompany = !p.company;
    } else if (companyValue !== "__all__") {
      matchesCompany = p.company === companyValue;
    }

    return matchesSearch && matchesCompany;
  });

  renderProducts();
}

function renderProducts() {
  if (!listEl) return;

  if (!filteredPresets.length) {
    listEl.innerHTML = `<div class="preset-empty">Ничего не найдено.</div>`;
    return;
  }

  listEl.innerHTML = filteredPresets
    .map((p, i) => {
      const weight = `Вес по умолчанию: ${Number(p.per_weight_g) || 100} г`;
      const company = p.company ? `Фирма: ${escapeHtml(p.company)}` : `Без фирмы`;

      return `
        <button class="product-item" type="button" data-product-item="${i}">
          <div class="product-item-top">
            <span class="product-item-name">${escapeHtml(p.name)}</span>
            <span class="product-item-sub">${weight}</span>
          </div>

          <div class="product-item-company">${company}</div>

          <div class="product-macro-grid">
            <div class="product-macro-pill product-k">
              <span class="product-macro-left">🔥 Калории</span>
              <span class="product-macro-val">${fmt1(p.k)}</span>
            </div>
            <div class="product-macro-pill product-b">
              <span class="product-macro-left">💪 Белки</span>
              <span class="product-macro-val">${fmt1(p.b)}</span>
            </div>
            <div class="product-macro-pill product-j">
              <span class="product-macro-left">🥑 Жиры</span>
              <span class="product-macro-val">${fmt1(p.j)}</span>
            </div>
            <div class="product-macro-pill product-u">
              <span class="product-macro-left">🌾 Углеводы</span>
              <span class="product-macro-val">${fmt1(p.u)}</span>
            </div>
          </div>
        </button>
      `;
    })
    .join("");
}

async function onProductsClick(e) {
  const item = e.target instanceof Element ? e.target.closest("[data-product-item]") : null;
  if (!item) return;

  const idx = parseInt(item.getAttribute("data-product-item"), 10);
  if (!Number.isFinite(idx) || !filteredPresets[idx]) return;

  const p = filteredPresets[idx];

  try {
    await saveRowToDB(
      { k: p.k, b: p.b, j: p.j, u: p.u },
      Number(p.per_weight_g) || 100,
      false,
      p.name,
      p.company ?? null
    );

    window.location.href = "./index.html";
  } catch (err) {
    console.error(err);
    setHint("Не удалось добавить продукт.");
  }
}

function setHint(text) {
  if (hintEl) hintEl.textContent = text || "";
}

function normalizeText(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
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

function escapeHtmlAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}