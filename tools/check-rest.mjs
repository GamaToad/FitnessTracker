// Checks the rest-band parser used by the rest timer. Run with:
//   node tools/check-rest.mjs   (or: npm run check:rest)
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

const { parseRestToSeconds, restSecondsFor, MUSCLE_REFERENCE } = await import("../js/rp.js");

let failures = 0;
const fail = (msg) => { failures++; console.error(`FAIL  ${msg}`); };
const eq = (got, want, label) => { if (got !== want) fail(`${label}: got ${got}, want ${want}`); };

// Representative formats from MUSCLE_REFERENCE.
eq(parseRestToSeconds("2–3 min"), 150, '"2–3 min"');
eq(parseRestToSeconds("1 min"), 60, '"1 min"');
eq(parseRestToSeconds("3+ min"), 180, '"3+ min"');
eq(parseRestToSeconds("30–90 sec"), 60, '"30–90 sec"');
eq(parseRestToSeconds("60–120 sec"), 90, '"60–120 sec"');
eq(parseRestToSeconds("1.5–2 min"), 105, '"1.5–2 min"');
eq(parseRestToSeconds("30 sec–2 min"), 75, '"30 sec–2 min"');

// Unparseable / empty inputs return null.
if (parseRestToSeconds("") !== null) fail('empty string should be null');
if (parseRestToSeconds(null) !== null) fail('null should be null');

// Every muscle group resolves to a sane positive, finite seconds value.
for (const [group, ref] of Object.entries(MUSCLE_REFERENCE)) {
  const s = restSecondsFor(group);
  if (!Number.isFinite(s) || s <= 0 || s > 600) {
    fail(`restSecondsFor("${group}") → ${s} (from rest "${ref.rest}")`);
  }
}

// Unknown group falls back to the default (120s).
eq(restSecondsFor("Nonexistent"), 120, "unknown group fallback");

if (failures) { console.error(`\n${failures} rest check failure(s).`); process.exit(1); }
console.log("OK: rest-band parsing + restSecondsFor pass.");
