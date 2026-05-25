// Checks the pure value/progress math behind the set controller. Run with:
//   node tools/check-setcontroller.mjs   (or: npm run check:setcontroller)
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

const { weightStep, clampField, nextValue, remainingSets } = await import("../js/setcontroller.js");

let failures = 0;
const fail = (msg) => { failures++; console.error(`FAIL  ${msg}`); };
const eq = (got, want, label) => { if (got !== want) fail(`${label}: got ${got}, want ${want}`); };

// Weight step depends on display unit.
eq(weightStep("lb"), 5, "weightStep lb");
eq(weightStep("kg"), 2.5, "weightStep kg");

// Clamp: RIR 0–10, others non-negative.
eq(clampField("rir", 12), 10, "rir clamp high");
eq(clampField("rir", -3), 0, "rir clamp low");
eq(clampField("reps", -1), 0, "reps non-negative");
eq(clampField("weight", -5), 0, "weight non-negative");

// nextValue: weight steps by unit.
eq(nextValue("weight", "150", "", 1, "lb"), "155", "weight +5 lb");
eq(nextValue("weight", "150", "", -1, "lb"), "145", "weight -5 lb");
eq(nextValue("weight", "100", "", 1, "kg"), "102.5", "weight +2.5 kg");
// reps / rir step by 1, with clamps.
eq(nextValue("reps", "8", "", 1, "lb"), "9", "reps +1");
eq(nextValue("rir", "10", "", 1, "lb"), "10", "rir clamps at 10");
eq(nextValue("rir", "0", "", -1, "lb"), "0", "rir clamps at 0");
// Empty + numeric seed → snap to seed (no step applied), regardless of dir.
eq(nextValue("weight", "", "135", 1, "lb"), "135", "empty snaps to seed (+)");
eq(nextValue("weight", "", "135", -1, "lb"), "135", "empty snaps to seed (−)");
// Empty + no seed → steps from 0 (and clamps).
eq(nextValue("weight", "", "", 1, "lb"), "5", "empty no-seed +5 from 0");
eq(nextValue("weight", "", "", -1, "lb"), "0", "empty no-seed − clamps at 0");
eq(nextValue("reps", "", "", -1, "lb"), "0", "empty reps − clamps at 0");

// remainingSets excludes nothing here (caller passes working counts); clamps at 0.
eq(remainingSets(2, 1, 8), 5, "remaining 8-2-1");
eq(remainingSets(8, 2, 8), 0, "remaining clamps at 0");
eq(remainingSets(0, 0, 0), 0, "target 0 → 0 remaining");

if (failures) { console.error(`\n${failures} set-controller check failure(s).`); process.exit(1); }
console.log("OK: set-controller value + progress math pass.");
