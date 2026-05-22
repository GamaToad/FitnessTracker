import { el, fmtDate } from "../ui.js";
import * as data from "../data.js";
import * as sheets from "../sheets.js";

export async function render(container, { signedIn }) {
  if (!signedIn) {
    const tpl = document.getElementById("tpl-signed-out");
    container.append(tpl.content.cloneNode(true));
    return;
  }

  if (!sheets.getSpreadsheetId()) {
    container.append(
      el("div", { class: "banner" },
        "No data sheet linked yet. ",
        el("a", { href: "#/settings" }, "Open settings"),
        " to create or pick one.",
      ),
    );
    return;
  }

  const [mesos, activeMeso] = await Promise.all([
    data.listMesocycles(),
    data.getActiveMesocycle(),
  ]);

  // Active meso summary.
  if (activeMeso) {
    const start = new Date(activeMeso.startDate);
    const days = Math.floor((Date.now() - start.getTime()) / 86400000);
    const week = Math.min(+activeMeso.weeks, Math.max(1, Math.floor(days / 7) + 1));
    const isDeload = week === +activeMeso.weeks;

    const weekVol = await data.weeklyVolume(activeMeso.id, week);
    const plan = await data.getWeekPlan(activeMeso.id);
    const planThisWeek = plan.filter((p) => p.week === week);
    const volumeRows = planThisWeek.map((p) => {
      const done = weekVol[p.muscleGroup] || 0;
      const pct = Math.min(100, Math.round((done / Math.max(1, p.targetSets)) * 100));
      return el("tr", {},
        el("td", { class: "muscle" }, p.muscleGroup),
        el("td", {}, `${done} / ${p.targetSets}`),
        el("td", {}, `${p.targetRIR} RIR`),
        el("td", {},
          el("div", {
            style: {
              background: "var(--panel-2)",
              borderRadius: "999px",
              overflow: "hidden",
              height: "8px",
            },
          },
            el("div", {
              style: {
                background:
                  done >= p.targetSets ? "var(--ok)" :
                  done >= p.targetSets * 0.5 ? "var(--warn)" : "var(--accent)",
                width: pct + "%",
                height: "100%",
              },
            }),
          ),
        ),
      );
    });

    container.append(
      el("section", { class: "card" },
        el("div", { class: "card-row" },
          el("div", {},
            el("h2", {}, activeMeso.name),
            el("div", { class: "muted small" },
              `Week ${week} of ${activeMeso.weeks}` + (isDeload ? " · deload" : "") +
              ` · started ${fmtDate(activeMeso.startDate)}`,
            ),
          ),
          el("a", { class: "btn primary", href: "#/workout" }, "Train"),
        ),
        el("h3", { style: { marginTop: "1rem" } }, "Volume this week"),
        el("table", { class: "meso-grid" },
          el("thead", {},
            el("tr", {},
              el("th", { style: { textAlign: "left" } }, "Muscle"),
              el("th", {}, "Sets done"),
              el("th", {}, "Target RIR"),
              el("th", {}, "Progress"),
            ),
          ),
          el("tbody", {}, ...volumeRows),
        ),
      ),
    );
  } else {
    container.append(
      el("div", { class: "banner ok" },
        "No active mesocycle. ",
        el("a", { href: "#/meso/new" }, "Plan one now"),
        ".",
      ),
    );
  }

  // All mesos list
  container.append(
    el("div", { class: "section-title" },
      el("h2", {}, "Mesocycles"),
      el("a", { class: "btn small", href: "#/meso/new" }, "+ New"),
    ),
  );

  if (!mesos.length) {
    container.append(el("p", { class: "muted" }, "You haven't planned a mesocycle yet."));
  } else {
    for (const m of mesos.slice().reverse()) {
      container.append(
        el("a", { class: "card", href: `#/meso/${m.id}`, style: { display: "block" } },
          el("div", { class: "card-row" },
            el("div", {},
              el("strong", {}, m.name),
              el("div", { class: "muted small" },
                `${m.weeks} weeks · ${fmtDate(m.startDate)} · ${m.status}`,
              ),
            ),
            el("span", { class: "muted" }, "›"),
          ),
        ),
      );
    }
  }
}
