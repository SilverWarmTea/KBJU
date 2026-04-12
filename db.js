import { round1, setHint } from "./utils.js";
import { state } from "./state.js";
import {
  apiGetFoods,
  apiAddFood,
  apiGetCurrentItems,
  apiAddCurrentItem,
  apiClearCurrentItems,
  apiDeleteCurrentItem
} from "./apiClient.js";

/**
 * current_items — текущий список результатов
 * foods — список сохранённых продуктов
 */

export async function deleteRowInDB(id) {
  await apiDeleteCurrentItem(id);
}

export async function loadRowsFromDB() {
  try {
    const data = await apiGetCurrentItems();

    state.rows = (data ?? []).map(r => {
      const perPortion = r.per_weight_g === 1 && r.qty_g === 1;
      const factor = r.qty_g / r.per_weight_g;

      return {
        id: r.id,
        label: r.custom_name ?? "",
        perPortion,
        weight: perPortion ? "—" : r.qty_g,
        k: round1(r.k * factor),
        b: round1(r.b * factor),
        j: round1(r.j * factor),
        u: round1(r.u * factor),
      };
    });
  } catch (e) {
    console.error(e);
    setHint("Ошибка загрузки current_items (API)");
  }
}

export async function clearRowsInDB() {
  await apiClearCurrentItems();
}

export async function saveRowToDB(macros, weight, perPortion, label, company) {
  const qty = perPortion ? 100 : weight;
  const perWeight = 100;

  
  let nextPos = 1;

  try {
    const existing = await apiGetCurrentItems();
    const maxPos = (existing ?? []).reduce((acc, item) => {
      const p = Number(item.position) || 0;
      return Math.max(acc, p);
    }, 0);

    nextPos = maxPos + 1;
  } catch (e) {
    console.error(e);
  }

  await apiAddCurrentItem({
    food_id: null,
    custom_name: label,
    k: macros.k,
    b: macros.b,
    j: macros.j,
    u: macros.u,
    per_weight_g: perWeight,
    qty_g: qty,
    position: nextPos,
  });
}

export async function loadPresetsFromDB() {
  try {
    const data = await apiGetFoods();

    return (data ?? [])
  .map(x => ({
    id: x.id,
    name: String(x.name ?? "").trim(),
    company: normalizeCompany(x.company),
    k: Number(x.k),
    b: Number(x.b),
    j: Number(x.j),
    u: Number(x.u),
    per_weight_g: Number(x.per_weight_g) || 100,
    weight: Number(x.per_weight_g) || 100,
  }))
  .filter(p => p.name)
  .sort((a, b) =>
    a.name.localeCompare(b.name, "ru", { sensitivity: "base" })
  );

  } catch (e) {
    console.error(e);
    setHint("Ошибка загрузки foods (API)");
    return [];
  }
}

function normalizeCompany(value) {
  const raw = String(value ?? "").trim();

  if (!raw || raw === "0") return null;
  return raw;
}

export async function saveFoodIfNotExists(food, existingPresets = []) {
  const eps = 0.05;

  const same = existingPresets.some(p =>
    Number(p.per_weight_g || 100) === Number(food.per_weight_g || 100) &&
    Math.abs(Number(p.k) - Number(food.k)) < eps &&
    Math.abs(Number(p.b) - Number(food.b)) < eps &&
    Math.abs(Number(p.j) - Number(food.j)) < eps &&
    Math.abs(Number(p.u) - Number(food.u)) < eps
  );

  if (same) return { ok: false, reason: "exists" };

  await apiAddFood({
    name: food.name,
  company: food.company ?? null,
  k: food.k,
  b: food.b,
  j: food.j,
  u: food.u,
  per_weight_g: food.per_weight_g,
  });

  return { ok: true };
}

export function extractCompanies(presets) {
  return [...new Set(
    presets
      .map(p => p.company)
      .filter(Boolean)
  )].sort((a, b) =>
    a.localeCompare(b, "ru", { sensitivity: "base" })
  );
}