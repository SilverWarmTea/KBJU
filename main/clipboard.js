import { dom } from "../shared/dom.js";
import { setHintTemp } from "../shared/utils.js";

function getTotalsText() {
  const k = dom.sumK?.textContent ?? "0.0";
  const b = dom.sumB?.textContent ?? "0.0";
  const j = dom.sumJ?.textContent ?? "0.0";
  const u = dom.sumU?.textContent ?? "0.0";
  return `К: ${k} | Б: ${b} | Ж: ${j} | У: ${u}`;
}

function formatDateForOutput(value) {
  if (!value) return "";

  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return "";
  return `${day}.${month}`;
}

function buildCopyText() {
  const dateText = formatDateForOutput(dom.copyDate?.value ?? "");
  const totals = getTotalsText();
  const activity = String(dom.copyActivity?.value ?? "").trim();

  return `${dateText} ${totals} ${activity}`.trim();
}

function updatePreview() {
  if (!dom.copyPreview) return;
  dom.copyPreview.textContent = buildCopyText();
}

function getTodayForInput() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function openCopyModal() {
  if (!dom.copyModalBackdrop) return;

  if (dom.copyDate && !dom.copyDate.value) {
    dom.copyDate.value = getTodayForInput();
  }

  if (dom.copyActivity && !dom.copyActivity.value) {
    dom.copyActivity.value = "отдых";
  }

  updatePreview();
  dom.copyModalBackdrop.classList.remove("hidden");
}

export function closeCopyModal() {
  dom.copyModalBackdrop?.classList.add("hidden");
}

export async function confirmCopyTotals() {
  const text = buildCopyText();

  try {
    await navigator.clipboard.writeText(text);
    closeCopyModal();
    setHintTemp("Скопировано ✅");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();

    try {
      document.execCommand("copy");
      closeCopyModal();
      setHintTemp("Скопировано ✅");
    } catch {
      setHintTemp("Не удалось скопировать 😕");
    }

    document.body.removeChild(ta);
  }
}

export function initCopyModalEvents() {
  dom.copyModalClose?.addEventListener("click", closeCopyModal);
  dom.copyModalConfirm?.addEventListener("click", confirmCopyTotals);
  dom.copyDate?.addEventListener("input", updatePreview);
  dom.copyActivity?.addEventListener("change", updatePreview);

  dom.copyModalBackdrop?.addEventListener("click", (e) => {
    if (e.target === dom.copyModalBackdrop) {
      closeCopyModal();
    }
  });
}