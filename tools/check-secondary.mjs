// Validates secondary muscle-group entries in the exercise library:
//   - every secondary group is a real MUSCLE_GROUPS member
//   - fractions are numbers in (0, 1]
//   - no exercise lists its own primary group as a secondary
//   node tools/check-secondary.mjs   (or: npm run check:secondary)
import { MUSCLE_GROUPS, EXERCISE_LIBRARY } from "../js/rp.js";

let failures = 0;
let secondaryCount = 0;
const groups = new Set(MUSCLE_GROUPS);

for (const ex of EXERCISE_LIBRARY) {
  if (!ex.secondary) continue;
  if (!Array.isArray(ex.secondary)) {
    failures++;
    console.error(`"${ex.name}": secondary is not an array`);
    continue;
  }
  for (const sec of ex.secondary) {
    secondaryCount++;
    if (!groups.has(sec.group)) {
      failures++;
      console.error(`"${ex.name}": unknown secondary group "${sec.group}"`);
    }
    if (sec.group === ex.group) {
      failures++;
      console.error(`"${ex.name}": secondary lists own primary group "${sec.group}"`);
    }
    if (typeof sec.fraction !== "number" || sec.fraction <= 0 || sec.fraction > 1) {
      failures++;
      console.error(`"${ex.name}" → "${sec.group}": fraction ${sec.fraction} not in (0, 1]`);
    }
  }
}

const withSecondary = EXERCISE_LIBRARY.filter((e) => e.secondary?.length).length;

if (failures) {
  console.error(`\n${failures} secondary check failure(s).`);
  process.exit(1);
}
console.log(`OK: ${withSecondary}/${EXERCISE_LIBRARY.length} exercises have secondary muscles (${secondaryCount} total entries).`);
