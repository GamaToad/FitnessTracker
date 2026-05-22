// Tiny DOM helpers + global toast.

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

let toastTimer = 0;
export function toast(msg, kind = "") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast show " + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = "toast " + kind), 2200);
}

export function fmtDate(s) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

// Small async-with-loading wrapper that shows the toast on error.
export async function run(promise, { ok, fail = "Something went wrong" } = {}) {
  try {
    const result = await promise;
    if (ok) toast(ok, "ok");
    return result;
  } catch (e) {
    console.error(e);
    const msg = e?.result?.error?.message || e?.message || fail;
    toast(msg, "bad");
    throw e;
  }
}
