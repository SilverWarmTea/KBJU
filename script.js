const inputs = {
  k: document.getElementById("k"),
  b: document.getElementById("b"),
  j: document.getElementById("j"),
  u: document.getElementById("u"),
};
const weightInput = document.getElementById("weight");

const addBtn = document.getElementById("add");
const clearBtn = document.getElementById("clear");
const tbody = document.getElementById("tbody");
const sumEl = document.getElementById("sum");
const hintEl = document.getElementById("hint");

let rows = []; // { weight, k, b, j, u }

addBtn.addEventListener("click", () => {
  hint("");

  const weight = parseInt(weightInput.value, 10);
  if (!isValidWeight(weight)) {
    hint("Вес: целое положительное число, максимум 4 цифры.");
    return;
  }

  const per100 = {};
  for (const key of ["k", "b", "j", "u"]) {
    const v = parseFloat(inputs[key].value);
    if (!isValidMacro(v)) {
      hint("КБЖУ/100г: только положительные, до 4 цифр и 1 знак после точки (например 1234.5).");
      return;
    }
    per100[key] = v;
  }

  const res = {
    weight,
    k: round1((per100.k * weight) / 100),
    b: round1((per100.b * weight) / 100),
    j: round1((per100.j * weight) / 100),
    u: round1((per100.u * weight) / 100),
  };

  rows.push(res);
  render();
});

clearBtn.addEventListener("click", () => {
  rows = [];
  render();
  hint("Очищено.");
});

function render() {
  tbody.innerHTML = "";

  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${r.weight}</td>
      <td>${fmt1(r.k)}</td>
      <td>${fmt1(r.b)}</td>
      <td>${fmt1(r.j)}</td>
      <td>${fmt1(r.u)}</td>
      <td><button class="icon-btn" data-del="${idx}" title="Удалить">✕</button></td>
    `;

    tbody.appendChild(tr);
  });

  // обработка удаления строки
  tbody.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.getAttribute("data-del"), 10);
      rows.splice(i, 1);
      render();
    });
  });

  const total = rows.reduce((acc, r) => {
    acc.k += r.k; acc.b += r.b; acc.j += r.j; acc.u += r.u;
    return acc;
  }, { k: 0, b: 0, j: 0, u: 0 });

  sumEl.textContent = `К: ${fmt1(total.k)} | Б: ${fmt1(total.b)} | Ж: ${fmt1(total.j)} | У: ${fmt1(total.u)}`;
}

function isValidMacro(value) {
  if (Number.isNaN(value) || value <= 0) return false; // строго положительные
  // до 4 цифр целой части и 1 знак после точки (или без точки)
  return /^\d{1,4}(\.\d)?$/.test(String(value));
}

function isValidWeight(value) {
  if (Number.isNaN(value) || value <= 0) return false; // строго положительный вес
  return /^\d{1,4}$/.test(String(value));
}

function round1(num) {
  return Math.round(num * 10) / 10;
}

function fmt1(num) {
  return (Math.round(num * 10) / 10).toFixed(1);
}

function hint(text) {
  hintEl.textContent = text || "";
}
