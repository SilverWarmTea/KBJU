function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#039;";
      default: return ch;
    }
  });
}

function fmt(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return Number.isInteger(num) ? String(num) : String(num);
}

function renderActions(actions = []) {
  if (!actions.length) return "";

  return actions.map((btn, index) => {
    const label = escapeHtml(btn.label ?? `Кнопка ${index + 1}`);
    const action = escapeHtml(btn.action ?? "");
    const variant = escapeHtml(btn.variant ?? "");

    return `
      <button
        type="button"
        class="product-card__action-btn ${variant ? `product-card__action-btn--${variant}` : ""}"
        data-action="${action}"
      >
        ${label}
      </button>
    `;
  }).join("");
}

export function renderProductCard(data = {}, options = {}) {
  const {
    name = "Без названия",
    company = null,
    k = 0,
    b = 0,
    j = 0,
    u = 0,
    modeText = "",
    baseText = "",
    extraTitle = "",
    extraText = ""
  } = data;

  const actions = Array.isArray(options.actions) ? options.actions : [];
  const actionPanel = options.actionPanel || "";

  return `
    <div class="product-card">
      <div class="product-card__grid">

        <div class="product-card__box product-card__box--info">
          <div class="product-card__title">${escapeHtml(name)}</div>
          <div class="product-card__company">
            ${company ? `Фирма: ${escapeHtml(company)}` : "Без фирмы"}
          </div>
        </div>

        <div class="product-card__box product-card__box--mode">
          <div class="product-card__meta">${escapeHtml(modeText)}</div>
          <div class="product-card__meta">${escapeHtml(baseText)}</div>
        </div>

        <div class="product-card__box product-card__box--extra">
          <div class="product-card__extra-title">${escapeHtml(extraTitle)}</div>
          <div class="product-card__extra-text">${escapeHtml(extraText)}</div>
        </div>

        <div class="product-card__box product-card__box--macros">
          <div class="product-card__macros">
            <div class="product-card__pill product-card__pill--k">
              <span class="product-card__pill-label">🔥 Калории</span>
              <span class="product-card__pill-value">${fmt(k)}</span>
            </div>

            <div class="product-card__pill product-card__pill--b">
              <span class="product-card__pill-label">💪 Белки</span>
              <span class="product-card__pill-value">${fmt(b)}</span>
            </div>

            <div class="product-card__pill product-card__pill--j">
              <span class="product-card__pill-label">🥑 Жиры</span>
              <span class="product-card__pill-value">${fmt(j)}</span>
            </div>

            <div class="product-card__pill product-card__pill--u">
              <span class="product-card__pill-label">🌾 Углеводы</span>
              <span class="product-card__pill-value">${fmt(u)}</span>
            </div>
          </div>
        </div>

        <div class="product-card__box product-card__box--actions">
          ${actionPanel || renderActions(actions)}
        </div>

      </div>
    </div>
  `;
}