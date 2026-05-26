// Checks plate math and warm-up ramps. Pure modules, import directly. Run with:
//   node tools/check-plates.mjs   (or: npm run check:plates)
import { platesPerSide, defaultBar, defaultPlates, stepperPlates, totalFromCounts } from "../js/plates.js";
import { warmupSets } from "../js/warmup.js";

let failures = 0;
const fail = (msg) => { failures++; console.error(`FAIL  ${msg}`); };

// 225 lb on a 45 bar = 180/2 = 90 per side = 2×45.
{
  const r = platesPerSide(225, BAR(), defaultPlates("lb"));
  const fortyFives = r.perSide.find((p) => p.plate === 45)?.count;
  if (fortyFives !== 2 || r.leftover !== 0 || r.loadable !== 225) {
    fail(`platesPerSide(225) → ${JSON.stringify(r)}`);
  }
}
function BAR() { return defaultBar("lb"); } // 45

// 135 lb = 45/side = 1×45.
{
  const r = platesPerSide(135, 45, defaultPlates("lb"));
  if (r.perSide.length !== 1 || r.perSide[0].plate !== 45 || r.perSide[0].count !== 1) {
    fail(`platesPerSide(135) → ${JSON.stringify(r)}`);
  }
}

// 100 kg on a 20 kg bar = 40/side = 25+15.
{
  const r = platesPerSide(100, defaultBar("kg"), defaultPlates("kg"));
  if (r.leftover !== 0 || r.loadable !== 100) fail(`platesPerSide(100kg) → ${JSON.stringify(r)}`);
}

// Below/at bar → nothing loaded.
{
  const r = platesPerSide(45, 45, defaultPlates("lb"));
  if (r.perSide.length !== 0 || r.loadable !== 45) fail(`platesPerSide(45 on 45) → ${JSON.stringify(r)}`);
}

// Odd weight leaves a leftover but still loads as much as possible.
{
  const r = platesPerSide(137, 45, defaultPlates("lb")); // 46/side; 45 + 1 leftover (no 1lb plate)
  if (r.leftover <= 0 || r.loadable >= 137) fail(`platesPerSide(137) → ${JSON.stringify(r)}`);
}

// Warm-up ramp: ascending, all below working weight, bar first.
{
  const ramp = warmupSets(225);
  if (!ramp.length) fail("warmupSets(225) empty");
  if (ramp[0].weight !== 45) fail(`warmupSets(225)[0] not bar → ${JSON.stringify(ramp[0])}`);
  for (let i = 0; i < ramp.length; i++) {
    if (ramp[i].weight >= 225) fail(`warmup rung ${ramp[i].weight} >= working 225`);
    if (i && ramp[i].weight <= ramp[i - 1].weight) fail(`warmup not ascending at ${i}: ${JSON.stringify(ramp)}`);
  }
}

// Working weight at/below bar → no warm-up.
if (warmupSets(45).length !== 0) fail("warmupSets(45) should be empty");

// Stepper denominations: trimmed common-gym sets, largest first.
{
  const lb = stepperPlates("lb"), kg = stepperPlates("kg");
  if (JSON.stringify(lb) !== JSON.stringify([45, 25, 10, 5])) fail(`stepperPlates(lb) → ${JSON.stringify(lb)}`);
  if (JSON.stringify(kg) !== JSON.stringify([25, 20, 15, 10, 5])) fail(`stepperPlates(kg) → ${JSON.stringify(kg)}`);
}

// totalFromCounts: bar + 2×Σ(plate×count).
{
  if (totalFromCounts({ 45: 1 }, 45) !== 135) fail(`totalFromCounts({45:1},45) → ${totalFromCounts({ 45: 1 }, 45)}`);
  if (totalFromCounts({ 45: 2, 25: 1 }, 45) !== 275) fail(`totalFromCounts({45:2,25:1},45) → ${totalFromCounts({ 45: 2, 25: 1 }, 45)}`);
  if (totalFromCounts({}, 45) !== 45) fail(`totalFromCounts({},45) → ${totalFromCounts({}, 45)}`);
}

// Per-side (iso-lateral): divisor 1 loads the FULL entered weight on each arm,
// from a 0 start. 90 lb /side = 2×45 plates (no halving across two sides).
{
  const r = platesPerSide(90, 0, defaultPlates("lb"), 1);
  if (r.perSide.length !== 1 || r.perSide[0].plate !== 45 || r.perSide[0].count !== 2 || r.loadable !== 90) {
    fail(`platesPerSide(90, 0, …, 1) → ${JSON.stringify(r)}`);
  }
  // The same 90 on a barbell (divisor 2) is only 45/side → 1×45 plate per side.
  const bar = platesPerSide(90, 0, defaultPlates("lb"), 2);
  const fortyFives = bar.perSide.find((p) => p.plate === 45)?.count;
  if (fortyFives !== 1 || bar.loadable !== 90) fail(`platesPerSide(90, 0, …, 2) → ${JSON.stringify(bar)}`);
}

// totalFromCounts multiplier 1 (per arm): start + 1×Σ(plate×count).
{
  if (totalFromCounts({ 45: 1 }, 0, 1) !== 45) fail(`totalFromCounts({45:1},0,1) → ${totalFromCounts({ 45: 1 }, 0, 1)}`);
  if (totalFromCounts({ 45: 2, 25: 1 }, 0, 1) !== 115) fail(`totalFromCounts({45:2,25:1},0,1) → ${totalFromCounts({ 45: 2, 25: 1 }, 0, 1)}`);
}

if (failures) { console.error(`\n${failures} plate/warm-up check failure(s).`); process.exit(1); }
console.log("OK: plate math and warm-up ramps pass.");
