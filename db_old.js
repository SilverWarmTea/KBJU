import { sb } from "./supabaseClient.js";
import { round1, setHint } from "./utils.js";
import { state } from "./state.js";

export async function loadRowsFromDB() {
  const { data, error } = await sb
    .from("current_items")
    .select("*")
    .order("position", { ascending: true });

  if (error) {
    console.error(error);
    setHint("Ошибка загрузки из БД");
    return;
  }

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
}

export async function clearRowsInDB() {
  await sb
    .from("current_items")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
}

export async function saveRowToDB(macros, weight, perPortion, label) {
  const qty = perPortion ? 1 : weight;
  const perWeight = perPortion ? 1 : 100;

  const { data: last } = await sb
    .from("current_items")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);

  const nextPos = (last?.[0]?.position ?? 0) + 1;

  await sb.from("current_items").insert([{
    food_id: null,
    custom_name: label,
    k: macros.k,
    b: macros.b,
    j: macros.j,
    u: macros.u,
    per_weight_g: perWeight,
    qty_g: qty,
    position: nextPos
  }]);
}

export async function loadPresetsFromDB() {
  const { data, error } = await sb
    .from("foods")
    .select("id,name,k,b,j,u,per_weight_g")
    .order("name", { ascending: true });

  if (error) throw error;

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

  const { error } = await sb.from("foods").insert([{
    name: food.name,
    k: food.k,
    b: food.b,
    j: food.j,
    u: food.u,
    per_weight_g: food.per_weight_g,
  }]);

  if (error) throw error;
  return { ok: true };
}
