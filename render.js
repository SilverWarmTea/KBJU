import { dom } from "./dom.js";
import { state } from "./state.js";
import { escapeHtml, fmt1, safeNum } from "./utils.js";

export function render() {
  if (!dom.list) return;

  const total = state.rows.reduce(
    (acc, r) => {
      acc.k += safeNum(r.k);
      acc.b += safeNum(r.b);
      acc.j += safeNum(r.j);
      acc.u += safeNum(r.u);
      return acc;
    },
    { k: 0, b: 0, j: 0, u: 0 }
  );

  if (dom.sumK) dom.sumK.textContent = fmt1(total.k);
  if (dom.sumB) dom.sumB.textContent = fmt1(total.b);
  if (dom.sumJ) dom.sumJ.textContent = fmt1(total.j);
  if (dom.sumU) dom.sumU.textContent = fmt1(total.u);

  dom.list.innerHTML = state.rows
    .map((r, idx) => {
      const name = (r.label && r.label.trim()) ? escapeHtml(r.label.trim()) : `#${idx + 1}`;
      const per = r.weight === "—";
      const sub = per ? "Порция" : `Вес: ${r.weight} г`;

      return `
        <div class="item-card" data-idx="${idx}">
          <div class="item-head">
            <div>
              <div class="item-title">${name}</div>
              <div class="item-sub">${sub}</div>
            </div>
            <div class="item-actions">
              <button class="act-btn save" data-save="${idx}" title="Сохранить в список продуктов"> 
              <svg viewBox="0 0 24 24" aria-hidden="true" class="ico">
    <path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zM7 5h8v4H7V5zm12 14H5V5h1v6h12V6.5L19 8v11z"/>
  </svg></button>
              <button class="act-btn rep" data-repeat="${idx}" title="Повторить">↻</button>
              <button class="act-btn del" data-del="${idx}" title="Удалить">✕</button>
            </div>
          </div>

          <div class="macro-grid">
            <div class="macro-pill">
              <div class="macro-left">🔥 Ккал</div>
              <div class="macro-val">${fmt1(r.k)}</div>
            </div>
            <div class="macro-pill">
              <div class="macro-left">💪 Б</div>
              <div class="macro-val">${fmt1(r.b)}</div>
            </div>
            <div class="macro-pill">
              <div class="macro-left">🥑 Ж</div>
              <div class="macro-val">${fmt1(r.j)}</div>
            </div>
            <div class="macro-pill">
              <div class="macro-left">🌾 У</div>
              <div class="macro-val">${fmt1(r.u)}</div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}
