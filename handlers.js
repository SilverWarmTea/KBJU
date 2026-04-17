import { state } from "./state.js";
import { render } from "./render.js";
import { safeNum, setHint, setHintTemp , round1} from "./utils.js";
import {
  clearCurrentItemsV2InDB,
  addFoodV2ToDB,
  deleteCurrentItemV2InDB,
  addCurrentItemV2ToDB
} from "./db.js";
import { dom } from "./dom.js";

function parseWeight(value) {
  const n = Number(String(value ?? "").replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseMacrosString(text) {
  const normalized = String(text)
    .replace(/\|/g, " ")
    .replace(/,/g, ".")
    .replace(/\s+/g, " ")
    .trim();

  const read = (letter) => {
    const re = new RegExp(`(?:^|\\s)${letter}\\s*:??\\s*([0-9]+(?:\\.[0-9]+)?)`, "i");
    const m = normalized.match(re);
    return m ? Number(m[1]) : null;
  };

  const k = read("К");
  const b = read("Б");
  const j = read("Ж");
  const u = read("У");

  const hasWeight = /(?:^|\s)(В|Вес|Масса)\s*:??/i.test(normalized);
  const weight = hasWeight ? read("В") : null;

  if ([k, b, j, u].some(v => v == null || !Number.isFinite(v))) {
    return null;
  }

  return { k, b, j, u, weight };
}

export function setEditorMode(mode) {
  state.editorMode = mode === "unit" ? "unit" : "weight";

  if (dom.modeWeight) {
    dom.modeWeight.classList.toggle("is-active", state.editorMode === "weight");
  }

  if (dom.modeUnit) {
    dom.modeUnit.classList.toggle("is-active", state.editorMode === "unit");
  }

  if (dom.weight) {
    dom.weight.placeholder =
      state.editorMode === "unit"
        ? "Количество (шт)"
        : "Количество (г)";
  }
}

export function syncWeightDisabled() {
  if (!dom.weight) return;

  dom.weight.placeholder =
    state.editorMode === "unit"
      ? "Количество (шт)"
      : "Количество (г)";
}

export async function onAdd() {
  const label = String(dom.title?.value ?? "").trim();
  const company = String(dom.company?.value ?? "").trim() || null;

  const calcMode = state.editorMode === "unit" ? "unit" : "weight";
  const qtyAmount = parseWeight(dom.weight?.value);

  const macros = {
    k: safeNum(dom.macros.k?.value),
    b: safeNum(dom.macros.b?.value),
    j: safeNum(dom.macros.j?.value),
    u: safeNum(dom.macros.u?.value),
  };

  if (!macros.k && !macros.b && !macros.j && !macros.u) {
    setHint("Заполни КБЖУ");
    return;
  }

  if (qtyAmount == null) {
    setHint(calcMode === "unit" ? "Укажи количество штук" : "Укажи вес");
    return;
  }

  const baseAmount = calcMode === "unit" ? 1 : 100;
  const baseUnit = calcMode === "unit" ? "piece" : "g";

  const ratio = qtyAmount / baseAmount;

  try {
    const saved = await addCurrentItemV2ToDB({
      name: label || "Без названия",
      company,
      k: macros.k,
      b: macros.b,
      j: macros.j,
      u: macros.u,
      calc_mode: calcMode,
      base_amount: baseAmount,
      base_unit: baseUnit,
      qty_amount: qtyAmount
    });

    state.rows.push({
      id: saved.id,
      label: label || "Без названия",
      company,
      weight: calcMode === "unit" ? "—" : qtyAmount,
      k: round1(macros.k * ratio),
      b: round1(macros.b * ratio),
      j: round1(macros.j * ratio),
      u: round1(macros.u * ratio)
    });

    render();
    setHintTemp("Добавлено ✅");
  } catch (e) {
    console.error("ADD ERROR:", e);
    setHintTemp(`Не удалось сохранить: ${e?.message || e}`);
  }
}

export async function onClear() {
  state.rows = [];
  render();

  try {
    await clearCurrentItemsV2InDB();
    setHint("Очищено");
  } catch (e) {
    console.error(e);
    setHintTemp("Ошибка очистки");
  }
}

export async function onListClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const [kind, idxText] = btn.dataset.action.split(":");
  const i = Number(idxText);

  if (!Number.isFinite(i) || !state.rows[i]) return;
  const row = state.rows[i];

  if (kind === "delete") {
    state.rows.splice(i, 1);
    render();

    try {
      await deleteCurrentItemV2InDB(row.id);
    } catch (e) {
      console.error(e);
      setHintTemp("Ошибка удаления");
    }
    return;
  }

  if (kind === "repeat") {
    try {
      const saved = await addCurrentItemV2ToDB({
        name: row.label || "Без названия",
        company: row.company ?? null,
        k: row.k,
        b: row.b,
        j: row.j,
        u: row.u,
        calc_mode: row.weight === "—" ? "unit" : "weight",
        base_amount: row.weight === "—" ? 1 : 100,
        base_unit: row.weight === "—" ? "piece" : "g",
        qty_amount: row.weight === "—" ? 1 : row.weight
      });

      state.rows.push({
        ...row,
        id: saved.id
      });

      render();
    } catch (e) {
      console.error(e);
      setHintTemp("Повтор не сохранился");
    }
    return;
  }

  if (kind === "save") {
    try {
      await addFoodV2ToDB({
        name: row.label || "Без названия",
        company: row.company ?? null,
        k: row.k,
        b: row.b,
        j: row.j,
        u: row.u,
        calc_mode: row.weight === "—" ? "unit" : "weight",
        base_amount: row.weight === "—" ? 1 : 100,
        base_unit: row.weight === "—" ? "piece" : "g"
      });

      setHint("Сохранено в продукты ✅");
    } catch (e) {
      console.error(e);
      setHintTemp("Ошибка сохранения");
    }
  }
}

export function onQuickInputCommit() {
  const raw = String(dom.quickInput?.value ?? "").trim();
  if (!raw) return;

  const parsed = parseMacrosString(raw);
  if (!parsed) {
    setHint("Не понял строку");
    return;
  }

  dom.macros.k.value = parsed.k ?? "";
  dom.macros.b.value = parsed.b ?? "";
  dom.macros.j.value = parsed.j ?? "";
  dom.macros.u.value = parsed.u ?? "";

  if (parsed.weight != null) {
    dom.weight.value = parsed.weight;
  }
}