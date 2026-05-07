import { sb } from "../supabaseClient.js";
import { round1, setHint } from "./utils.js";

/* =========================
   helpers
========================= */

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCompany(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "0") return null;
  return raw;
}

function normalizeFood(x) {
  return {
    id: x.id,
    name: String(x.name ?? "").trim(),
    company: normalizeCompany(x.company),
    k: safeNum(x.k),
    b: safeNum(x.b),
    j: safeNum(x.j),
    u: safeNum(x.u),
    calc_mode: String(x.calc_mode ?? "weight"),
    base_amount: safeNum(x.base_amount || 100),
    base_unit: String(x.base_unit ?? "g"),
  };
}

function normalizeStock(x) {
  return {
    id: x.id,
    food_v2_id: x.food_v2_id ?? null,
    name: String(x.name ?? "").trim(),
    company: normalizeCompany(x.company),
    k: safeNum(x.k),
    b: safeNum(x.b),
    j: safeNum(x.j),
    u: safeNum(x.u),
    calc_mode: String(x.calc_mode ?? "weight"),
    base_amount: safeNum(x.base_amount || 100),
    base_unit: String(x.base_unit ?? "g"),
    stock_amount: safeNum(x.stock_amount),
  };
}

function normalizeCurrentItem(x) {
  const ratio = safeNum(x.qty_amount) / safeNum(x.base_amount || 1);

  return {
    id: x.id,
    food_v2_id: x.food_v2_id ?? null,
    label: String(x.name ?? "").trim(),
    company: normalizeCompany(x.company),
    calc_mode: String(x.calc_mode ?? "weight"),
    base_amount: safeNum(x.base_amount || 100),
    base_unit: String(x.base_unit ?? "g"),
    qty_amount: safeNum(x.qty_amount),
    k: round1(safeNum(x.k) * ratio),
    b: round1(safeNum(x.b) * ratio),
    j: round1(safeNum(x.j) * ratio),
    u: round1(safeNum(x.u) * ratio),
    weight:
      String(x.calc_mode ?? "weight") === "weight"
        ? safeNum(x.qty_amount)
        : "—",
  };
}

/* =========================
   foods_v2
========================= */

export async function loadFoodsV2FromDB() {
  try {
    const { data, error } = await sb
      .from("foods_v2")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    return (data ?? [])
      .map(normalizeFood)
      .filter((x) => x.name);
  } catch (e) {
    console.error(e);
    setHint("Ошибка загрузки foods_v2");
    return [];
  }
}

export async function addFoodV2ToDB(food) {
  const { data, error } = await sb
    .from("foods_v2")
    .insert({
      name: food.name,
      company: food.company ?? null,
      k: safeNum(food.k),
      b: safeNum(food.b),
      j: safeNum(food.j),
      u: safeNum(food.u),
      calc_mode: food.calc_mode ?? "weight",
      base_amount: safeNum(food.base_amount ?? 100),
      base_unit: food.base_unit ?? "g",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/* =========================
   stocks_v2
========================= */

export async function loadStocksV2FromDB() {
  try {
    const { data, error } = await sb
      .from("stocks_v2")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    return (data ?? [])
      .map(normalizeStock)
      .filter((x) => x.name);
  } catch (e) {
    console.error(e);
    setHint("Ошибка загрузки stocks_v2");
    return [];
  }
}

export async function addStockV2ToDB(stock) {
  const { data, error } = await sb
    .from("stocks_v2")
    .insert({
      food_v2_id: stock.food_v2_id ?? null,
      name: stock.name,
      company: stock.company ?? null,
      k: safeNum(stock.k),
      b: safeNum(stock.b),
      j: safeNum(stock.j),
      u: safeNum(stock.u),
      calc_mode: stock.calc_mode ?? "weight",
      base_amount: safeNum(stock.base_amount ?? 100),
      base_unit: stock.base_unit ?? "g",
      stock_amount: safeNum(stock.stock_amount ?? 0),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addAmountToStockV2(id, amount) {
  const { error } = await sb.rpc("add_amount_to_stock_v2", {
    p_id: id,
    p_amount: safeNum(amount),
  });

  if (error) throw error;
}

export async function consumeStockV2InDB(stock, amount) {
  const amountNum = safeNum(amount);

  const { error } = await sb.rpc("consume_stock_v2", {
    p_id: stock.id,
    p_amount: amountNum,
  });

  if (error) throw error;

  await addCurrentItemV2ToDB({
    food_v2_id: stock.food_v2_id ?? null,
    name: stock.name,
    company: stock.company ?? null,
    k: stock.k,
    b: stock.b,
    j: stock.j,
    u: stock.u,
    calc_mode: stock.calc_mode,
    base_amount: stock.base_amount,
    base_unit: stock.base_unit,
    qty_amount: amountNum,
  });
}

/* =========================
   current_items_v2
========================= */

export async function loadCurrentItemsV2FromDB() {
  try {
    const { data, error } = await sb
      .from("current_items_v2")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    return (data ?? []).map(normalizeCurrentItem);
  } catch (e) {
    console.error(e);
    setHint("Ошибка загрузки current_items_v2");
    return [];
  }
}

export async function addCurrentItemV2ToDB(item) {
  const { data, error } = await sb
    .from("current_items_v2")
    .insert({
      food_v2_id: item.food_v2_id ?? null,
      name: item.name,
      company: item.company ?? null,
      k: safeNum(item.k),
      b: safeNum(item.b),
      j: safeNum(item.j),
      u: safeNum(item.u),
      calc_mode: item.calc_mode ?? "weight",
      base_amount: safeNum(item.base_amount ?? 100),
      base_unit: item.base_unit ?? "g",
      qty_amount: safeNum(item.qty_amount ?? 1),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function clearCurrentItemsV2InDB() {
  const { error } = await sb
    .from("current_items_v2")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) throw error;
}

export async function deleteCurrentItemV2InDB(id) {
  const { error } = await sb
    .from("current_items_v2")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/* =========================
   misc
========================= */

export function extractCompanies(presets) {
  return [...new Set(
    (presets || [])
      .map((p) => p.company)
      .filter(Boolean)
  )].sort((a, b) =>
    a.localeCompare(b, "ru", { sensitivity: "base" })
  );
}

export async function deleteFoodV2InDB(id) {
  const { error } = await sb
    .from("foods_v2")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function setFoodFavoriteV2InDB(id, isFavorite) {
  const { data, error } = await sb
    .from("foods_v2")
    .update({ is_favorite: !!isFavorite })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteStockV2InDB(id) {
  const { error } = await sb
    .from("stocks_v2")
    .delete()
    .eq("id", id);

  if (error) throw error;
}