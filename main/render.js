import { dom } from "../shared/dom.js";
import { state } from "../shared/state.js";
import { fmt1, safeNum } from "../shared/utils.js";
import { renderProductCard } from "../shared/product-card.js";

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
      const name = (r.label && String(r.label).trim())
        ? String(r.label).trim()
        : `#${idx + 1}`;

      const perPortion = r.weight === "—";

      const modeText = perPortion ? "Режим: порция" : "Режим: по весу";
      const baseText = perPortion ? "База: 1 порция" : `База: ${r.weight} г`;

      const extraTitle = "Текущий список";
      const extraText = perPortion
        ? "Добавлено как порция"
        : `Вес: ${r.weight} г`;

      return renderProductCard(
        {
          name,
          company: r.company ?? null,
          k: fmt1(r.k),
          b: fmt1(r.b),
          j: fmt1(r.j),
          u: fmt1(r.u),
          modeText,
          baseText,
          extraTitle,
          extraText
        },
        {
          actions: [
            { label: "Сохранить", action: `save:${idx}` },
            { label: "Повторить", action: `repeat:${idx}` },
            { label: "Удалить", action: `delete:${idx}`, variant: "danger" }
          ]
        }
      );
    })
    .join("");
}