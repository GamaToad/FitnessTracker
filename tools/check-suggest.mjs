// Checks Freeform suggestion ranking + per-session coverage zones.
//   node tools/check-suggest.mjs   (or: npm run check:suggest)
import { suggestForGroups, sessionZone } from "../js/suggest.js";

let failures = 0;
const fail = (m) => { failures++; console.error(`FAIL  ${m}`); };

const lib = [
  { name: "Barbell Bench Press", group: "Chest" },
  { name: "Incline Dumbbell Press", group: "Chest" },
  { name: "Cable Fly", group: "Chest" },
  { name: "Pec Deck", group: "Chest" },
  { name: "Barbell Curl", group: "Biceps" },
  { name: "Incline DB Curl", group: "Biceps" },
];

// History bumps a lower-ordered exercise to the top.
{
  const [chest] = suggestForGroups(["Chest"], lib, { "Cable Fly": 5 }, { perGroup: 2 });
  if (chest.exercises[0].name !== "Cable Fly") fail(`history rank: got ${chest.exercises[0].name}`);
  if (chest.exercises.length !== 2) fail(`perGroup cap: ${chest.exercises.length}`);
}
// No history → library order.
{
  const [chest] = suggestForGroups(["Chest"], lib, {}, { perGroup: 3 });
  if (chest.exercises[0].name !== "Barbell Bench Press") fail(`default order: ${chest.exercises[0].name}`);
}
// Exclude removes already-added.
{
  const [chest] = suggestForGroups(["Chest"], lib, {}, { perGroup: 3, exclude: ["Barbell Bench Press"] });
  if (chest.exercises.some((e) => e.name === "Barbell Bench Press")) fail("exclude not applied");
}
// Multiple groups returned in order.
{
  const res = suggestForGroups(["Chest", "Biceps"], lib, {}, {});
  if (res.length !== 2 || res[1].group !== "Biceps") fail("multi-group shape");
}

// Growth score floats a less-used but faster-growing lift above a slightly
// more-used staple.
{
  const freq = { "Barbell Bench Press": 8, "Incline Dumbbell Press": 3 };
  const growth = { "Incline Dumbbell Press": 0.9 };
  const [chest] = suggestForGroups(["Chest"], lib, freq, { perGroup: 2, growthMap: growth });
  if (chest.exercises[0].name !== "Incline Dumbbell Press") {
    fail(`growth blend: got ${chest.exercises[0].name} (expected Incline Dumbbell Press)`);
  }
}
// But a runaway-frequency lift still wins over a single high-growth one.
{
  const freq = { "Barbell Bench Press": 30, "Cable Fly": 1 };
  const growth = { "Cable Fly": 1.0 };
  const [chest] = suggestForGroups(["Chest"], lib, freq, { perGroup: 1, growthMap: growth });
  if (chest.exercises[0].name !== "Barbell Bench Press") {
    fail(`growth doesn't override large freq gap: ${chest.exercises[0].name}`);
  }
}

// Zones against [3, 8].
const Z = (n) => sessionZone(n, [3, 8]);
if (Z(2) !== "under") fail(`zone 2 → ${Z(2)}`);
if (Z(3) !== "target") fail(`zone 3 → ${Z(3)}`);
if (Z(8) !== "target") fail(`zone 8 → ${Z(8)}`);
if (Z(9) !== "over") fail(`zone 9 → ${Z(9)}`);

if (failures) { console.error(`\n${failures} suggest check failure(s).`); process.exit(1); }
console.log("OK: suggestion ranking + coverage zones pass.");
