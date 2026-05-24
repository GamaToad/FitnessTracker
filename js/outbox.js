// Offline write queue.
//
// A localStorage-backed FIFO of pending append-only Sheets writes. When the
// network drops mid-workout, a logged set is queued here instead of lost, then
// replayed in order once connectivity returns. Replays are safe because every
// queued row carries a client-generated id, so re-ordering or an occasional
// double-send can't corrupt state (reads dedupe by id).

const STORE_KEY = "gama.outbox";

// Append-only tabs we're willing to queue. Deliberately excludes
// upsert/replace/delete paths, which are riskier to replay and aren't the
// in-gym hot path.
export const QUEUEABLE = new Set(["sets", "sessions", "sessionFeedback"]);

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(items) {
  if (items.length) localStorage.setItem(STORE_KEY, JSON.stringify(items));
  else localStorage.removeItem(STORE_KEY);
}

// values: 2D array of row arrays already in the tab's column order.
export function enqueue(key, values) {
  const items = read();
  items.push({ key, values, ts: Date.now() });
  write(items);
}

export function pendingCount() {
  return read().length;
}

// Queued rows for one tab, flattened to row arrays (for read-time merging).
export function peekRows(key) {
  const out = [];
  for (const item of read()) {
    if (item.key !== key) continue;
    for (const row of item.values) out.push(row);
  }
  return out;
}

let draining = false;

// drain(send): send is async (key, values) => Promise that throws on failure.
// Processes in order, persisting after each success, and stops at the first
// failure so nothing is lost and ordering holds. Re-reads each iteration so a
// concurrent enqueue (user logs another set mid-drain) is handled safely.
export async function drain(send) {
  if (draining) return { sent: 0, remaining: pendingCount() };
  draining = true;
  let sent = 0;
  try {
    while (true) {
      const items = read();
      if (!items.length) break;
      const next = items[0];
      await send(next.key, next.values); // throws → stop, keep remaining
      const after = read();
      after.shift();
      write(after);
      sent++;
    }
  } finally {
    draining = false;
  }
  return { sent, remaining: pendingCount() };
}

export function clear() {
  write([]);
}
