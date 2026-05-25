// Checks the exercise planner (warm-up ramp + working sets). Run with:
//   node tools/check-planner.mjs   (or: npm run check:planner)
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

const { planExercise, warmupSets } = await import("../js/warmup.js");

let failures = 0;
const fail = (msg) => { failures++; console.error(`FAIL  ${msg}`); };

// Working sets: count, weight, reps, rir, and setType all as requested.
{
  const { warmups, working } = planExercise({ workingWeight: 225, sets: 3, reps: 8, rir: 2, unit: "lb" });
  if (working.length !== 3) fail(`expected 3 working sets, got ${working.length}`);
  if (!working.every((s) => s.weight === 225 && s.reps === 8 && s.rir === 2 && s.setType === "working")) {
    fail(`working set fields wrong: ${JSON.stringify(working)}`);
  }
  // Warm-ups match warmupSets and are tagged.
  const ramp = warmupSets(225, "lb");
  if (warmups.length !== ramp.length) fail(`warmup count ${warmups.length} != warmupSets ${ramp.length}`);
  if (!warmups.every((s) => s.setType === "warmup")) fail(`warm-ups not all tagged warmup`);
  if (!warmups.every((s) => s.weight < 225)) fail(`warm-up weight at/above working weight`);
}

// Zero working sets requested → none produced (warm-ups still allowed).
{
  const { working } = planExercise({ workingWeight: 135, sets: 0, reps: 10, rir: 1, unit: "lb" });
  if (working.length !== 0) fail(`sets:0 should yield no working sets, got ${working.length}`);
}

// No/invalid working weight → no warm-ups, working weights blank.
{
  const { warmups, working } = planExercise({ workingWeight: 0, sets: 2, reps: 12, rir: 2, unit: "lb" });
  if (warmups.length !== 0) fail(`no weight should yield no warm-ups, got ${warmups.length}`);
  if (working.length !== 2 || !working.every((s) => s.weight === "")) fail(`blank-weight working sets wrong: ${JSON.stringify(working)}`);
}

// Sets count is rounded/clamped.
{
  const { working } = planExercise({ workingWeight: 100, sets: 3.7, reps: 8, rir: 2, unit: "lb" });
  if (working.length !== 4) fail(`sets:3.7 should round to 4, got ${working.length}`);
}

if (failures) { console.error(`\n${failures} planner check failure(s).`); process.exit(1); }
console.log("OK: exercise planner (warm-ups + working sets) passes.");
