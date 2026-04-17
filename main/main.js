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