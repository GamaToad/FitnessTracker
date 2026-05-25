// Shared rest-timer controller. A single sticky bottom bar counts down between
// sets. Pure DOM + WebAudio; no assets. Gated on config.restTimerEnabled.
import { el, toast } from "./ui.js";
import { config } from "./config.js";

let intervalId = null;
let remaining = 0;
let barEl = null;
let timeEl = null;
let notifyAsked = false;

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = Math.max(0, s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function ensureBar() {
  if (barEl) return barEl;
  timeEl = el("span", { class: "rest-timer-time" }, "0:00");
  barEl = el("div", { class: "rest-timer-bar", role: "timer", "aria-live": "polite" },
    el("span", { class: "rest-timer-label" }, "Rest"),
    timeEl,
    el("div", { class: "rest-timer-actions" },
      el("button", { type: "button", class: "btn small ghost", onclick: () => adjust(-30) }, "−30s"),
      el("button", { type: "button", class: "btn small ghost", onclick: () => adjust(30) }, "+30s"),
      el("button", { type: "button", class: "btn small", onclick: stopRest }, "Skip"),
    ),
  );
  document.body.append(barEl);
  return barEl;
}

function tick() {
  remaining -= 1;
  if (remaining <= 0) { finish(); return; }
  if (timeEl) timeEl.textContent = fmt(remaining);
}

export function startRest(seconds) {
  if (!config.restTimerEnabled) return;
  const s = Math.round(Number(seconds));
  if (!Number.isFinite(s) || s <= 0) return;
  ensureBar();
  barEl.classList.add("show");
  remaining = s;
  timeEl.textContent = fmt(remaining);
  clearInterval(intervalId);
  intervalId = setInterval(tick, 1000);
  requestNotifyPermission();
}

function adjust(delta) {
  if (!intervalId) return;
  remaining = Math.max(1, remaining + delta);
  if (timeEl) timeEl.textContent = fmt(remaining);
}

export function stopRest() {
  clearInterval(intervalId);
  intervalId = null;
  if (barEl) barEl.classList.remove("show");
}

function finish() {
  stopRest();
  if (config.restTimerSound) beep();
  notify("Rest complete", "Time for your next set.");
  toast("Rest complete", "ok");
}

function requestNotifyPermission() {
  if (notifyAsked) return;
  notifyAsked = true;
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  } catch { /* ignore */ }
}

function notify(title, body) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch { /* ignore */ }
}

// Short sine blip via WebAudio so we ship no audio asset.
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.42);
    osc.onended = () => ctx.close();
  } catch { /* ignore */ }
}
