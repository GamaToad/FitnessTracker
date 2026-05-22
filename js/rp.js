// RP Strength constants and mesocycle math.
// Volume landmarks (sets per muscle group per week) are drawn from the
// recommendations Mike Israetel et al. have published. They're starting
// points — every lifter tunes them with experience.

export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Shoulders (side delts)",
  "Shoulders (rear delts)",
  "Biceps",
  "Triceps",
  "Calves",
  "Forearms",
  "Traps",
  "Abs",
  "Neck",
];

// MV = Maintenance Volume, MEV = Minimum Effective Volume,
// MAV = Maximum Adaptive Volume (range), MRV = Maximum Recoverable Volume.
// All values are weekly working sets, RP defaults for an intermediate lifter.
export const DEFAULT_LANDMARKS = {
  Chest: { MV: 8, MEV: 10, MAV_lo: 12, MAV_hi: 20, MRV: 22 },
  Back: { MV: 8, MEV: 10, MAV_lo: 14, MAV_hi: 22, MRV: 25 },
  Quads: { MV: 6, MEV: 8, MAV_lo: 12, MAV_hi: 18, MRV: 20 },
  Hamstrings: { MV: 4, MEV: 6, MAV_lo: 10, MAV_hi: 16, MRV: 20 },
  Glutes: { MV: 0, MEV: 0, MAV_lo: 4, MAV_hi: 12, MRV: 16 },
  "Shoulders (side delts)": { MV: 8, MEV: 8, MAV_lo: 16, MAV_hi: 22, MRV: 26 },
  "Shoulders (rear delts)": { MV: 6, MEV: 8, MAV_lo: 14, MAV_hi: 20, MRV: 24 },
  Biceps: { MV: 5, MEV: 8, MAV_lo: 14, MAV_hi: 20, MRV: 26 },
  Triceps: { MV: 4, MEV: 6, MAV_lo: 10, MAV_hi: 14, MRV: 18 },
  Calves: { MV: 6, MEV: 8, MAV_lo: 12, MAV_hi: 16, MRV: 20 },
  Forearms: { MV: 2, MEV: 4, MAV_lo: 10, MAV_hi: 15, MRV: 20 },
  Traps: { MV: 0, MEV: 0, MAV_lo: 12, MAV_hi: 20, MRV: 26 },
  Abs: { MV: 0, MEV: 0, MAV_lo: 16, MAV_hi: 25, MRV: 25 },
  Neck: { MV: 0, MEV: 0, MAV_lo: 6, MAV_hi: 12, MRV: 16 },
};

// A small starting exercise library, tagged with primary muscle group.
export const EXERCISE_LIBRARY = [
  { name: "Barbell Bench Press", group: "Chest" },
  { name: "Incline Dumbbell Press", group: "Chest" },
  { name: "Machine Chest Press", group: "Chest" },
  { name: "Cable Fly", group: "Chest" },
  { name: "Pull-up", group: "Back" },
  { name: "Lat Pulldown", group: "Back" },
  { name: "Barbell Row", group: "Back" },
  { name: "Chest-Supported Row", group: "Back" },
  { name: "Cable Row", group: "Back" },
  { name: "Back Squat", group: "Quads" },
  { name: "Front Squat", group: "Quads" },
  { name: "Hack Squat", group: "Quads" },
  { name: "Leg Press", group: "Quads" },
  { name: "Leg Extension", group: "Quads" },
  { name: "Romanian Deadlift", group: "Hamstrings" },
  { name: "Lying Leg Curl", group: "Hamstrings" },
  { name: "Seated Leg Curl", group: "Hamstrings" },
  { name: "Hip Thrust", group: "Glutes" },
  { name: "Bulgarian Split Squat", group: "Glutes" },
  { name: "Cable Kickback", group: "Glutes" },
  { name: "Overhead Press", group: "Shoulders (side delts)" },
  { name: "Dumbbell Lateral Raise", group: "Shoulders (side delts)" },
  { name: "Cable Lateral Raise", group: "Shoulders (side delts)" },
  { name: "Reverse Pec Deck", group: "Shoulders (rear delts)" },
  { name: "Face Pull", group: "Shoulders (rear delts)" },
  { name: "Barbell Curl", group: "Biceps" },
  { name: "Incline DB Curl", group: "Biceps" },
  { name: "Cable Curl", group: "Biceps" },
  { name: "Hammer Curl", group: "Biceps" },
  { name: "Triceps Pushdown", group: "Triceps" },
  { name: "Overhead Triceps Extension", group: "Triceps" },
  { name: "Close-Grip Bench", group: "Triceps" },
  { name: "Standing Calf Raise", group: "Calves" },
  { name: "Seated Calf Raise", group: "Calves" },
  { name: "Wrist Curl", group: "Forearms" },
  { name: "Barbell Shrug", group: "Traps" },
  { name: "Cable Crunch", group: "Abs" },
  { name: "Hanging Leg Raise", group: "Abs" },
];

// Generate weekly set-count progression from MEV to MRV across `weeks`
// accumulation weeks, ending in a deload at ~50% of week-1 sets.
export function progressSets(MEV, MRV, weeks) {
  if (weeks < 2) return [MEV];
  const accumWeeks = weeks - 1; // last week is the deload
  const span = MRV - MEV;
  const out = [];
  for (let i = 0; i < accumWeeks; i++) {
    const frac = i / Math.max(1, accumWeeks - 1);
    out.push(Math.round(MEV + span * frac));
  }
  // Deload week: ~50% of MEV sets, minimum 2.
  out.push(Math.max(2, Math.round(MEV * 0.5)));
  return out;
}

// Reps-in-reserve progression: starts at ~3 RIR, drives toward 0 on the
// last accumulation week, then deload at 4 RIR.
export function progressRIR(weeks) {
  if (weeks < 2) return [3];
  const accum = weeks - 1;
  const out = [];
  for (let i = 0; i < accum; i++) {
    const frac = i / Math.max(1, accum - 1);
    out.push(Math.max(0, Math.round(3 - 3 * frac)));
  }
  out.push(4); // deload
  return out;
}

// Given a set count for a muscle group in a week and a list of exercises
// targeting that group, distribute the sets as evenly as possible across
// the exercises. Returns sets-per-exercise as an array (same order).
export function distributeSets(totalSets, exerciseCount) {
  if (exerciseCount <= 0) return [];
  const base = Math.floor(totalSets / exerciseCount);
  const extra = totalSets - base * exerciseCount;
  return Array.from({ length: exerciseCount }, (_, i) =>
    base + (i < extra ? 1 : 0),
  );
}

// Estimated 1RM (Epley). Used for tiny progression suggestions only.
export function epley1RM(weight, reps) {
  if (!weight || !reps) return 0;
  return weight * (1 + reps / 30);
}

// Suggest the next session's working weight based on the previous session's
// top set and its RIR. Generic 1-RIR-buffer-to-target step.
//   - If you hit prescribed reps with > target RIR: bump weight ~2.5%.
//   - At target RIR: small bump ~1.5%.
//   - Below target RIR (too easy slipped): bigger jump ~3%.
//   - Missed reps (RIR < 0 effectively): hold or drop.
export function suggestWeight(prev, targetReps, targetRIR) {
  if (!prev) return null;
  const { weight, reps, rir } = prev;
  if (!weight) return null;
  if (reps < targetReps) return Math.round(weight * 10) / 10; // hold
  const buffer = rir - targetRIR;
  let factor = 1.015;
  if (buffer >= 2) factor = 1.03;
  else if (buffer >= 1) factor = 1.02;
  else if (buffer < 0) factor = 1.0;
  return Math.round(weight * factor * 10) / 10;
}
