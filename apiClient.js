export const FN_BASE = "https://qznxqgavwemplturysql.supabase.co/functions/v1/quick-api";

export async function apiGetFoods() {
  const r = await fetch(`${FN_BASE}/foods`, { method: "GET" });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j.data || [];
}

export async function apiAddFood(payload) {
  // важный трюк: text/plain уменьшает шанс CORS-preflight на мобиле
  const r = await fetch(`${FN_BASE}/foods`, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j.data;
}

export async function apiGetCurrentItems() {
  const r = await fetch(`${FN_BASE}/current-items`, { method: "GET" });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j.data || [];
}

export async function apiAddCurrentItem(payload) {
  const r = await fetch(`${FN_BASE}/current-items`, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j.data;
}

export async function apiClearCurrentItems() {
  const r = await fetch(`${FN_BASE}/current-items`, { method: "DELETE" });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return true;
}
