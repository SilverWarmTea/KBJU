import { round1 } from "./utils.js";

export function calcByWeight(m, w) {
  return {
    k: round1((m.k * w) / 100),
    b: round1((m.b * w) / 100),
    j: round1((m.j * w) / 100),
    u: round1((m.u * w) / 100),
  };
}
