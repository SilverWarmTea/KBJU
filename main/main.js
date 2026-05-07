import { setHint } from "../shared/utils.js";
import { state } from "../shared/state.js";

window.addEventListener("error", (e) => {
  setHint("JS error: " + (e.message || "unknown"));
});

window.addEventListener("unhandledrejection", (e) => {
  setHint("Promise error: " + (e.reason?.message || e.reason || "unknown"));
});

import { dom } from "../shared/dom.js";
import { render } from "./render.js";
import { openCopyModal, initCopyModalEvents } from "./clipboard.js";
import {
  loadCurrentItemsV2FromDB,
  extractCompanies,
  loadFoodsV2FromDB
} from "../shared/db.js";
import {
  syncWeightDisabled,
  onAdd,
  onClear,
  onListClick,
  onQuickInputCommit,
  setEditorMode
} from "./handlers.js";

init();

async function init() {
  dom.copyTotals?.addEventListener("click", openCopyModal);
  initCopyModalEvents();

  dom.perPortion?.addEventListener("change", syncWeightDisabled);
  syncWeightDisabled();

  dom.modeWeight?.addEventListener("click", () => setEditorMode("weight"));
  dom.modeUnit?.addEventListener("click", () => setEditorMode("unit"));

  dom.quickInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onQuickInputCommit();
    }
  });

  dom.quickInput?.addEventListener("blur", onQuickInputCommit);

  state.presets = await loadFoodsV2FromDB();

  const companies = extractCompanies(state.presets);

  dom.companyList.innerHTML = companies
    .map(c => `<option value="${c}">`)
    .join("");

  initTitleAutocomplete();

  dom.add?.addEventListener("click", onAdd);
  dom.clear?.addEventListener("click", onClear);
  dom.list?.addEventListener("click", onListClick);

  try {
    state.rows = await loadCurrentItemsV2FromDB();
  } catch (e) {
    console.error(e);
    setHint("Ошибка загрузки из БД");
  }

  render();
}

function initTitleAutocomplete() {
  if (!dom.title) return;

  const box = document.createElement("div");
  box.className = "title-autocomplete hidden";
  dom.title.parentElement.appendChild(box);

  dom.title.addEventListener("input", () => {
    const q = String(dom.title.value || "").toLowerCase().trim();

    if (q.length < 2) {
      hideAutocomplete(box);
      return;
    }

    const matches = state.presets
      .filter(p =>
        String(p.name || "").toLowerCase().includes(q) ||
        String(p.company || "").toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (!!a.is_favorite !== !!b.is_favorite) {
          return a.is_favorite ? -1 : 1;
        }

        return String(a.name).localeCompare(String(b.name), "ru", {
          sensitivity: "base"
        });
      })
      .slice(0, 8);

    if (!matches.length) {
      hideAutocomplete(box);
      return;
    }

    box.innerHTML = matches.map((p, i) => `
      <button
        type="button"
        class="title-autocomplete-item"
        data-preset-idx="${i}"
      >
        <span class="tai-name">${p.is_favorite ? "⭐ " : ""}${escapeHtml(p.name)}</span>
        <span class="tai-meta">
          ${p.company ? escapeHtml(p.company) + " · " : ""}
          ${p.calc_mode === "unit" ? "1 шт" : `${p.base_amount || 100} г`}
          · К ${p.k} Б ${p.b} Ж ${p.j} У ${p.u}
        </span>
      </button>
    `).join("");

    box._matches = matches;
    box.classList.remove("hidden");
  });

  box.addEventListener("mousedown", (e) => {
    e.preventDefault();

    const btn = e.target.closest("[data-preset-idx]");
    if (!btn) return;

    const idx = Number(btn.dataset.presetIdx);
    const product = box._matches?.[idx];

    if (!product) return;

    applyProductToEditor(product);
    hideAutocomplete(box);
  });

  document.addEventListener("click", (e) => {
    if (e.target === dom.title || box.contains(e.target)) return;
    hideAutocomplete(box);
  });
}

function applyProductToEditor(p) {
  dom.title.value = p.name || "";
  dom.company.value = p.company || "";

  dom.macros.k.value = p.k ?? "";
  dom.macros.b.value = p.b ?? "";
  dom.macros.j.value = p.j ?? "";
  dom.macros.u.value = p.u ?? "";

  if (p.calc_mode === "unit") {
    setEditorMode("unit");
    dom.weight.value = "1";
  } else {
    setEditorMode("weight");
    dom.weight.value = String(p.base_amount || 100);
  }
}

function hideAutocomplete(box) {
  box.classList.add("hidden");
  box.innerHTML = "";
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