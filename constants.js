export const MACRO_KEYS = ["k", "b", "j", "u"];
export const STORAGE_KEY = "kbju_rows_v3"; // если хочешь оставить fallback localStorage

// Разрешаем: 0..9999 и 1 знак после точки -> 0, 0.1, 12, 12.3, 1234.5
export const MACRO_RE = /^(?:0|[1-9]\d{0,3})(?:\.\d)?$/;
// Вес: 1..9999 (целое)
export const WEIGHT_RE = /^[0-9]{1,4}$/;
