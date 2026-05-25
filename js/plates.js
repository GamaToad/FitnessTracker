// Barbell plate math. All weights are in a single unit (lb or kg); the caller
// passes the right bar + inventory for that unit. Pure / Node-testable.

export const PLATES_LB = [45, 35, 25, 10, 5, 2.5];
export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const BAR_LB = 45;
export const BAR_KG = 20;

export const defaultBar = (unit) => (unit === "kg" ? BAR_KG : BAR_LB);
export const defaultPlates = (unit) => (unit === "kg" ? PLATES_KG : PLATES_LB);

// Denominations offered as +/- steppers in the interactive plate calculator —
// a trimmed set of the most common gym plates, largest first.
export const STEPPER_PLATES_LB = [45, 25, 10, 5];
export const STEPPER_PLATES_KG = [25, 20, 15, 10, 5];
export const stepperPlates = (unit) => (unit === "kg" ? STEPPER_PLATES_KG : STEPPER_PLATES_LB);

// Total bar weight from a per-side count map ({ [plate]: count }) on a given bar.
// Pure / Node-testable.
export function totalFromCounts(counts, barWeight) {
  let perSide = 0;
  for (const [plate, count] of Object.entries(counts || {})) {
    perSide += Number(plate) * Number(count || 0);
  }
  return Math.round((barWeight + perSide * 2) * 100) / 100;
}

// Greedy plates-per-side to load `target` on a bar of `barWeight`, drawing from
// `inventory` (plate sizes, unlimited count). Returns:
//   perSide: [{ plate, count }]  — plates on EACH side, largest first
//   leftover: weight per side that can't be made with the inventory
//   loadable: the actual achievable bar weight (<= target)
export function platesPerSide(target, barWeight, inventory) {
  const t = Number(target);
  if (!Number.isFinite(t) || t <= barWeight) {
    return { perSide: [], leftover: 0, loadable: barWeight };
  }
  const perSideTarget = (t - barWeight) / 2;
  const plates = [...inventory].sort((a, b) => b - a);
  const perSide = [];
  let remaining = perSideTarget;
  for (const p of plates) {
    const count = Math.floor(remaining / p + 1e-9);
    if (count > 0) {
      perSide.push({ plate: p, count });
      remaining -= count * p;
    }
  }
  remaining = Math.round(remaining * 100) / 100;
  const loaded = perSideTarget - remaining;
  return { perSide, leftover: remaining, loadable: Math.round((barWeight + loaded * 2) * 100) / 100 };
}
