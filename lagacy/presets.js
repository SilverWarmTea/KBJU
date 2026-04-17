import { dom } from "../shared/dom.js";
import { state } from "../shared/state.js";
import { escapeHtml, fmt1, setHint } from "../shared/utils.js";
import { loadPresetsFromDB } from "../shared/db.js";

function renderPresetSelect() {
  if (!dom.preset) return;

  if (state.presets.length === 0) {
    dom.preset.innerHTML = `<option value="">(Список пуст)</option>`;
    return;
  }

  dom.preset.innerHTML = state.presets
    .map((p, i) => `<option value="${i}">${escapeHtml(p.name)}</option>`)
    .join("");

  if (state.selectedPresetId) {
    const idx = state.presets.findIndex((p) => p.id === state.selectedPresetId);
    if (idx >= 0) dom.preset.value = String(idx);
  }
}

function renderPresetSidebar() {
  if (!dom.presetList) return;

  if (state.presets.length === 0) {
    dom.presetList.innerHTML = `<div class="preset-empty">(Список пуст)</div>`;
    return;
  }

  dom.presetList.innerHTML = state.presets
    .map((p, i) => {
      const active = p.id === state.selectedPresetId ? " is-active" : "";
      const meta = `${fmt1(p.k)} / ${fmt1(p.b)} / ${fmt1(p.j)} / ${fmt1(p.u)}`;
      return `
        <button class="preset-item${active}" type="button" data-preset-item="${i}">
          <span class="preset-item-name">${escapeHtml(p.name)}</span>
          <span class="preset-item-meta">${meta}</span>
        </button>
      `;
    })
    .join("");
}

export async function initPresets() {
  if (!dom.preset) return;
  dom.preset.innerHTML = `<option value="">Загрузка…</option>`;
  if (dom.presetList) dom.presetList.innerHTML = `<div class="preset-empty">Загрузка…</div>`;

  try {
    state.presets = await loadPresetsFromDB();
    renderPresetSelect();
    renderPresetSidebar();
  } catch (e) {
    console.error(e);
    state.presets = [];
    dom.preset.innerHTML = `<option value="">(Не удалось загрузить список)</option>`;
    if (dom.presetList) dom.presetList.innerHTML = `<div class="preset-empty">(Не удалось загрузить)</div>`;
    setHint("Не смог загрузить список из Supabase (foods). Проверь ключи/RLS.");
  }
}

export function applyPresetToInputs(idx) {
  const p = state.presets[idx];
  if (!p) return null;

  dom.macros.k.value = fmt1(p.k);
  dom.macros.b.value = fmt1(p.b);
  dom.macros.j.value = fmt1(p.j);
  dom.macros.u.value = fmt1(p.u);
  if (dom.title) dom.title.value = p.name;
  if (dom.weight) dom.weight.value = String(Number(p.per_weight_g) || 100);
  if (dom.preset) dom.preset.value = String(idx);

  state.selectedPresetId = p.id;
  renderPresetSidebar();

  return p;
}

export async function reloadPresets() {
  return initPresets();
}
