import { el, formatMuscle, fmtDate, isoToday } from "../ui.js";
import {
  lookupExercise,
  exerciseSecondary,
  EXERCISE_SUBSTITUTES,
} from "../rp.js";
import { listCustomExercises, listSets, weeklyVolumeByExercise } from "../data.js";
import { mondayOf } from "../goals.js";

function titleCase(s) {
  return (s || "").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function render(container, name) {
  const decoded = name || "";

  let ex = lookupExercise(decoded);
  let isCustom = false;
  if (!ex) {
    try {
      const customs = await listCustomExercises();
      const c = customs.find(
        (c) => (c.name || "").toLowerCase() === decoded.toLowerCase(),
      );
      if (c) {
        ex = {
          name: c.name,
          group: c.group,
          equipment: c.equipment || "",
          secondary: [],
        };
        isCustom = true;
      }
    } catch {}
  }

  const root = el("div", { class: "exercise-detail-view" });
  container.append(root);

  root.append(
    el("div", { class: "section-title" },
      el("a", { class: "btn small ghost", href: "#/exercises" }, "← Exercises"),
    ),
  );

  if (!ex) {
    root.append(
      el("div", { class: "card" },
        el("h2", {}, "Exercise not found"),
        el("p", { class: "muted" }, `"${decoded}" isn't in the library.`),
      ),
    );
    return;
  }

  root.append(
    el("div", { class: "card exercise-detail-hero" },
      el("h1", { class: "exercise-detail-name" }, ex.name),
      el("div", { class: "exercise-detail-meta" },
        el("span", { class: "primary-pill primary-pill-lg" }, formatMuscle(ex.group || "")),
        ex.equipment ? el("span", { class: "equipment-pill" }, titleCase(ex.equipment)) : null,
        isCustom ? el("span", { class: "custom-pill" }, "Custom") : null,
      ),
    ),
  );

  const sec = exerciseSecondary(ex.name);
  root.append(
    el("section", { class: "card" },
      el("h3", {}, "Secondary muscles"),
      sec.length
        ? el("ul", { class: "exercises-secondary-list" }, ...sec.map((s) =>
            el("li", { class: "exercises-secondary-row" },
              el("span", { class: "secondary-row-name" }, formatMuscle(s.group)),
              el("span", { class: "secondary-row-fraction" }, String(s.fraction)),
            ),
          ))
        : el("p", { class: "muted" }, isCustom
          ? "Custom exercises don't have secondary fractions defined."
          : "No secondary muscles credited."),
      sec.length ? el("p", { class: "muted small fraction-legend" },
        "Fraction = volume credit per set. 0.75+ = near-primary; 0.5 = major; 0.25 = moderate.",
      ) : null,
    ),
  );

  const subs = EXERCISE_SUBSTITUTES[ex.name] || [];
  if (subs.length) {
    root.append(
      el("section", { class: "card" },
        el("h3", {}, "Substitutes"),
        el("div", { class: "exercises-substitutes" }, ...subs.map((s) =>
          el("a", { class: "filter-chip", href: `#/exercises/${encodeURIComponent(s)}` }, s),
        )),
      ),
    );
  }

  // Volume attribution: how much of this week's volume on each muscle this
  // exercise has driven so far. Surfaces compound carryover ("Bench is already
  // 40% of your Triceps this week") at the point the user picks substitutes.
  try {
    const todayMon = mondayOf(isoToday());
    const weekEndDt = new Date(todayMon + "T00:00:00"); weekEndDt.setDate(weekEndDt.getDate() + 6);
    const weekEnd = weekEndDt.toISOString().slice(0, 10);
    const byMuscle = await weeklyVolumeByExercise({ dateFrom: todayMon, dateTo: weekEnd });
    const rows = [];
    for (const [group, list] of Object.entries(byMuscle)) {
      const mine = list.find((x) => x.exercise === ex.name);
      if (!mine) continue;
      const total = list.reduce((s, x) => s + x.direct + x.indirect, 0);
      const v = mine.direct + mine.indirect;
      if (!total || !v) continue;
      rows.push({ group, share: v / total, sets: v, total, direct: mine.direct });
    }
    rows.sort((a, b) => b.share - a.share);
    if (rows.length) {
      root.append(
        el("section", { class: "card" },
          el("h3", {}, "Drives this week"),
          el("p", { class: "muted small" }, "How much of each muscle's weekly volume came from this exercise so far this week."),
          ...rows.map((r) =>
            el("div", { style: { marginTop: "0.4rem" } },
              el("div", { class: "row", style: { justifyContent: "space-between" } },
                el("strong", {}, formatMuscle(r.group)),
                el("span", { class: "muted small" },
                  `${Math.round(r.share * 100)}% · ${r.sets % 1 ? r.sets.toFixed(1) : r.sets}/${r.total % 1 ? r.total.toFixed(1) : r.total} sets`),
              ),
              el("div", { style: { height: "6px", background: "var(--panel-2)", borderRadius: "3px", overflow: "hidden", marginTop: "0.2rem" } },
                el("div", { style: { width: Math.round(r.share * 100) + "%", height: "100%", background: r.direct > 0 ? "var(--accent)" : "var(--ok)" } }),
              ),
            )),
        ),
      );
    }
  } catch {
    // Skip silently if sets aren't available.
  }

  // Recent personal sets, if any are logged.
  try {
    const all = await listSets();
    const mine = all
      .filter((s) => s.exercise === ex.name && s.setType !== "warmup")
      .sort((a, b) =>
        b.date.localeCompare(a.date) || (+b.setNumber || 0) - (+a.setNumber || 0),
      )
      .slice(0, 5);
    if (mine.length) {
      root.append(
        el("section", { class: "card" },
          el("h3", {}, "Recent sets"),
          el("ul", { class: "exercises-recent" }, ...mine.map((s) => {
            const rir = s.rir != null && s.rir !== "" ? ` · RIR ${s.rir}` : "";
            return el("li", {},
              el("span", { class: "muted small" }, fmtDate(s.date)),
              " ",
              `${s.weight} × ${s.reps}${rir}`,
            );
          })),
        ),
      );
    }
  } catch {
    // Skip silently if sets aren't available.
  }
}
