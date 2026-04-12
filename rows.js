import { state } from "./state.js";
import { calcByWeight } from "./math.js";
import { round1 } from "./utils.js";
import { saveRowToDB } from "./db.js";

export function addRow({ macros, weight, label, perPortion, company}) {
  const safeLabel = String(label || "").trim();

  const res = perPortion
    ? {
        label: safeLabel,
        company,
        perPortion: true,
        weight: "—",
        k: round1(macros.k),
        b: round1(macros.b),
        j: round1(macros.j),
        u: round1(macros.u),
        
      }
    : {
        label: safeLabel,
        company,
        perPortion: false,
        weight,
        ...calcByWeight(macros, weight),
      };

  state.rows.push(res);
  saveRowToDB(macros, weight, perPortion, safeLabel, company);
}
