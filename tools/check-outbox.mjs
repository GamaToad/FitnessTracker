// Behaviour checks for the offline write queue.
//   node tools/check-outbox.mjs   (or: npm run check:outbox)

// Minimal in-memory localStorage shim (outbox reads it at call time).
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

const { enqueue, pendingCount, peekRows, drain, clear, QUEUEABLE } =
  await import("../js/outbox.js");

let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.error(`FAIL  ${msg}`); } };

clear();
ok(pendingCount() === 0, "starts empty");

// Queueable set is limited to append-only hot-path tabs.
ok(QUEUEABLE.has("sets") && QUEUEABLE.has("sessions") && QUEUEABLE.has("sessionFeedback"),
  "queueable includes sets/sessions/sessionFeedback");
ok(!QUEUEABLE.has("mesocycles") && !QUEUEABLE.has("weekPlan"),
  "queueable excludes mutate/replace tabs");

// Enqueue persists and counts.
enqueue("sets", [["id1", "m", "1"]]);
enqueue("sets", [["id2", "m", "2"]]);
enqueue("sessions", [["s1"]]);
ok(pendingCount() === 3, `pendingCount 3 (got ${pendingCount()})`);
ok(store["gama.outbox"], "persisted to localStorage");

// peekRows flattens just the requested tab, in order.
const setRows = peekRows("sets");
ok(setRows.length === 2 && setRows[0][0] === "id1" && setRows[1][0] === "id2",
  "peekRows returns this-tab rows in order");
ok(peekRows("sessions").length === 1, "peekRows isolates by tab");

// Successful drain replays FIFO and empties the queue.
{
  const sent = [];
  const res = await drain(async (key, values) => { sent.push([key, values[0][0]]); });
  ok(res.sent === 3 && pendingCount() === 0, `drained all (sent ${res.sent}, remaining ${pendingCount()})`);
  ok(sent[0][1] === "id1" && sent[1][1] === "id2" && sent[2][0] === "sessions",
    "FIFO order preserved across drain");
}

// Drain stops at the first failure; nothing after it is lost.
{
  clear();
  enqueue("sets", [["a"]]);
  enqueue("sets", [["b"]]);
  enqueue("sets", [["c"]]);
  let n = 0;
  let threw = false;
  try {
    await drain(async () => { n++; if (n === 2) throw new Error("network"); });
  } catch { threw = true; }
  ok(threw, "drain surfaces the send failure");
  ok(pendingCount() === 2, `stopped with 2 remaining (got ${pendingCount()})`);
  ok(peekRows("sets")[0][0] === "b", "failed item retained at head (order intact)");
}

clear();
if (failures) { console.error(`\n${failures} outbox check failure(s).`); process.exit(1); }
console.log("OK: all outbox cases pass.");
