import { dom } from "./dom.js";
import { state } from "./state.js";
import { escapeHtml, fmt1, setHint } from "./utils.js";
import { loadPresetsFromDB } from "./db.js";

export async function initPresets() {
  if (!dom.preset) return;
  dom.preset.innerHTML = `<option value="">Загрузка…</option>`;

  try {
    state.presets = await loadPresetsFromDB();

    if (state.presets.length === 0) {
      dom.preset.innerHTML = `<option value="">(Список пуст)</option>`;
      return;
    }

    dom.preset.innerHTML = state.presets
      .map((p, i) => `<option value="${i}">${escapeHtml(p.name)}</option>`)
      .join("");
  } catch (e) {
    console.error(e);
    state.presets = [];
    dom.preset.innerHTML = `<option value="">(Не удалось загрузить список)</option>`;
    setHint("Не смог загрузить список из Supabase (foods). Проверь ключи/RLS.");
  }
}

export function applyPresetToInputs(idx) {
  const p = state.presets[idx];
  if (!p) return null;

  const base = p.per_weight_g || 100;
  const k100 = (p.k * 100) / base;
  const b100 = (p.b * 100) / base;
  const j100 = (p.j * 100) / base;
  const u100 = (p.u * 100) / base;

  dom.macros.k.value = fmt1(k100);
  dom.macros.b.value = fmt1(b100);
  dom.macros.j.value = fmt1(j100);
  dom.macros.u.value = fmt1(u100);
  if (dom.title) dom.title.value = p.name;

  return p;
}

export async function reloadPresets() {
  return initPresets();
}
