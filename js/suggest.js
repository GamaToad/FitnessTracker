// Freeform helpers: exercise suggestions per muscle group, and per-session
// coverage zones. Pure / Node-testable.

// For each muscle group, the library entries targeting it, ranked by a blend
// of the user's past usage (freqMap: exerciseName -> count) and the engine's
// per-exercise growthScore (growthMap: exerciseName -> 0..1). Without a
// growthMap the ranking falls back to pure frequency + library order. Names in
// `exclude` are dropped; the result is capped at `perGroup`.
export function suggestForGroups(groups, exerciseLib, freqMap = {}, { perGroup = 3, exclude = [], growthMap = null } = {}) {
  const excludeSet = new Set(exclude);
  const order = new Map(exerciseLib.map((e, i) => [e.name, i]));
  const scoreOf = (name) => {
    const f = freqMap[name] || 0;
    if (!growthMap) return f;
    const g = growthMap[name];
    // Boost by up to 10 "synthetic uses" worth of points when growth data
    // exists, so a fast-growing lift beats a slightly-more-frequent one but
    // a much-more-frequent lift still wins on staple status.
    return f + (g == null ? 0 : g * 10);
  };
  return groups.map((group) => {
    const candidates = exerciseLib
      .filter((e) => e.group === group && !excludeSet.has(e.name))
      .sort((a, b) => scoreOf(b.name) - scoreOf(a.name) || order.get(a.name) - order.get(b.name))
      .slice(0, perGroup);
    return { group, exercises: candidates };
  });
}

// Classify a per-session working-set count against a [lo, hi] target window.
export function sessionZone(sets, range) {
  const [lo, hi] = range || [3, 8];
  if (sets < lo) return "under";
  if (sets > hi) return "over";
  return "target";
}
