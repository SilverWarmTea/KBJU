import { round1, setHint } from "./utils.js";
import { state } from "./state.js";
import { apiGetFoods, apiAddFood, apiGetCurrentItems, apiAddCurrentItem, apiClearCurrentItems } from "./apiClient.js";


/**
 * current_items — пока оставляем напрямую через sb (PostgREST)
 * foods — переводим на Edge Function (apiClient.js), чтобы мобила не отваливалась
 */

export async function loadRowsFromDB() {
  try {
    const data = await apiGetCurrentItems();

    state.rows = (data ?? []).map(r => {
      const perPortion = r.per_weight_g === 1 && r.qty_g === 1;
      const factor = r.qty_g / r.per_weight_g;

      return {
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

export async function saveRowToDB(macros, weight, perPortion, label) {
  const qty = perPortion ? 1 : weight;
  const perWeight = perPortion ? 1 : 100;

  const nextPos = (state.rows?.length ?? 0) + 1;

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

    return (data ?? []).map(x => ({
      id: x.id,
      name: String(x.name ?? "").trim(),
      k: Number(x.k),
      b: Number(x.b),
      j: Number(x.j),
      u: Number(x.u),
      per_weight_g: Number(x.per_weight_g) || 100,
      weight: 100,
    })).filter(p => p.name);

  } catch (e) {
    console.error(e);
    setHint("Ошибка загрузки foods (API)");
    return [];
  }
}

export async function saveFoodIfNotExists(food, existingPresets = []) {
  // food: { name, k, b, j, u, per_weight_g }

  const eps = 0.05; // допуск на округление

  const same = existingPresets.some(p =>
    Number(p.per_weight_g || 100) === Number(food.per_weight_g || 100) &&
    Math.abs(Number(p.k) - Number(food.k)) < eps &&
    Math.abs(Number(p.b) - Number(food.b)) < eps &&
    Math.abs(Number(p.j) - Number(food.j)) < eps &&
    Math.abs(Number(p.u) - Number(food.u)) < eps
  );

  if (same) return { ok: false, reason: "exists" };

  // Вставка через Edge Function (стабильнее на мобиле)
  await apiAddFood({
    name: food.name,
    k: food.k,
    b: food.b,
    j: food.j,
    u: food.u,
    per_weight_g: food.per_weight_g,
  });

  return { ok: true };
}
