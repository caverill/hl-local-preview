# HL Local Preview

Local preview workflow for CMS theme development — CSS via [Stylus](https://github.com/openstyles/stylus) and JavaScript via [Tampermonkey](https://www.tampermonkey.net/).

Both watchers share a **threaded built-in HTTP server** on port `5500` — no separate web server extension required.

## Quick start

```bash
cp .env.local.example .env.local   # set SITE_URL and matching rules
pip install -r requirements.txt
python3 scripts/watch.py           # watch CSS + JS (default)
```

| Edit | Preview via | After saving |
|------|-------------|--------------|
| `main/styles.css` | Stylus (live reload) | Changes appear automatically |
| `main/main.js` | Tampermonkey loader | **Hard refresh** the dev site |

### Preview modes

```bash
python3 scripts/watch.py           # both (default)
python3 scripts/watch.py both      # same as above
python3 scripts/watch.py css       # CSS only (alias: 1)
python3 scripts/watch.py js        # JS only (alias: 2)
python3 scripts/watch.py 3         # numeric aliases work too
```

Shorthand scripts still work: `watch_css.py` and `watch_js.py` (each delegates to `watch.py`).

## How it works

```
main/styles.css  →  watch.py  →  preview/cms-local-preview.user.css  →  :5500  →  Stylus  →  live site
main/main.js     →  watch.py  →  preview/js-local-preview.js         →  :5500  →  Tampermonkey loader  →  live site
       ↑                                    ↑                              ↑
   you edit here                  auto-generated; do not edit          built-in HTTP server
```

1. You edit `main/styles.css` and/or `main/main.js` (production source files).
2. The watcher regenerates files in `preview/` and serves them over HTTP.
3. **Stylus** injects CSS with live reload. **Tampermonkey** fetches JS on each page load (cache-busted).
4. Upload `main/styles.css` and `main/main.js` to the CMS when ready — `preview/` is local-only.

## Requirements

- Python 3.10+
- [Stylus](https://github.com/openstyles/stylus) browser extension (CSS preview)
- [Tampermonkey](https://www.tampermonkey.net/) browser extension (JS preview)

## Project structure

```
hl-local-preview/
├── main/
│   ├── styles.css                   # Production CSS — edit this
│   └── main.js                      # Production JS — edit this
├── preview/                         # Generated files (gitignored)
│   ├── cms-local-preview.user.css   # Stylus preview
│   └── js-local-preview.js          # Tampermonkey preview wrapper
├── scripts/
│   ├── watch.py                     # Unified watcher (css / js / both)
│   ├── watch_css.py                 # CSS-only shorthand
│   ├── watch_js.py                  # JS-only shorthand
│   └── preview_server.py            # Shared HTTP server on port 5500
├── tampermonkey-loader.user.js      # Install once in Tampermonkey
├── .env.local                       # Your local config (gitignored)
├── .env.local.example               # Config template
├── .gitignore
└── requirements.txt
```

## Setup

```bash
cp .env.local.example .env.local
pip install -r requirements.txt
```

Edit `.env.local` with your site URL and matching-rule preferences (see [Configuration](#configuration)).

### One-time browser setup

**Stylus (CSS):** Run the watcher, open the printed CSS install URL, enable **Live reload**, and click **Install style**. Reinstall when you change `SITE_URL` or matching rules.

**Tampermonkey (JS):** Install `tampermonkey-loader.user.js` in Tampermonkey. Update the `@match` line if your `SITE_URL` changes. You rarely need to touch the loader again.

## Run the watcher

```bash
# Default — watch CSS + JS, start preview server, open browser tabs
python3 scripts/watch.py

# Single asset
python3 scripts/watch.py css
python3 scripts/watch.py js

# Legacy shorthands (same behavior)
python3 scripts/watch_css.py
python3 scripts/watch_js.py

# Sync once — start server and wait until Ctrl+C (no file watching)
python3 scripts/watch.py --once

# Watch without opening browser tabs
python3 scripts/watch.py --no-open

# Sync only — generate preview files, no server or browser
python3 scripts/watch.py --once --no-serve --no-open
```

In **both** mode, the watcher opens the Stylus install URL and your dev site (`SITE_URL`). In **js** mode, it opens the dev site only. In **css** mode, it opens the Stylus install URL only.

Both CSS and JS watchers share port `5500`. If one watcher is already serving that port, another instance reuses it.

### CLI flags

All flags work on `watch.py`, `watch_css.py`, and `watch_js.py`:

| Flag | Description |
|------|-------------|
| `--env PATH` | Path to config file (default: `.env.local`) |
| `--once` | Sync once instead of watching for file changes |
| `--no-serve` | Skip the built-in preview server |
| `--no-open` | Do not open browser tabs (Stylus URL and/or dev site) |

### Example output

**CSS only** (`watch.py css`):

```
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

**Both** (`watch.py` or `watch.py both`):

```
HL Local Preview Ready

Mode:        both
Match Mode:  url-prefix
CSS source:  main/styles.css
CSS output:  preview/cms-local-preview.user.css
CSS URL:     http://127.0.0.1:5500/preview/cms-local-preview.user.css
Site URL:    https://example.com/your-sandbox/
JS source:   main/main.js
JS output:   preview/js-local-preview.js

Next steps:
1. Enable Live reload in Stylus and install the CSS URL
2. Ensure tampermonkey-loader.user.js is installed
3. Open dev site and check console for hl-js-local-preview
```

While watching, changes log with 12-hour timestamps. With `--no-serve`, preview URLs and next steps are omitted.

---

## CSS preview (Stylus)

Stylus needs the preview file served over **HTTP** — opening it directly (`file://`) is unreliable for live reload.

When you run the CSS watcher (without `--no-serve`), it syncs your CSS, starts the preview server, prints the ready summary, and opens the install URL. Then:

1. Enable **Live reload** in Stylus
2. Click **Install style**
3. Keep the preview tab open while developing — Stylus polls the URL for changes
4. Open your site — the injected CSS should appear

The built-in server is **threaded**, so Chrome and Stylus can open multiple connections (install tab + live-reload polling) without blocking each other.

When you change the site URL or matching rules in `.env.local`, re-open the install URL and click **Reinstall** in Stylus.

### Generated CSS output

`preview/cms-local-preview.user.css` is auto-generated and gitignored. It looks like:

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

Do not edit the preview file directly — changes are overwritten on the next sync. Edit `main/styles.css` instead.

---

## JavaScript preview (Tampermonkey)

### Workflow

1. Install `tampermonkey-loader.user.js` in Tampermonkey once.
2. Run `python3 scripts/watch.py js` (or `both`).
3. Edit `main/main.js` and save.
4. **Hard refresh** the dev site — Tampermonkey does not live-reload like Stylus.

The loader fetches `http://127.0.0.1:5500/preview/js-local-preview.js` with a cache-busting query string on each page load. You do not reinstall the userscript when `main.js` changes.

### CMS JavaScript format

Write `main/main.js` exactly as you would upload to the CMS. HL custom JS typically uses jQuery's document-ready pattern:

```javascript
$(function () {
  // your code here
});
```

The preview wrapper inlines your source **as-is** inside a thin try/catch. Do not rewrite it for preview — what you edit locally is what you upload.

### Tampermonkey loader setup

Install `tampermonkey-loader.user.js`. Update `@match` to your sandbox path if `SITE_URL` changes:

```javascript
// @match          https://example.com/your-sandbox/*
```

Required grants and directives:

| Grant / directive | Purpose |
|-------------------|---------|
| `@connect 127.0.0.1` | Fetch from the local preview server |
| `@grant GM_xmlhttpRequest` | Request the preview script (bypasses page CORS) |
| `@grant GM_addElement` | Inject the preview script into the page |
| `@grant unsafeWindow` | Access page jQuery (Tampermonkey sandbox is separate) |
| `@run-at window-load` | Run after page scripts load, matching CMS timing |

The loader waits for `unsafeWindow.jQuery` (not `$` — HL sites often call `noConflict`) before injecting the preview script.

### Verify in DevTools

Filter the console for `hl-js-local-preview`:

```
[hl-js-local-preview:loader] Loaded preview script: http://127.0.0.1:5500/preview/js-local-preview.js
[hl-js-local-preview:preview] Main script executed successfully
```

Your own `console.log` calls from `main/main.js` appear separately.

### Generated JS output

`preview/js-local-preview.js` is auto-generated and gitignored. The watcher wraps your source like this:

```javascript
// Auto-generated by scripts/watch_js.py — do not edit.
// Source: main/main.js

(function () {
  "use strict";

  const PREVIEW_PREFIX = "[hl-js-local-preview:preview]";

  try {
    // main/main.js inlined here, unchanged
    $(function () {
      // ...
    });
    console.log(PREVIEW_PREFIX + " Main script executed successfully");
  } catch (error) {
    console.error(PREVIEW_PREFIX + " Runtime error:", error);
  }
})();
```

Edit `main/main.js`, not the preview file.

---

## Configuration

Copy `.env.local.example` to `.env.local` and adjust:

| Variable | Description |
|----------|-------------|
| `SITE_URL` | Target page URL — Stylus matching rules and JS dev-site tab |
| `CMS_LOCAL_PREVIEW_NAME` | Stylus style name and output filename (without `.user.css`) |
| `SOURCE_CSS` | Path to production CSS (default: `main/styles.css`) |
| `JS_LOCAL_PREVIEW_NAME` | JS preview filename without `.js` (default: `js-local-preview`) |
| `SOURCE_JS` | Path to production JS (default: `main/main.js`) |
| `OUTPUT_DIR` | Directory for generated preview files (default: `preview`) |
| `MATCH_DOMAIN` | Match by domain |
| `MATCH_URL_PREFIX` | Match by URL prefix |
| `MATCH_URL` | Match exact URL |
| `MATCH_REGEXP` | Match by regexp pattern |
| `MATCH_REGEXP_PATTERN` | Regexp pattern (defaults to the site URL if unset) |

### Matching rules (CSS / Stylus)

Enable one or more `MATCH_*` flags in `.env.local`. Each enabled flag generates its own `@-moz-document` block with the same injected CSS. Active modes appear as **Match Mode** in the ready summary.

| Flag | Match Mode label | Generated rule |
|------|------------------|----------------|
| `MATCH_DOMAIN=true` | `domain` | `@-moz-document domain("example.com")` |
| `MATCH_URL_PREFIX=true` | `url-prefix` | `@-moz-document url-prefix("https://example.com/...")` |
| `MATCH_URL=true` | `url` | `@-moz-document url("https://example.com/...")` |
| `MATCH_REGEXP=true` | `regexp` | `@-moz-document regexp("...")` |

If all flags are `false`, the script defaults to `url-prefix` using your site URL.

---

## Troubleshooting

### Page hangs on the Stylus install URL?

Usually a **stale process** is still holding port `5500` but no longer responding. The watcher detects this and prints a kill command; you can also run:

```bash
lsof -iTCP:5500 -sTCP:LISTEN -t | xargs kill
python3 scripts/watch.py
```

### JS preview not loading?

1. Confirm the watcher is running (`python3 scripts/watch.py js`).
2. Open `http://127.0.0.1:5500/preview/js-local-preview.js` in a browser — you should see the generated script.
3. Check Tampermonkey is enabled and `tampermonkey-loader.user.js` matches your dev site URL.
4. Hard refresh after saving `main/main.js`.
5. Look for `[hl-js-local-preview:loader]` errors in the console — they usually mean the server is down or port `5500` is blocked.

### JS changes not appearing?

Tampermonkey has no live reload. After editing `main/main.js`, save and **hard refresh** the page. Make sure you are editing `main/main.js`, not `preview/js-local-preview.js`.

### `$` or jQuery errors?

Write CMS-style JS using `$(function () { ... })`. The loader injects into the page context after `jQuery` is available. If your script runs before HL's libraries load, wrap logic inside `$(function () { ... })`.

---

## Uploading to production

When your local preview looks right, copy the contents of `main/styles.css` and/or `main/main.js` into the theme editor for production upload. The `preview/` files are for local development only.
