import { el, isoToday, run, toast } from "../ui.js";
import * as data from "../data.js";
import { distributeSets, suggestWeight } from "../rp.js";

export async function render(container) {
  const active = await data.getActiveMesocycle();
  if (!active) {
    container.append(
      el("div", { class: "banner" },
        "No active mesocycle. ",
        el("a", { href: "#/meso/new" }, "Plan one"),
        " first.",
      ),
    );
    return;
  }

  const template = await data.getTemplate(active.id);
  const weeks = +active.weeks;

  const start = new Date(active.startDate);
  const daysIn = Math.floor((Date.now() - start.getTime()) / 86400000);
  const defaultWeek = Math.min(weeks, Math.max(1, Math.floor(daysIn / 7) + 1));

  let chosenWeek = defaultWeek;
  let chosenDay = template[0]?.index ?? 0;

  const root = el("div", {});
  container.append(root);

  const session = {
    startTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
    endTime: "",
    location: localStorage.getItem("rp.lastLocation") || "",
    totalRPE: "",
    leafStatus: "No",
    notes: "",
  };

  async function loadExistingSession() {
    const existing = await data.getSession(active.id, chosenWeek, chosenDay, isoToday());
    if (existing) {
      session.startTime = existing.startTime || session.startTime;
      session.endTime = existing.endTime || "";
      session.location = existing.location || session.location;
      session.totalRPE = existing.totalRPE || "";
      session.leafStatus = existing.leafStatus || "No";
      session.notes = existing.notes || "";
    }
  }

  async function saveSessionMeta() {
    if (!session.endTime) {
      session.endTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    if (session.location) localStorage.setItem("rp.lastLocation", session.location);
    await run(
      data.saveSession({
        mesoId: active.id,
        week: chosenWeek,
        dayIndex: chosenDay,
        date: isoToday(),
        ...session,
      }),
      { ok: "Session saved" },
    );
  }

  async function rerender() {
    await loadExistingSession();
    root.replaceChildren();
    root.append(
      el("h1", {}, "Train"),
      el("div", { class: "muted" }, active.name),
      el("section", { class: "card" },
        el("div", { class: "field-row" },
          el("div", { class: "field" },
            el("label", {}, "Week"),
            el("select", {
              onchange: (e) => { chosenWeek = +e.target.value; rerender(); },
            },
              ...Array.from({ length: weeks }, (_, i) =>
                el("option", {
                  value: i + 1, selected: chosenWeek === i + 1 ? "" : null,
                }, `Week ${i + 1}${i === weeks - 1 ? " (deload)" : ""}`),
              ),
            ),
          ),
          el("div", { class: "field" },
            el("label", {}, "Day"),
            el("select", {
              onchange: (e) => { chosenDay = +e.target.value; rerender(); },
            },
              ...template.map((d) =>
                el("option", { value: d.index, selected: chosenDay === d.index ? "" : null },
                  d.name)),
            ),
          ),
        ),
      ),
    );

    // Session metadata
    root.append(
      el("section", { class: "card session-meta" },
        el("h3", {}, "Session info"),
        el("div", { class: "field-row four" },
          el("div", { class: "field" },
            el("label", {}, "Start time"),
            el("input", {
              type: "time", value: session.startTime,
              oninput: (e) => (session.startTime = e.target.value),
            }),
          ),
          el("div", { class: "field" },
            el("label", {}, "End time"),
            el("input", {
              type: "time", value: session.endTime,
              placeholder: "auto on save",
              oninput: (e) => (session.endTime = e.target.value),
            }),
          ),
          el("div", { class: "field" },
            el("label", {}, "Location"),
            el("input", {
              type: "text", value: session.location,
              placeholder: "e.g. Home gym",
              oninput: (e) => (session.location = e.target.value),
            }),
          ),
          el("div", { class: "field" },
            el("label", {}, "Total RPE"),
            el("select", {
              onchange: (e) => (session.totalRPE = e.target.value),
            },
              el("option", { value: "", selected: !session.totalRPE ? "" : null }, "—"),
              ...[1,2,3,4,5,6,7,8,9,10].map((n) =>
                el("option", { value: n, selected: String(session.totalRPE) === String(n) ? "" : null }, String(n))),
            ),
          ),
        ),
        el("div", { class: "field-row" },
          el("div", { class: "field" },
            el("label", {}, "Leaf status"),
            el("select", {
              onchange: (e) => (session.leafStatus = e.target.value),
            },
              el("option", { value: "No", selected: session.leafStatus !== "Yes" ? "" : null }, "No"),
              el("option", { value: "Yes", selected: session.leafStatus === "Yes" ? "" : null }, "Yes"),
            ),
          ),
          el("div", { class: "field" },
            el("label", {}, "Session notes"),
            el("input", {
              type: "text", value: session.notes,
              placeholder: "Optional",
              oninput: (e) => (session.notes = e.target.value),
            }),
          ),
        ),
        el("button", { class: "btn primary small", onclick: saveSessionMeta }, "Save session info"),
      ),
    );

    const day = template.find((d) => d.index === chosenDay);
    if (!day) return;
    renderSession(root, active, chosenWeek, day);
  }

  rerender();
}

async function renderSession(container, meso, week, day) {
  const plan = await data.getWeekPlan(meso.id);
  const weekPlan = plan.filter((p) => p.week === week);

  // Distribute weekly target sets across exercises that share a muscle group.
  const byGroup = {};
  for (const ex of day.exercises) {
    (byGroup[ex.muscleGroup] ||= []).push(ex);
  }
  const allDays = await data.getTemplate(meso.id);

  // For each muscle group, figure out per-exercise set targets for THIS day.
  // The weekly target gets shared across all days that train the group,
  // proportional to how many exercises each day has for it.
  const dayShareForExercise = new Map(); // exerciseName -> sets target
  for (const [group, exs] of Object.entries(byGroup)) {
    const weeklyTarget = weekPlan.find((p) => p.muscleGroup === group)?.targetSets || 0;
    // Count total exercises for this group across the week.
    const totalAcrossWeek = allDays.reduce(
      (n, d) => n + d.exercises.filter((e) => e.muscleGroup === group).length,
      0,
    );
    const thisDayCount = exs.length;
    const thisDayShare = totalAcrossWeek
      ? Math.round((weeklyTarget * thisDayCount) / totalAcrossWeek)
      : exs.length * 3;
    const perEx = distributeSets(thisDayShare, exs.length);
    exs.forEach((e, i) => dayShareForExercise.set(e.exercise + "|" + e.index, perEx[i]));
  }

  const targetRIRForGroup = (g) =>
    weekPlan.find((p) => p.muscleGroup === g)?.targetRIR ?? 2;
  const isDeload = weekPlan.some((p) => p.isDeload);

  container.append(
    el("h2", { style: { marginTop: "1.2rem" } },
      day.name,
      isDeload && el("span", { class: "muted small" }, " · deload"),
    ),
  );

  for (const ex of day.exercises) {
    const setTarget = dayShareForExercise.get(ex.exercise + "|" + ex.index) || 0;
    const block = await renderExercise(meso, week, day, ex, setTarget, targetRIRForGroup(ex.muscleGroup));
    container.append(block);
  }
}

async function renderExercise(meso, week, day, ex, setTarget, targetRIR) {
  const [logged, prev] = await Promise.all([
    data.sessionSets(meso.id, week, day.index, ex.exercise),
    data.previousTopSet(meso.id, day.index, ex.exercise, week),
  ]);

  const suggested = prev
    ? suggestWeight(prev, /*targetReps*/ Math.max(6, +prev.reps || 8), targetRIR)
    : null;

  const block = el("div", { class: "exercise-block" });
  block.append(
    el("div", { class: "exercise-head" },
      el("div", {},
        el("h3", {}, ex.exercise),
        el("div", { class: "exercise-meta" },
          el("span", { class: "pill" }, ex.muscleGroup),
          setTarget ? el("span", { class: "pill" }, `${setTarget} working sets`) : null,
          el("span", { class: "pill" }, `${targetRIR} RIR`),
        ),
      ),
    ),
  );

  if (prev) {
    block.append(
      el("div", { class: "muted small", style: { marginBottom: "0.5rem" } },
        `Last session: ${prev.weight} × ${prev.reps} @ ${prev.rir} RIR`,
        suggested ? ` · suggested ${suggested}` : "",
      ),
    );
  } else {
    block.append(
      el("div", { class: "muted small", style: { marginBottom: "0.5rem" } },
        "First time logging this exercise in this meso."),
    );
  }

  const setsContainer = el("div", {});
  block.append(setsContainer);

  const drafts = [];
  function renderSets() {
    setsContainer.replaceChildren();

    // Header
    setsContainer.append(
      el("div", { class: "set-row", style: { color: "var(--muted)", fontSize: "0.75rem" } },
        el("div", {}, "#"),
        el("div", {}, "Weight"),
        el("div", {}, "Reps"),
        el("div", {}, "RIR"),
        el("div", {}, ""),
      ),
    );

    // Existing logged sets (locked)
    logged.forEach((s, i) => {
      setsContainer.append(
        el("div", { class: "set-row set-done" },
          el("div", { class: "idx" }, i + 1),
          el("div", {}, s.weight),
          el("div", {}, s.reps),
          el("div", {}, s.rir),
          el("span", { class: "muted small" }, "✓"),
        ),
      );
    });

    // Drafts (editable, unsaved)
    drafts.forEach((d, i) => {
      const setNo = logged.length + i + 1;
      setsContainer.append(
        el("div", { class: "set-row" },
          el("div", { class: "idx" }, setNo),
          el("input", {
            type: "number", inputmode: "decimal", step: "0.5",
            placeholder: suggested || "wt",
            value: d.weight,
            oninput: (e) => (d.weight = e.target.value),
          }),
          el("input", {
            type: "number", inputmode: "numeric",
            placeholder: prev?.reps || "reps",
            value: d.reps,
            oninput: (e) => (d.reps = e.target.value),
          }),
          el("input", {
            type: "number", inputmode: "numeric", min: "0", max: "10",
            placeholder: targetRIR,
            value: d.rir,
            oninput: (e) => (d.rir = e.target.value),
          }),
          el("button", { class: "btn small primary", onclick: () => saveDraft(i) }, "Log"),
        ),
      );
    });

    // Action row
    const remaining = Math.max(0, setTarget - logged.length - drafts.length);
    setsContainer.append(
      el("div", { class: "row", style: { marginTop: "0.6rem", justifyContent: "space-between" } },
        el("button", { class: "btn small", onclick: addDraft }, "+ Add set"),
        el("span", { class: "muted small" },
          remaining > 0 ? `${remaining} target set${remaining === 1 ? "" : "s"} remaining` : "Target met",
        ),
      ),
    );
  }

  function addDraft() {
    drafts.push({
      weight: suggested || prev?.weight || "",
      reps: prev?.reps || "",
      rir: targetRIR,
    });
    renderSets();
  }

  async function saveDraft(idx) {
    const d = drafts[idx];
    if (!d.weight || !d.reps) return toast("Need weight and reps", "bad");
    const saved = await run(
      data.logSet({
        mesoId: meso.id,
        week,
        dayIndex: day.index,
        exercise: ex.exercise,
        muscleGroup: ex.muscleGroup,
        setNumber: logged.length + idx + 1,
        weight: +d.weight,
        reps: +d.reps,
        rir: +d.rir,
        date: isoToday(),
      }),
      { ok: "Set logged" },
    );
    logged.push(saved);
    drafts.splice(idx, 1);
    renderSets();
  }

  // Auto-seed first draft if no sets yet.
  if (!logged.length) addDraft();
  else renderSets();

  return block;
}
