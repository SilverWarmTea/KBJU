import { MACRO_KEYS, MACRO_RE, WEIGHT_RE } from "./constants.js";
import { dom } from "./dom.js";
import { normalizeNumber, setHint } from "./utils.js";

export function readMacros() {
  const out = {};

  for (const key of MACRO_KEYS) {
    const el = dom.macros[key];
    const raw = normalizeNumber(el?.value ?? "");

    if (raw === "") {
      setHint("КБЖУ: заполните все 4 поля.");
      return null;
    }

    if (!MACRO_RE.test(raw)) {
      setHint("КБЖУ: 0..9999 и 1 знак после точки (например 0, 0.1, 12.3, 1234.5).");
      return null;
    }

    const val = Number(raw);
    if (!Number.isFinite(val) || val < 0) {
      setHint("КБЖУ: значение должно быть неотрицательным числом.");
      return null;
    }

    out[key] = val;
  }

  return out;
}

export function readWeight() {
  const raw = String(dom.weight?.value ?? "").trim();

  if (!WEIGHT_RE.test(raw)) {
    setHint("Вес: целое положительное число, максимум 4 цифры (например 250).");
    return null;
  }

  const w = parseInt(raw, 10);
  if (!Number.isFinite(w) || w <= 0) {
    setHint("Вес: должен быть > 0.");
    return null;
  }

  return w;
}
