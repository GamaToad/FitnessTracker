// Tiny hash router. Routes are registered as {pattern, handler}.
// Pattern supports :params, e.g. "/meso/:id".

const routes = [];
let renderHook = null;

export function route(pattern, handler) {
  const keys = [];
  const re = new RegExp(
    "^" +
      pattern
        .replace(/\//g, "\\/")
        .replace(/:([a-zA-Z]+)/g, (_, k) => {
          keys.push(k);
          return "([^/]+)";
        }) +
      "$",
  );
  routes.push({ re, keys, handler });
}

export function onRender(cb) {
  renderHook = cb;
}

export function navigate(hash) {
  if (location.hash === hash) dispatch();
  else location.hash = hash;
}

export function currentHash() {
  return location.hash || "#/";
}

export function dispatch() {
  const raw = currentHash().replace(/^#/, "") || "/";
  for (const r of routes) {
    const m = raw.match(r.re);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      if (renderHook) renderHook(r.handler, params);
      else r.handler(params);
      return;
    }
  }
  // Fallback to first route.
  if (routes[0] && renderHook) renderHook(routes[0].handler, {});
}

window.addEventListener("hashchange", dispatch);
