import { round1, setHint } from "./utils.js";
import { state } from "./state.js";
import {
  apiGetFoodsV2,
  apiAddFoodV2,
  apiGetStocksV2,
  apiAddStockV2,
  apiAddToStockV2,
  apiConsumeStockV2,
  apiGetCurrentItemsV2,
  apiAddCurrentItemV2,
  apiClearCurrentItemsV2,
  apiDeleteCurrentItemV2
} from "./apiClient.js";

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

/* =========================
   V2
========================= */

export async function loadFoodsV2FromDB() {
  try {
    const data = await apiGetFoodsV2();

    return (data ?? [])
      .map((x) => ({
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
      }))
      .filter((x) => x.name)
      .sort((a, b) =>
        a.name.localeCompare(b.name, "ru", { sensitivity: "base" })
      );
  } catch (e) {
    console.error(e);
    setHint("Ошибка загрузки foods_v2");
    return [];
  }
}

export async function addFoodV2ToDB(food) {
  return await apiAddFoodV2({
    name: food.name,
    company: food.company ?? null,
    k: safeNum(food.k),
    b: safeNum(food.b),
    j: safeNum(food.j),
    u: safeNum(food.u),
    calc_mode: food.calc_mode ?? "weight",
    base_amount: safeNum(food.base_amount ?? 100),
    base_unit: food.base_unit ?? "g",
  });
}

export async function loadStocksV2FromDB() {
  try {
    const data = await apiGetStocksV2();

    return (data ?? [])
      .map((x) => ({
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
      }))
      .filter((x) => x.name);
  } catch (e) {
    console.error(e);
    setHint("Ошибка загрузки stocks_v2");
    return [];
  }
}

export async function addStockV2ToDB(stock) {
  return await apiAddStockV2({
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
  });
}

export async function addAmountToStockV2(id, amount) {
  return await apiAddToStockV2(id, safeNum(amount));
}

export async function consumeStockV2InDB(stock, amount) {
  const amountNum = safeNum(amount);

  const res = await apiConsumeStockV2(stock.id, amountNum);

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

  return res;
}

export async function loadCurrentItemsV2FromDB() {
  try {
    const data = await apiGetCurrentItemsV2();

    return (data ?? []).map((x) => {
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
    });
  } catch (e) {
    console.error(e);
    setHint("Ошибка загрузки current_items_v2");
    return [];
  }
}

export async function addCurrentItemV2ToDB(item) {
  let nextPos = 1;

  try {
    const existing = await apiGetCurrentItemsV2();
    const maxPos = (existing ?? []).reduce((acc, row) => {
      const p = Number(row.position) || 0;
      return Math.max(acc, p);
    }, 0);
    nextPos = maxPos + 1;
  } catch (e) {
    console.error(e);
  }

  const payload = {
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
  position: safeNum(item.position ?? nextPos),
};

console.log("POST current_items_v2 payload:", payload);

return await apiAddCurrentItemV2(payload);

}

export async function clearCurrentItemsV2InDB() {
  return await apiClearCurrentItemsV2();
}

export async function deleteCurrentItemV2InDB(id) {
  return await apiDeleteCurrentItemV2(id);
}

export function extractCompanies(presets) {
  return [...new Set(
    (presets || [])
      .map(p => p.company)
      .filter(Boolean)
  )].sort((a, b) =>
    a.localeCompare(b, "ru", { sensitivity: "base" })
  );
}