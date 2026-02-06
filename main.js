import { dom } from "./dom.js";
import { render } from "./render.js";
import { copyTotalsToClipboard } from "./clipboard.js";
import { initPresets } from "./presets.js";
import { loadRowsFromDB } from "./db.js";
import { setHint } from "./utils.js";
import { syncWeightDisabled, onAdd, onClear, onChoosePreset, onListClick } from "./handlers.js";

init();

async function init() {
  dom.copyTotals?.addEventListener("click", copyTotalsToClipboard);

  dom.perPortion?.addEventListener("change", syncWeightDisabled);
  syncWeightDisabled();

  dom.add?.addEventListener("click", onAdd);
  dom.clear?.addEventListener("click", onClear);

  if (dom.preset) {
    await initPresets();
    dom.choose?.addEventListener("click", onChoosePreset);
  }

  dom.list?.addEventListener("click", onListClick);

  try {
    await loadRowsFromDB();
  } catch (e) {
    console.error(e);
    setHint("Ошибка загрузки из БД");
  }

  render();
}
