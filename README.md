# HL Local Preview

![Python](https://img.shields.io/badge/python-3.10+-3776AB?logo=python&logoColor=white)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)
![CSS](https://img.shields.io/badge/CSS-Stylus-00a78e)
![JS](https://img.shields.io/badge/JS-Tampermonkey-00485b)
![Server](https://img.shields.io/badge/server-localhost%3A5500-orange)
![Node.js](https://img.shields.io/badge/node.js-18+-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/UI-React-61DAFB?logo=react&logoColor=black)
[![GitHub](https://img.shields.io/badge/GitHub-hl--local--preview-181717?logo=github)](https://github.com/caverill/hl-local-preview)

Local development toolkit for Higher Logic CMS theme customization. Edit CSS and JavaScript in your editor, preview changes on your dev site, and upload to the CMS when ready.

**CSS** is injected via [Stylus](https://github.com/openstyles/stylus) with live reload. **JavaScript** is injected via [Tampermonkey](https://www.tampermonkey.net/) with auto refresh on save. The **Web UI** is the recommended way to run everything — start the watcher, track status, install browser scripts, and open source files from one control panel. A CLI watcher is also available if you prefer the terminal.

## Screenshots

### Preview tab

**Light mode** — watcher controls, status, quick links, and the activity log with filters.

![Preview tab — light mode](https://github.com/caverill/hl-local-preview/blob/main/screenshots/main.png?raw=true)

**Dark mode**

![Preview tab — dark mode](https://github.com/caverill/hl-local-preview/blob/main/screenshots/dark-mode.png?raw=true)

### Setup

Configure your project folder, dev site URL, and CSS match mode. Saving opens Diagnostics to finish the ready check.

![Setup modal](https://github.com/caverill/hl-local-preview/blob/main/screenshots/settings.png?raw=true)

### Diagnostics

Preview file cards (click to open in Cursor or VS Code), ready check, and health checks.

![Diagnostics tab](https://github.com/caverill/hl-local-preview/blob/main/screenshots/diagnostics.png?raw=true)

### How to use

Step-by-step guide with videos, available from the top bar.

![How to use guide](https://github.com/caverill/hl-local-preview/blob/main/screenshots/howto.png?raw=true)

## Who this is for

Higher Logic CMS developers who want to develop and test custom CSS and JavaScript locally before publishing to a CMS site. This reduces the repetitive edit → upload → save → refresh cycle of working directly in the CMS editor.

You should already have:

- A sandbox or dev site URL
- Access to the CMS theme editor for `main/styles.css` and `main/main.js`
- Python 3.10+
- [Stylus](https://github.com/openstyles/stylus) and [Tampermonkey](https://www.tampermonkey.net/) in your browser
- Node.js 18+ (for the Web UI)

This is **not** a deployment tool, CMS plugin, or end-user install. It runs on your machine for local development only.

---

## Quick start — Web UI

### 1. Install and launch

From the repo root:

```bash
pip install -r requirements.txt
python3 scripts/dev_desktop.py
```

On first run, `dev_desktop.py` runs `npm install` in `desktop/` if needed, then starts:

| Service | URL | Purpose |
|---------|-----|---------|
| Web UI | http://localhost:1420 | Control panel (opens automatically) |
| Python API | http://127.0.0.1:17890 | Watcher, setup, logs (localhost only) |
| Preview server | http://127.0.0.1:5500 | Serves generated CSS/JS to Stylus and Tampermonkey |

Press **Ctrl+C** in the terminal to stop everything.

### 2. Configure your project

See [Setup](#setup) in Screenshots.

1. Click **Setup** in the top bar.
2. Choose your **project folder** (Browse or paste a path). The UI detects Git repos and can switch to the repo root.
3. Set **SITE_URL** to your sandbox or dev site.
4. Pick a **CSS match mode** (`url-prefix` is the usual choice).
5. If required files are missing, click **Create project files** — this scaffolds `main/styles.css`, `main/main.js`, `.env.local`, and related files.
6. Click **Save**. Settings are written to `.env.local` in your project folder. The UI remembers your project path in `.hl-preview-settings.json` (repo root, gitignored).

After saving, the UI switches to **Diagnostics** so you can finish the ready check.

### 3. Get preview-ready

See [Diagnostics](#diagnostics) in Screenshots.

Work through the **Ready check** on the Diagnostics tab:

1. **Setup saved** — project folder, dev site URL, and match mode
2. **Project files** — `main/styles.css`, `main/main.js`, and watcher scripts
3. **Browser extensions** — install Stylus and Tampermonkey, then click **I've installed both extensions**
4. **Watcher running** — start **CSS Only**, **JS Only**, or **CSS & JS** from the sidebar
5. **Preview port live** — port `5500` must show **live** in Status
6. **Stylus script ready** — use **Stylus Install** in Quick Links (active when CSS watcher is running)
7. **Tampermonkey script ready** — use **Tampermonkey Install** in Quick Links (active when JS watcher is running)

Update `@match` in `tampermonkey-loader.user.js` if your sandbox URL changes.

### 4. Edit and preview

See [Preview tab](#preview-tab) in Screenshots.

1. Click a **Preview files** card on Diagnostics (or open `main/styles.css` / `main/main.js` in your editor directly) — cards open in **Cursor** or **VS Code** if installed.
2. Save your changes. The watcher rebuilds `preview/` and serves files on port `5500`.
3. **CSS** — Stylus live reload swaps styles without a page refresh (~1–2s).
4. **JS** — the Tampermonkey loader detects changes and reloads the page (~0.5s after save).
5. Watch saves and errors in the **Activity** log on the Preview tab.

When it looks right, copy from `main/styles.css` and `main/main.js` into the CMS theme editor. Never upload `preview/` files.

---

## Using the Web UI

The in-app **How to use** guide (top bar) walks through setup, installing scripts, and editing with short videos — see [How to use](#how-to-use) in Screenshots. The sections below describe every part of the UI.

### Top bar

| Control | What it does |
|---------|--------------|
| **Project** dropdown | Switch between recent project folders. Stop the watcher first. Use **Browse for folder in Setup…** to pick a new path. The folder icon opens the project in Finder/Explorer. |
| **Local Preview Repository** | This tool's GitHub repo |
| **How to use** | Step-by-step guide with videos — see [Screenshots](#how-to-use) |
| **Setup** | Reopen project configuration at any time — see [Screenshots](#setup) |

### Sidebar — Watcher

Start and control the file watcher:

| Button | Action |
|--------|--------|
| **CSS Only** | Watch `main/styles.css`, serve CSS preview |
| **JS Only** | Watch `main/main.js`, serve JS preview |
| **CSS & JS** | Watch both (default mode) |
| **Rebuild once** | Sync `preview/` once without starting the watcher (stop the watcher first) |
| **Restart** | Stop and restart the current watcher mode |
| **Stop** | Stop the watcher |

Watcher buttons are disabled until Setup is complete. Your last chosen mode is remembered for **Auto-start watcher** (see Preferences).

### Sidebar — Status

Live indicators for the current session:

| Row | Meaning |
|-----|---------|
| **Mode** | Current watcher mode, or **Stopped** |
| **Port** | Preview server on port `5500` — **live**, **starting**, **stale**, **wrong root**, or **closed** |
| **Last rebuild** | When preview files were last synced from your source files |

If the watcher is stopped but something else is holding port `5500`, a **Free port** button appears. Use it to release the port before starting again. The same recovery option appears on Diagnostics when the port is occupied by another process.

### Sidebar — Quick Links

Opens browser tabs for common tasks:

| Link | When active | Opens |
|------|-------------|-------|
| **Stylus Install** | CSS watcher running + port live | Stylus install URL for your generated CSS |
| **Tampermonkey Install** | JS watcher running | Tampermonkey loader install URL |
| **Dev Site** | Always (when `SITE_URL` is set) | Your sandbox/dev site |
| **GitHub Repository** | When the project has a Git remote | Remote URL from Git config |

Greyed-out links mean the watcher is not running in the required mode, or the preview port is not live yet.

### Sidebar — Preferences

Collapsible panel for appearance and launch options (saved in your browser). Toggle between light and dark theme — see [Preview tab](#preview-tab) in Screenshots.

- **Light / dark theme**
- **Font size** (+/−)
- **Auto-start watcher** — start your last watcher mode when the app opens
- **Desktop notifications** — alert when the window is in the background and the watcher reports activity

### Main panel — Preview tab

See [Preview tab](#preview-tab) in Screenshots.

**Activity log** — live output from the watcher (file updates, rebuilds, errors).

- Filter by **Errors**, **Commands**, **Updates**, or **Info** (Info is off by default to reduce noise)
- **Search** to find specific log lines
- **Clear** to reset the log
- Auto-scrolls to the latest entry; **Back to top** appears when you scroll up

### Main panel — Diagnostics tab

See [Diagnostics](#diagnostics) in Screenshots.

Three areas to verify everything is working:

**Preview files** — CSS and JS cards showing source paths and preview URLs. Click a card to open `main/styles.css` or `main/main.js` in Cursor or VS Code (pick from a menu if both are installed).

**Ready check** — checklist of setup steps with pass/fail/pending status. Includes direct links to install Stylus and Tampermonkey when extensions are not yet confirmed.

**Health checks** — Python dependency checks, config file presence, preview URL reachability, and Git detection. Click **pip install** to install missing Python packages.

If port `5500` is in use by another process, a warning banner offers **Free port** recovery.

### Switching projects

Use the **Project** dropdown in the top bar to jump between recent folders. You must **stop the watcher** before switching. The UI writes each project's settings to its own `.env.local`. Recent folders are tracked in `.hl-preview-settings.json`.

---

## Recommended workflow

A typical session from zero to live preview:

1. **Launch** — `python3 scripts/dev_desktop.py`
2. **Setup** — project folder, `SITE_URL`, match mode, create missing files, save
3. **Extensions** — install Stylus and Tampermonkey; confirm in Ready check
4. **Start watcher** — CSS & JS (or the mode you need)
5. **Install scripts** — Stylus Install and Tampermonkey Install from Quick Links
6. **Open dev site** — Dev Site link; enable **Live reload** in Stylus once
7. **Edit** — click Preview files cards or open source files in your editor
8. **Verify** — Activity log for rebuilds; Ready check all green
9. **Upload** — copy finished `main/` files into the CMS when done
10. **Stop** — Stop watcher and Ctrl+C the dev server when finished

---

## Project structure

```
hl-local-preview/
├── desktop/                         # Web UI (React + Vite)
│   └── src/                         # UI components and hooks
├── service/                         # Python API for the Web UI
│   ├── api.py                       # HTTP routes (localhost only)
│   ├── project.py                   # Project paths, .env.local, file scaffolding
│   └── watcher.py                   # Watcher process control
├── main/
│   ├── styles.css                   # Production CSS — edit this
│   └── main.js                      # Production JS — edit this
├── preview/                         # Generated files (gitignored)
├── scripts/
│   ├── dev_desktop.py               # Start Web UI + API
│   ├── watch.py                     # Unified watcher (css / js / both)
│   ├── watch_css.py                 # CSS-only shorthand
│   ├── watch_js.py                  # JS-only shorthand
│   └── preview_server.py            # Shared HTTP server on port 5500
├── tampermonkey-loader.user.js      # Install once in Tampermonkey
├── .env.local                       # Your local config (gitignored)
├── .hl-preview-settings.json        # Web UI project path (gitignored)
└── .env.local.example               # Config template
```

<details>
<summary>How it works</summary>

```
main/styles.css  →  watch.py  →  preview/cms-local-preview.user.css  →  :5500  →  Stylus  →  live site
main/main.js     →  watch.py  →  preview/js-local-preview.js         →  :5500  →  Tampermonkey loader  →  live site
       ↑                                    ↑                              ↑
   you edit here                  auto-generated; do not edit          built-in HTTP server
```

| | CSS | JS |
|---|-----|-----|
| Source file | `main/styles.css` | `main/main.js` |
| Generated preview | `preview/cms-local-preview.user.css` | `preview/js-local-preview.js` |
| Browser tool | Stylus | Tampermonkey + `tampermonkey-loader.user.js` |
| After saving | Live reload (no page refresh) | Auto refresh (full page reload) |
| One-time setup | Install style from Quick Links; enable **Live reload** | Install loader v1.2.0+; set `@match` to your sandbox URL |

### Live preview on save

Keep the watcher running and your dev site open. Both CSS and JS update when you save.

| | CSS (Stylus) | JS (Tampermonkey) |
|---|--------------|-------------------|
| How it updates | Stylus polls the preview URL and swaps injected CSS | Loader polls `preview/js-local-preview.js` and reloads the page |
| Typical delay | ~1–2s | ~0.5s after save (configurable) |
| Config | Enable **Live reload** in Stylus once | On by default — `JS_AUTO_REFRESH=true` in `.env.local` |
| Disable | Turn off Live reload in Stylus | `JS_AUTO_REFRESH=false` in `.env.local` |

**CSS:** Stylus needs HTTP (not `file://`). Reinstall the style when you change `SITE_URL` or matching rules.

**JS:** Write `main/main.js` exactly as you would upload to the CMS — typically `$(function () { ... })`. Filter the console for `hl-js-local-preview` to verify.

</details>

<details>
<summary>CLI alternative</summary>

If you prefer the terminal, the CLI runs the same watcher without the Web UI:

```bash
python3 scripts/watch.py           # both (default)
python3 scripts/watch.py css       # CSS only
python3 scripts/watch.py js        # JS only
python3 scripts/watch.py --once    # sync once, no file watching
python3 scripts/watch.py --no-open # skip opening browser tabs
```

Shorthand scripts: `watch_css.py` and `watch_js.py`.

| | Web UI | CLI |
|---|--------|-----|
| Start watcher | Sidebar buttons | Terminal command |
| Logs | Activity panel with filters | Terminal stdout |
| Config | Setup modal → `.env.local` | Edit `.env.local` manually |
| Open browser tabs | Quick Links | Auto-opens on start (use `--no-open` to skip) |
| Port recovery | Free port button in Status/Diagnostics | Kill process on port 5500 manually |
| Multi-project | Project dropdown + recent folders | Change directory or `--env` path |

Node.js is not required for CLI-only use.

</details>

<details>
<summary>Troubleshooting</summary>

### Web UI or API won't start

```bash
lsof -iTCP:1420 -sTCP:LISTEN -t | xargs kill
lsof -iTCP:17890 -sTCP:LISTEN -t | xargs kill
python3 scripts/dev_desktop.py
```

### Port 5500 stuck or page hangs on Stylus install URL

Something else may be holding the port. In the Web UI, stop the watcher and click **Free port** in Status or Diagnostics. Or from the terminal:

```bash
lsof -iTCP:5500 -sTCP:LISTEN -t | xargs kill
```

Then start the watcher again.

### Quick Links greyed out

- **Stylus Install** — start the watcher in CSS or CSS & JS mode; wait until Status shows port **live**
- **Tampermonkey Install** — start the watcher in JS or CSS & JS mode

### Watcher errors in Activity

- Confirm the project folder has `main/styles.css`, `main/main.js`, and a valid `.env.local` with `SITE_URL`
- Use **Diagnostics** → **pip install** if Python dependencies are missing
- Check the Ready check for the first failing step

### JS preview not loading

1. Confirm the watcher is running in JS or CSS & JS mode
2. Open `http://127.0.0.1:5500/preview/js-local-preview.js` — you should see the generated script
3. Check Tampermonkey is enabled and `tampermonkey-loader.user.js` (v1.2.0+) matches your dev site URL
4. Hard refresh once after installing or updating the loader

### JS changes not appearing

1. Confirm Activity shows rebuild lines when you save `main/main.js`
2. Look for `[hl-js-local-preview:loader] Auto refresh enabled` in the browser console
3. Edit `main/main.js`, not `preview/js-local-preview.js`
4. If auto refresh is off (`JS_AUTO_REFRESH=false`), hard refresh after each save

### `$` or jQuery errors

Wrap logic in `$(function () { ... })`. The loader injects after `jQuery` is available on the page.

</details>

<details>
<summary>Configuration reference</summary>

Copy `.env.local.example` to `.env.local` and adjust:

| Variable | Description |
|----------|-------------|
| `SITE_URL` | Target page URL — Stylus matching rules and dev site link |
| `CMS_LOCAL_PREVIEW_NAME` | Stylus style name and output filename (without `.user.css`) |
| `SOURCE_CSS` | Path to production CSS (default: `main/styles.css`) |
| `JS_LOCAL_PREVIEW_NAME` | JS preview filename without `.js` (default: `js-local-preview`) |
| `SOURCE_JS` | Path to production JS (default: `main/main.js`) |
| `JS_AUTO_REFRESH` | Auto reload dev site when `main.js` changes (default: `true`) |
| `JS_AUTO_REFRESH_INTERVAL_MS` | How often the loader checks for JS changes in ms (default: `500`, min: `500`) |
| `OUTPUT_DIR` | Directory for generated preview files (default: `preview`) |
| `MATCH_DOMAIN` | Match by domain |
| `MATCH_URL_PREFIX` | Match by URL prefix |
| `MATCH_URL` | Match exact URL |
| `MATCH_REGEXP` | Match by regexp pattern |
| `MATCH_REGEXP_PATTERN` | Regexp pattern (defaults to the site URL if unset) |

#### Matching rules (CSS / Stylus)

Enable one or more `MATCH_*` flags in `.env.local`. Each enabled flag generates its own `@-moz-document` block. If all flags are `false`, the script defaults to `url-prefix` using your site URL.

| Flag | Match Mode label | Generated rule |
|------|------------------|----------------|
| `MATCH_DOMAIN=true` | `domain` | `@-moz-document domain("example.com")` |
| `MATCH_URL_PREFIX=true` | `url-prefix` | `@-moz-document url-prefix("https://example.com/...")` |
| `MATCH_URL=true` | `url` | `@-moz-document url("https://example.com/...")` |
| `MATCH_REGEXP=true` | `regexp` | `@-moz-document regexp("...")` |

</details>

<details>
<summary>Generated output examples</summary>

**CSS** — `preview/cms-local-preview.user.css`:

```css
/* ==UserStyle==
@name           cms-local-preview
@namespace      higherlogic-local-dev
@version        1.0.0
@description    Local CMS preview CSS generated from production styles
==/UserStyle== */

@-moz-document url-prefix("https://example.com/...") {
  /* contents of main/styles.css */
}
```

**JS** — `preview/js-local-preview.js` + `preview/js-local-preview.config.json`:

```javascript
// Auto-generated by scripts/watch_js.py — do not edit.
// Source: main/main.js

(function () {
  "use strict";
  const PREVIEW_PREFIX = "[hl-js-local-preview:preview]";
  try {
    // main/main.js inlined here, unchanged
    $(function () { /* ... */ });
    console.log(PREVIEW_PREFIX + " Main script executed successfully");
  } catch (error) {
    console.error(PREVIEW_PREFIX + " Runtime error:", error);
  }
})();
```

```json
{
  "autoRefresh": true,
  "autoRefreshIntervalMs": 500
}
```

Do not edit files in `preview/` — changes are overwritten on the next sync.

</details>

<details>
<summary>Tampermonkey loader reference</summary>

Update `@match` in `tampermonkey-loader.user.js` if `SITE_URL` changes:

```javascript
// @match          https://example.com/your-sandbox/*
```

| Grant / directive | Purpose |
|-------------------|---------|
| `@connect 127.0.0.1` | Fetch from the local preview server |
| `@grant GM_xmlhttpRequest` | Request the preview script (bypasses page CORS) |
| `@grant GM_addElement` | Inject the preview script into the page |
| `@grant unsafeWindow` | Access page jQuery (Tampermonkey sandbox is separate) |
| `@run-at window-load` | Run after page scripts load, matching CMS timing |

The loader waits for `unsafeWindow.jQuery` (not `$` — HL sites often call `noConflict`) before injecting.

Auto refresh is **on by default**. The watcher generates `preview/js-local-preview.config.json`; the loader polls every 500ms and reloads the page when the preview script changes.

Expected console output when auto refresh is on:

```text
[hl-js-local-preview:loader] Loaded preview script: http://127.0.0.1:5500/preview/js-local-preview.js
[hl-js-local-preview:loader] Auto refresh enabled (500ms)
[hl-js-local-preview:preview] Main script executed successfully
[hl-js-local-preview:loader] Preview changed — reloading page
```

Use Tampermonkey loader **v1.2.0+**.

</details>

---

## Uploading to production

When your local preview looks right, copy the contents of `main/styles.css` and/or `main/main.js` into the theme editor. The `preview/` files are for local development only.

<details>
<summary>Safety note (Tampermonkey and injected JS)</summary>

The JavaScript preview uses **Tampermonkey** to fetch and **inject script into pages you visit**. Treat this like running your own code in the browser context of those pages.

- **Dev/sandbox only** — Point `@match` and `SITE_URL` at your test site, not production member-facing URLs.
- **Narrow matching** — Use a specific sandbox path (e.g. `https://example.com/your-sandbox/*`), not broad patterns like `*://*/*`.
- **You control the script** — The loader runs whatever `main/main.js` contains. Do not paste untrusted code.
- **Local server** — Only run the watcher while developing; stop it when done.
- **Disable when not developing** — Turn off the Tampermonkey loader when you are not actively previewing JS.
- **Not for production** — Upload finished CSS/JS through the CMS editor. Do not ask end users to install Tampermonkey.

CSS preview via Stylus injects styles the same way user styles do; keep Stylus rules scoped to your dev URL as well.

</details>

## Roadmap

### Completed

- [x] Web UI control panel for configuring and running the local preview workflow
- [x] Multi-project switcher with recent folders
- [x] Port recovery (free port when stuck)
- [x] Ready check and health diagnostics
- [x] Open source files in Cursor / VS Code from preview cards
- [x] Activity log with filters and search

### Planned

- [ ] Watch additional local JavaScript files and bundle them into `main/main.js`
