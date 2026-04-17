import { dom } from "./dom.js";

export function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

export function round1(num) {
  return Math.round(safeNum(num) * 10) / 10;
}

export function fmt1(num) {
  return (Math.round(safeNum(num) * 10) / 10).toFixed(1);
}

export function setHint(text) {
  if (dom.hint) dom.hint.textContent = text || "";
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c]));
}

export function normalizeNumber(str) {
  return String(str).trim().replace(",", ".");
}

export function setHintTemp(text, ms = 1600) {
  setHint(text);
  if (!text) return;
  window.clearTimeout(setHintTemp._t);
  setHintTemp._t = window.setTimeout(() => setHint(""), ms);
}