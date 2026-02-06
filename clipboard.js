import { dom } from "./dom.js";
import { setHintTemp } from "./utils.js";

function getTotalsText() {
  const k = dom.sumK?.textContent ?? "0.0";
  const b = dom.sumB?.textContent ?? "0.0";
  const j = dom.sumJ?.textContent ?? "0.0";
  const u = dom.sumU?.textContent ?? "0.0";
  return `К: ${k} | Б: ${b} | Ж: ${j} | У: ${u}`;
}

export async function copyTotalsToClipboard() {
  const text = getTotalsText();

  try {
    await navigator.clipboard.writeText(text);
    setHint("Скопировано ✅");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      setHintTemp("Скопировано ✅");
    } catch {
      setHintTemp("Не удалось скопировать 😕");
    }
    document.body.removeChild(ta);
  }
}
