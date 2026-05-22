# RP Tracker

A static, no-build fitness tracking web app modeled on **Renaissance
Periodization (RP) Strength** principles. Plans hypertrophy mesocycles that
progress weekly volume from **MEV → MRV**, logs each set with weight, reps,
and **RIR (reps in reserve)**, and stores everything in a Google Sheet you
own. Deploys straight to GitHub Pages.

## What's in it

- **Mesocycle planner.** 4–7 week blocks ending in a deload. Pick your
  training days and the exercises on each, and the app auto-generates a
  per-muscle-group weekly set progression from MEV to MRV plus a target RIR
  per week (3 → 2 → 1 → 0 → deload).
- **RIR-based workout logger.** Big, thumb-friendly inputs for weight, reps,
  and RIR. Shows your previous session's top set and suggests the next
  weight using a small RIR-aware step.
- **Volume landmarks per muscle group.** Pre-seeded with RP defaults for
  MV / MEV / MAV-lo / MAV-hi / MRV. Fully editable in Settings.
- **Your data, your sheet.** First sign-in creates a Google Sheet titled
  *RP Tracker Data* in your Drive with one tab per table. You can open it
  in Sheets at any time.

## Stack

Vanilla HTML + ES modules + CSS. No build step. No node_modules. Two
Google scripts loaded from CDN:

- `accounts.google.com/gsi/client` — Google Identity Services
- `apis.google.com/js/api.js` — gapi client for the Sheets v4 REST API

That's it.

## File layout

```
index.html
css/styles.css
js/
  app.js          # entry: wires routes + auth subscriber
  router.js       # tiny hash router
  config.js       # OAuth client ID, scopes
  auth.js         # GIS token-flow sign in / sign out
  sheets.js       # Sheets v4 wrapper (create, read, append, upsert)
  data.js         # higher-level data ops (mesos, plan, sets)
  rp.js           # RP volume landmarks + progression math
  ui.js           # dom helpers + toast
  views/
    dashboard.js
    meso.js
    workout.js
    settings.js
.github/workflows/pages.yml
.nojekyll
```

## Setup

### 1. Create a Google Cloud project & OAuth client

1. Open <https://console.cloud.google.com/> and create a new project.
2. **APIs & Services → Library**: enable **Google Sheets API** and
   **Google Drive API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External** (Testing mode is fine while it's just you).
   - Add yourself under "Test users".
   - Scopes: `auth/spreadsheets` and `auth/drive.file`.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins**:
     - `https://<your-github-username>.github.io`
     - `http://localhost:8000` (for local testing)
   - Save and copy the **Client ID**.

### 2. Deploy to GitHub Pages

The repo includes `.github/workflows/pages.yml`, which deploys the root of
`main` on every push.

1. Push to `main`.
2. In repo **Settings → Pages**, set **Source = GitHub Actions**.
3. After the first workflow run, your app is live at
   `https://<your-github-username>.github.io/<repo-name>/`.

> If you'd rather skip Actions, you can also set Pages **Source = Deploy
> from a branch** → `main` / `/ (root)`.

### 3. First-run configuration in the app

1. Open the deployed URL.
2. Click **Setup needed** (top-right) or the **Settings** tab.
3. Paste the OAuth **Client ID** from step 1 → **Save & reload**.
4. Click **Sign in with Google** (top-right). Grant the requested scopes.
5. Back in **Settings → Data sheet**, click **Create new workbook**. The
   app creates "RP Tracker Data" in your Drive and links it.
6. Tap **Meso → + New mesocycle** to plan your first block.

## Local development

No build step. Serve the directory over HTTP (so ES modules load):

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

Make sure `http://localhost:8000` is in your OAuth client's authorized
JavaScript origins.

## RP methodology used

- **Volume landmarks** (working sets / muscle / week):
  MV (Maintenance) · MEV (Minimum Effective) · MAV (Maximum Adaptive,
  a range) · MRV (Maximum Recoverable).
- **Weekly progression** starts at MEV in week 1 and climbs linearly to
  MRV in the last accumulation week. The final week is a **deload** at
  ~50% of week-1 sets.
- **RIR progression**: 3 → 2 → 1 → 0 across accumulation weeks; deload at
  4 RIR.
- **Per-day set distribution**: weekly volume per muscle group is split
  proportionally across the days that train it, then distributed across
  the exercises within each day.
- **Overload suggestion**: derived from your previous session's top set —
  if you beat your target RIR, the next session bumps weight ~1.5–3%;
  if you missed reps, it holds.

These are defaults — every lifter should tune them as they learn their own
recovery.

## Privacy

- The app is a static site. There is no server we control.
- OAuth uses the GIS token flow; the access token lives in memory and is
  revoked on sign-out.
- The Sheets and Drive scopes only let the app touch the workbook it
  created (via `drive.file`). It cannot list or read anything else in your
  Drive.

## Disclaimer

Not affiliated with Renaissance Periodization. RP, MEV, MAV, MRV, and RIR
are widely used training concepts; this app is an unofficial implementation
of those ideas for personal use.
