import { setHint } from "./utils.js";
import { state } from "./state.js";

window.addEventListener("error", (e) => {
  setHint("JS error: " + (e.message || "unknown"));
});

window.addEventListener("unhandledrejection", (e) => {
  setHint("Promise error: " + (e.reason?.message || e.reason || "unknown"));
});

import { dom } from "./dom.js";
import { render } from "./render.js";
import { copyTotalsToClipboard } from "./clipboard.js";
import { loadRowsFromDB } from "./db.js";
import { syncWeightDisabled, onAdd, onClear, onListClick } from "./handlers.js";
import { extractCompanies } from "./db.js";
import { loadPresetsFromDB } from "./db.js";

init();

async function init() {
  dom.copyTotals?.addEventListener("click", copyTotalsToClipboard);

  dom.perPortion?.addEventListener("change", syncWeightDisabled);
  syncWeightDisabled();

  state.presets = await loadPresetsFromDB();

  const companies = extractCompanies(state.presets);

  dom.companyList.innerHTML = companies
  .map(c => `<option value="${c}">`)
  .join("");

  dom.add?.addEventListener("click", onAdd);
  dom.clear?.addEventListener("click", onClear);
  dom.list?.addEventListener("click", onListClick);

  try {
    await loadRowsFromDB();
  } catch (e) {
    console.error(e);
    setHint("Ошибка загрузки из БД");
  }

  render();
}