export const dom = {
  // Inputs
  title: document.getElementById("title"),
  weight: document.getElementById("weight"),
  perPortion: document.getElementById("perPortion"),
  macros: {
    k: document.getElementById("k"),
    b: document.getElementById("b"),
    j: document.getElementById("j"),
    u: document.getElementById("u"),
  },
  copyTotals: document.getElementById("copyTotals"),

  // Buttons
  add: document.getElementById("add"),
  clear: document.getElementById("clear"),

  // Presets
  preset: document.getElementById("preset"),
  choose: document.getElementById("choose"),

  // UI
  hint: document.getElementById("hint"),
  list: document.getElementById("list"),

  // Totals
  sumK: document.getElementById("sumK"),
  sumB: document.getElementById("sumB"),
  sumJ: document.getElementById("sumJ"),
  sumU: document.getElementById("sumU"),
};
