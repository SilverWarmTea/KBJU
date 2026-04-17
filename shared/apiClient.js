export const FN_BASE = "https://qznxqgavwemplturysql.supabase.co/functions/v1/quick-api";

/* =========================
   V2
========================= */

export async function apiGetFoodsV2() {
  const r = await fetch(`${FN_BASE}/foods-v2`, { method: "GET" });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j.data || [];
}

export async function apiAddFoodV2(payload) {
  const r = await fetch(`${FN_BASE}/foods-v2`, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j.data;
}

export async function apiGetStocksV2() {
  const r = await fetch(`${FN_BASE}/stocks-v2`, { method: "GET" });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j.data || [];
}

export async function apiAddStockV2(payload) {
  const r = await fetch(`${FN_BASE}/stocks-v2`, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j.data;
}

export async function apiAddToStockV2(id, amount) {
  const r = await fetch(`${FN_BASE}/stocks-v2/${encodeURIComponent(id)}/add`, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ amount }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j;
}

export async function apiConsumeStockV2(id, amount) {
  const r = await fetch(`${FN_BASE}/stocks-v2/${encodeURIComponent(id)}/consume`, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ amount }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j;
}

export async function apiGetCurrentItemsV2() {
  const r = await fetch(`${FN_BASE}/current-items-v2`, { method: "GET" });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j.data || [];
}

export async function apiAddCurrentItemV2(payload) {
  const r = await fetch(`${FN_BASE}/current-items-v2`, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j.data;
}

export async function apiClearCurrentItemsV2() {
  const r = await fetch(`${FN_BASE}/current-items-v2`, {
    method: "DELETE",
  });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j;
}

export async function apiDeleteCurrentItemV2(id) {
  const r = await fetch(`${FN_BASE}/current-items-v2/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j;
}