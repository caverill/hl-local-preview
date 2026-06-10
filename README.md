# HL Local Preview

![Python](https://img.shields.io/badge/python-3.10+-3776AB?logo=python&logoColor=white)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)
![CSS](https://img.shields.io/badge/CSS-Stylus-00a78e)
![JS](https://img.shields.io/badge/JS-Tampermonkey-00485b)
![Server](https://img.shields.io/badge/server-localhost%3A5500-orange)
[![GitHub](https://img.shields.io/badge/GitHub-hl--local--preview-181717?logo=github)](https://github.com/caverill/hl-local-preview)

Local development toolkit for Higher Logic CMS theme customization. Edit CSS and JavaScript in your preferred editor, preview changes locally, and validate updates before publishing to the CMS. Powered CSS via [Stylus](https://github.com/openstyles/stylus) and JavaScript via [Tampermonkey](https://www.tampermonkey.net/).

## Who this is for

This repo is for **Higher Logic CMS developers** who want to develop and test custom CSS and JavaScript locally before publishing changes to a CMS site. The primary goal is to **reduce the repetitive edit → upload → save → refresh workflow that typically occurs when developing directly in the CMS.** Instead, you can work in your preferred editor, preview changes locally, and upload to the CMS when your work is ready.

You should already have:

- A sandbox or dev site URL (set as `SITE_URL` in `.env.local`)
- Access to the CMS theme editor where `main/styles.css` and `main/main.js` will eventually be pasted
- Python 3.10+, Stylus and Tampermonkey

This is **not** a deployment tool, a CMS plugin, or something you install for site members. It is a personal local-dev setup on your machine.

## Why this was created

Developing **CSS and JavaScript directly in the CMS editor** can be slow and repetitive. Instead of repeatedly editing files in the CMS, saving changes, and refreshing pages to verify results, developers can work locally and see changes almost immediately. In practice, this significantly reduces the amount of time spent on repetitive upload and testing cycles, allowing more time to focus on development and debugging.

- **Every change requires saving and refreshing.**
- **Testing small updates** often involves multiple edit/save/reload cycles.
- **Browser DevTools changes are temporary** and disappear on refresh.
- **Browser-side CSS and JavaScript edits** can be difficult to track, reproduce, or share with teammates.
- **Local tooling** such as Git, search, formatting, linting, and debugging workflows are not available inside the CMS editor.

This project provides a **local-development workflow with near-live preview capabilities** that allows you to:

- **Edit CSS and JavaScript** in your preferred editor.
- **Preview CSS changes almost instantly** with Stylus live reload.
- **Preview JavaScript changes on save** with Tampermonkey auto refresh (page reload).
- **Quickly test and validate changes** before publishing them to a shared environment.
- **Avoid repeatedly uploading JavaScript to the CMS during development**, where small changes can affect all pages that load the script.
- **Move faster while developing and debugging CMS customizations.**
- **Keep work-in-progress changes local** until they are ready to be published.

Once development is complete, upload the final contents of `main/styles.css` and `main/main.js` to the CMS as usual.

## 🚀 Quick start

| Edit | Preview via | After saving |
|------|-------------|--------------|
| `main/styles.css` | Stylus (live reload) | Changes appear automatically |
| `main/main.js` | Tampermonkey loader | Changes appear automatically (page reload) |

```bash
python3 scripts/watch.py           # both (default)
python3 scripts/watch.py css       # CSS only (alias: 1)
python3 scripts/watch.py js        # JS only (alias: 2)
```

Shorthand scripts still work: `watch_css.py` and `watch_js.py` (each delegates to `watch.py`).

### Web UI (optional)

A browser-based control panel starts the watcher, shows logs, and links to Stylus/Tampermonkey install URLs.

**Requirements:** Python 3.10+, Node.js 18+

```bash
pip install -r requirements.txt
python3 scripts/dev_desktop.py
```

Opens **http://localhost:1420** (React UI) backed by a local API on port `17890`. The CLI (`watch.py`) still works on its own if you prefer the terminal.

## ⚙️ How it works

```
main/styles.css  →  watch.py  →  preview/cms-local-preview.user.css  →  :5500  →  Stylus  →  live site
main/main.js     →  watch.py  →  preview/js-local-preview.js         →  :5500  →  Tampermonkey loader  →  live site
       ↑                                    ↑                              ↑
   you edit here                  auto-generated; do not edit          built-in HTTP server
```

1. Edit `main/styles.css` and/or `main/main.js` — these are your production source files.
2. The watcher regenerates files in `preview/` and serves them over HTTP on port `5500`.
3. A browser extension injects the preview on your dev site (Stylus for CSS, Tampermonkey for JS).
4. When it looks right, copy from `main/` into the CMS theme editor. Never upload `preview/` files.

| | CSS | JS |
|---|-----|-----|
| Source file | `main/styles.css` | `main/main.js` |
| Generated preview | `preview/cms-local-preview.user.css` | `preview/js-local-preview.js` |
| Browser tool | [Stylus](https://github.com/openstyles/stylus) | [Tampermonkey](https://www.tampermonkey.net/) + `tampermonkey-loader.user.js` |
| After saving | Live reload (no page refresh) | Auto refresh (full page reload) |
| One-time setup | Install style from printed URL; enable **Live reload** | Install loader v1.2.0+; set `@match` to your sandbox URL |

### Live preview on save

Both CSS and JS update when you save — keep the watcher running and leave your dev site open.

| | CSS (Stylus) | JS (Tampermonkey) |
|---|--------------|-------------------|
| How it updates | Stylus polls the preview URL and swaps injected CSS | Loader polls `preview/js-local-preview.js` and reloads the page |
| Typical delay | ~1–2s (Stylus live reload) | ~0.5s after save (configurable) |
| Config | Enable **Live reload** in Stylus once | On by default — `JS_AUTO_REFRESH=true` in `.env.local` |
| Disable | Turn off Live reload in Stylus | `JS_AUTO_REFRESH=false` in `.env.local` |

**CSS:** Stylus needs HTTP (not `file://`). Reinstall the style when you change `SITE_URL` or matching rules in `.env.local`.

**JS:** Write `main/main.js` exactly as you would upload to the CMS — typically `$(function () { ... })`. The watcher writes `preview/js-local-preview.config.json`; the loader reads it and reloads the page when the preview script changes. Filter the console for `hl-js-local-preview` to verify.

```bash
# Optional — defaults shown
JS_AUTO_REFRESH=true
JS_AUTO_REFRESH_INTERVAL_MS=500
```

<details>
<summary>📄 Generated output examples</summary>

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
<summary>🐵 Tampermonkey loader reference</summary>

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

Auto refresh is **on by default**. The watcher generates `preview/js-local-preview.config.json`; the loader polls every 500ms and reloads the page when the preview script changes. CSS hot-swaps styles without a reload; JS reloads the full page so `$(function () { ... })` runs cleanly.

To disable auto refresh:

```bash
JS_AUTO_REFRESH=false
JS_AUTO_REFRESH_INTERVAL_MS=500   # minimum 500 when enabled
```

Use Tampermonkey loader **v1.2.0+**.

Expected console output when auto refresh is on:

```text
[hl-js-local-preview:loader] Loaded preview script: http://127.0.0.1:5500/preview/js-local-preview.js
[hl-js-local-preview:loader] Auto refresh enabled (500ms)
[hl-js-local-preview:preview] Main script executed successfully
[hl-js-local-preview:loader] Preview changed — reloading page
```

</details>

## 📁 Project structure

```
hl-local-preview/
├── main/
│   ├── styles.css                   # Production CSS — edit this
│   └── main.js                      # Production JS — edit this
├── preview/                         # Generated files (gitignored)
├── scripts/
│   ├── watch.py                     # Unified watcher (css / js / both)
│   ├── watch_css.py                 # CSS-only shorthand
│   ├── watch_js.py                  # JS-only shorthand
│   └── preview_server.py            # Shared HTTP server on port 5500
├── tampermonkey-loader.user.js      # Install once in Tampermonkey
├── .env.local                       # Your local config (gitignored)
└── .env.local.example               # Config template
```

## ▶️ Run the watcher

```bash
python3 scripts/watch.py              # watch CSS + JS, start server, open tabs
python3 scripts/watch.py css          # CSS only
python3 scripts/watch.py js           # JS only
python3 scripts/watch.py --once       # sync once, no file watching
python3 scripts/watch.py --no-open    # skip opening browser tabs
python3 scripts/watch.py --once --no-serve --no-open   # generate preview files only
```

In **both** mode, the watcher opens the Stylus install URL and your dev site. In **js** mode, it opens the dev site only. In **css** mode, it opens the Stylus install URL only. Both share port `5500`.

| Flag | Description |
|------|-------------|
| `--env PATH` | Path to config file (default: `.env.local`) |
| `--once` | Sync once instead of watching for file changes |
| `--no-serve` | Skip the built-in preview server |
| `--no-open` | Do not open browser tabs |

<details>
<summary>📋 Example output</summary>

**CSS only** (`watch.py css`)

```text
CMS Local Preview Ready

Match Mode:  url-prefix
Source:      main/styles.css
Output:      preview/cms-local-preview.user.css
Preview URL: http://127.0.0.1:5500/preview/cms-local-preview.user.css

Next steps:
1. Enable Live reload in Stylus
2. Click Install style
3. Keep the preview tab open

Press Ctrl+C to stop.

[2:34 PM] Updated main/styles.css (+2 / -1)
```

**JS only** (`watch.py js`)

```text
JS Local Preview Ready

Site URL:    https://example.com/your-sandbox/
Source:      main/main.js
Output:      preview/js-local-preview.js
Preview URL: http://127.0.0.1:5500/preview/js-local-preview.js
JS refresh:  auto on (500ms)

Next steps:
1. Ensure tampermonkey-loader.user.js is installed in Tampermonkey
2. DevTools console — filter for hl-js-local-preview
3. Opening dev site: https://example.com/your-sandbox/

Watching for changes...
Press Ctrl+C to stop.

[2:36 PM] Preview rebuilt from main/main.js (+3 / -0)
```

**Both** (`watch.py` or `watch.py both`)

```text
HL Local Preview Ready

Mode:        both
Site URL:    https://example.com/your-sandbox/
Match Mode:  url-prefix
CSS source:  main/styles.css
CSS output:  preview/cms-local-preview.user.css
CSS URL:     http://127.0.0.1:5500/preview/cms-local-preview.user.css
JS source:   main/main.js
JS output:   preview/js-local-preview.js
JS refresh:  auto on (500ms)

Next steps:
1. Enable Live reload in Stylus and install the CSS URL
2. Ensure tampermonkey-loader.user.js is installed
3. Open dev site and check console for hl-js-local-preview

Press Ctrl+C to stop.

[2:34 PM] Updated main/styles.css (+2 / -1)
[2:36 PM] Preview rebuilt from main/main.js (+3 / -0)
```

CSS changes log as `Updated`; JS changes log as `Preview rebuilt from`.

</details>

<details>
<summary>🔧 Configuration</summary>

Copy `.env.local.example` to `.env.local` and adjust:

| Variable | Description |
|----------|-------------|
| `SITE_URL` | Target page URL — Stylus matching rules and JS dev-site tab |
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
<summary>🩹 Troubleshooting</summary>

#### Page hangs on the Stylus install URL?

Usually a **stale process** is holding port `5500`. Run:

```bash
lsof -iTCP:5500 -sTCP:LISTEN -t | xargs kill
python3 scripts/watch.py
```

#### JS preview not loading?

1. Confirm the watcher is running (`python3 scripts/watch.py js`).
2. Open `http://127.0.0.1:5500/preview/js-local-preview.js` — you should see the generated script.
3. Check Tampermonkey is enabled and `tampermonkey-loader.user.js` (v1.2.0+) matches your dev site URL.
4. Hard refresh once after installing or updating the loader.

#### JS changes not appearing?

1. Confirm the watcher is running and `[2:36 PM] Preview rebuilt from main/main.js` appears in the terminal when you save.
2. Look for `[hl-js-local-preview:loader] Auto refresh enabled (500ms)` in the browser console.
3. Edit `main/main.js`, not `preview/js-local-preview.js`.
4. If auto refresh is off (`JS_AUTO_REFRESH=false`), hard refresh after each save.

#### `$` or jQuery errors?

Wrap logic in `$(function () { ... })`. The loader injects after `jQuery` is available on the page.

</details>

## 📤 Uploading to production

When your local preview looks right, copy the contents of `main/styles.css` and/or `main/main.js` into the theme editor. The `preview/` files are for local development only.

<details>
<summary>⚠️ Safety note (Tampermonkey and injected JS)</summary>

The JavaScript preview uses **Tampermonkey** to fetch and **inject script into pages you visit**. Treat this like running your own code in the browser context of those pages.

- **Dev/sandbox only** — Point `@match` and `SITE_URL` at your test site, not production member-facing URLs.
- **Narrow matching** — Use a specific sandbox path (e.g. `https://example.com/your-sandbox/*`), not broad patterns like `*://*/*`.
- **You control the script** — The loader runs whatever `main/main.js` contains. Do not paste untrusted code.
- **Local server** — Only run the watcher while developing; stop it when done (`Ctrl+C`).
- **Disable when not developing** — Turn off the Tampermonkey loader when you are not actively previewing JS.
- **Not for production** — Upload finished CSS/JS through the CMS editor. Do not ask end users to install Tampermonkey.

CSS preview via Stylus injects styles the same way user styles do; keep Stylus rules scoped to your dev URL as well.

</details>

## Roadmap

### In Progress
- [ ] Turn this into a lightweight Replit app with a simple UI for configuring and running the local preview workflow.

### Planned

- [ ] Watch additional local JavaScript files and bundle them into `main/main.js`
