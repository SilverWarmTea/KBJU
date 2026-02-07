import { dom } from "./dom.js";
import { state } from "./state.js";
import { setHint, setHintTemp, round1 } from "./utils.js";
import { readMacros, readWeight } from "./validation.js";
import { addRow } from "./rows.js";
import { render } from "./render.js";
import { clearRowsInDB, loadRowsFromDB, saveFoodIfNotExists } from "./db.js";
import { applyPresetToInputs, reloadPresets } from "./presets.js";
import { deleteRowInDB } from "./db.js";


export function syncWeightDisabled() {
  const per = !!dom.perPortion?.checked;
  if (!dom.weight) return;

  dom.weight.disabled = per;
  if (per) dom.weight.value = "";
}

export function onAdd() {
  setHint("");

  const perPortion = !!dom.perPortion?.checked;
  const label = (dom.title?.value || "").trim();

  const macros = readMacros();
  if (!macros) return;

  const weight = perPortion ? null : readWeight();
  if (!perPortion && weight == null) return;

  addRow({ macros, weight, label, perPortion });
  render();
  clearInputs();
  setHintTemp(`Добавлено: ${label || "без названия"}`);

}

function clearInputs() {
  if (dom.title) dom.title.value = "";
  if (dom.weight) dom.weight.value = "";

  dom.macros.k.value = "";
  dom.macros.b.value = "";
  dom.macros.j.value = "";
  dom.macros.u.value = "";

  if (dom.perPortion) dom.perPortion.checked = false;
  syncWeightDisabled();
}

export async function onClear() {
  state.rows = [];
  await clearRowsInDB();
  render();
  setHint("Очищено.");
}

export function onChoosePreset() {
  setHint("");

  const idx = parseInt(dom.preset?.value ?? "", 10);
  if (!Number.isFinite(idx)) {
    setHint("Выберите продукт из списка.");
    return;
  }

  const p = applyPresetToInputs(idx);
  if (!p) {
    setHint("Выберите продукт из списка.");
    return;
  }

  const perPortion = !!dom.perPortion?.checked;

  if (perPortion) {
    addRow({ macros: { k: p.k, b: p.b, j: p.j, u: p.u }, weight: null, label: p.name, perPortion: true });
  } else {
    const w = Number(p.per_weight_g) || 100;
    if (dom.weight) dom.weight.value = String(w);
    addRow({ macros: { k: p.k, b: p.b, j: p.j, u: p.u }, weight: w, label: p.name, perPortion: false });
  }

  render();
  clearInputs();
  setHintTemp(`Добавлено: ${p.name}`);

}

async function onSaveAsFood(idx) {
  const r = state.rows[idx];
  if (!r) return;

  const name = String(r.label || "").trim();
  if (!name) {
    setHintTemp("Нет названия — не сохраняю 😅");
    return;
  }

  let per_weight_g = 100;
  let k = 0, b = 0, j = 0, u = 0;

  if (r.weight === "—") {
    // порция
    per_weight_g = 100;
    k = Number(r.k);
    b = Number(r.b);
    j = Number(r.j);
    u = Number(r.u);
  } else {
    // пересчёт обратно на 100г
    const w = Number(r.weight);
    
    if (!Number.isFinite(w) || w <= 0) {
      setHintTemp("Странный вес — не сохраняю 😕");
      return;
    }
    per_weight_g = w;

    k = round1((Number(r.k) * 100) / w);
    b = round1((Number(r.b) * 100) / w);
    j = round1((Number(r.j) * 100) / w);
    u = round1((Number(r.u) * 100) / w);
  }

  try {
    const res = await saveFoodIfNotExists(
      { name, k, b, j, u, per_weight_g },
      state.presets
    );

    if (!res.ok) {
      setHintTemp("Похожий продукт уже есть — не сохранял ✅");
      return;
    }

    await reloadPresets();
    setHintTemp("Сохранено в продукты 💾");
  } catch (e) {
    console.error(e);
    setHintTemp("Не удалось сохранить 😕");
  }
}

export async function onListClick(e) {
  const t = e.target;
  if (!(t instanceof Element)) return;

  const save = t.closest("[data-save]");
  const del = t.closest("[data-del]");
  const rep = t.closest("[data-repeat]");

  if (save) {
    const i = parseInt(save.getAttribute("data-save"), 10);
    if (!Number.isFinite(i) || !state.rows[i]) return;
    onSaveAsFood(i);
    return;
  }

  if (del) {
    const i = parseInt(del.getAttribute("data-del"), 10);
    if (!Number.isFinite(i) || !state.rows[i]) return;

    const row = state.rows[i];
    const id = row?.id; // ✅ теперь он будет (после правки loadRowsFromDB)

    if (!id) {
      // Фолбэк: чтобы интерфейс не ломался, можно удалить визуально
      // но лучше подсказать, что id нет
      setHintTemp("Не могу удалить из базы: у строки нет id 😬");
      state.rows.splice(i, 1);
      render();
      return;
    }

    try {
      await deleteRowInDB(id);   // ✅ удаляем в БД
      state.rows.splice(i, 1);   // ✅ удаляем в UI
      render();
    } catch (err) {
      console.error(err);
      setHintTemp("Не удалось удалить из базы 😕");
    }
    return;
  }

  if (rep) {
    const i = parseInt(rep.getAttribute("data-repeat"), 10);
    if (!Number.isFinite(i) || !state.rows[i]) return;

    state.rows.push({ ...state.rows[i] });
    render();
  }
}

