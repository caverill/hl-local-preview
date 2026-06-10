# HL Local Preview

Local preview workflow for CMS theme development — CSS via [Stylus](https://github.com/openstyles/stylus) and JavaScript via [Tampermonkey](https://www.tampermonkey.net/).

Both watchers include a **threaded built-in HTTP server** on port `5500` — no separate web server extension required.

## Quick start

```bash
cp .env.local.example .env.local   # set your site URL
pip install -r requirements.txt
python3 scripts/watch.py           # watch CSS + JS (default)
```

Edit `main/styles.css` or `main/main.js`, save, and changes appear on your dev site via Stylus or Tampermonkey.

### Preview modes

```bash
python3 scripts/watch.py css       # CSS only (alias: 1)
python3 scripts/watch.py js        # JS only (alias: 2)
python3 scripts/watch.py both      # CSS + JS (alias: 3, default)
```

Shorthand scripts still work: `watch_css.py` and `watch_js.py`.

## How it works

```
main/styles.css  →  watch_css.py  →  preview/cms-local-preview.user.css  →  HTTP server  →  Stylus  →  live site
       ↑                                      ↑                              ↑
   you edit here                    auto-generated; do not edit rules here   built-in on :5500
```

1. You edit `main/styles.css` (your production CSS source).
2. `scripts/watch_css.py` watches that file and writes a Stylus-compatible preview file.
3. The built-in HTTP server serves that file so Stylus can install it with live reload.
4. Stylus injects the CSS on pages matching your configured URL rules.

## Project structure

```
hl-local-preview/
├── main/
│   ├── styles.css                   # Production CSS — edit this
│   └── main.js                      # Production JS — edit this
├── preview/
│   ├── cms-local-preview.user.css   # Generated Stylus file
│   └── js-local-preview.js          # Generated Tampermonkey preview file
├── scripts/
│   ├── watch.py                     # Unified watcher (css / js / both)
│   ├── watch_css.py                 # CSS-only shorthand
│   └── watch_js.py                  # JS-only shorthand
├── tampermonkey-loader.user.js      # Install once in Tampermonkey
├── .env.local                       # Your local config (gitignored)
├── .env.local.example               # Config template
├── .gitignore
└── requirements.txt
```

## Setup

**Requirements:** Python 3.10+ and the Stylus browser extension.

```bash
cp .env.local.example .env.local
pip install -r requirements.txt
```

Edit `.env.local` with your site URL and matching-rule preferences (see [Configuration](#configuration)).

## Run the watcher

```bash
# Default — watch CSS + JS, start preview server, open browser tabs
python3 scripts/watch.py

# CSS only
python3 scripts/watch.py css

# JS only
python3 scripts/watch.py js

# Legacy shorthand (same as above)
python3 scripts/watch_css.py

# Sync once — start server and wait until Ctrl+C (no file watching)
python3 scripts/watch_css.py --once

# Watch without opening a browser tab
python3 scripts/watch_css.py --no-open

# Sync only — generate preview file, no server or browser
python3 scripts/watch_css.py --once --no-serve
```

### CLI flags

| Flag | Description |
|------|-------------|
| `--env PATH` | Path to config file (default: `.env.local`) |
| `--once` | Sync once instead of watching for file changes |
| `--no-serve` | Skip the built-in preview server |
| `--no-open` | Do not open the Stylus install URL in a browser tab |

### Example output

After syncing, the script prints a ready summary:

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
[2:35 PM] Unchanged main/styles.css
```

While watching, changes log with 12-hour timestamps. With `--no-serve`, the preview URL and next steps are omitted.

## Stylus setup

Stylus needs the preview file served over **HTTP** — opening it directly (`file://`) is unreliable for live reload.

When you run `watch_css.py` (without `--no-serve`), it syncs your CSS, starts the threaded preview server on port `5500`, prints the ready summary above, and opens the install URL in your browser. Follow the printed next steps:

1. Enable **Live reload** in Stylus
2. Click **Install style**
3. Keep the preview tab open while developing — Stylus polls the URL for changes

Then open your site — the injected CSS should appear.

The built-in server is **threaded**, so Chrome and Stylus can open multiple connections (install tab + live-reload polling) without blocking each other.

When you change the site URL or matching rules in `.env.local`, re-open the install URL and click **Reinstall** in Stylus.

### Page hangs on the install URL?

Usually a **stale process** is still holding port `5500` but no longer responding. The watcher detects this and prints a kill command; you can also run it manually:

```bash
lsof -iTCP:5500 -sTCP:LISTEN -t | xargs kill
python3 scripts/watch_css.py
```

## Configuration

Copy `.env.local.example` to `.env.local` and adjust:

| Variable | Description |
|----------|-------------|
| `SITE_URL` | Target page URL for Stylus matching rules |
| `CMS_LOCAL_PREVIEW_NAME` | Stylus style name and output filename (without `.user.css`) |
| `SOURCE_CSS` | Path to production CSS (default: `main/styles.css`) |
| `OUTPUT_DIR` | Directory for generated preview file (default: `preview`) |
| `MATCH_DOMAIN` | Match by domain |
| `MATCH_URL_PREFIX` | Match by URL prefix |
| `MATCH_URL` | Match exact URL |
| `MATCH_REGEXP` | Match by regexp pattern |
| `MATCH_REGEXP_PATTERN` | Regexp pattern (defaults to the site URL if unset) |

### Matching rules

Enable one or more `MATCH_*` flags in `.env.local`. Each enabled flag generates its own `@-moz-document` block with the same injected CSS. The active modes are shown as **Match Mode** in the ready summary.

| Flag | Match Mode label | Generated rule |
|------|------------------|----------------|
| `MATCH_DOMAIN=true` | `domain` | `@-moz-document domain("example.com")` |
| `MATCH_URL_PREFIX=true` | `url-prefix` | `@-moz-document url-prefix("https://example.com/...")` |
| `MATCH_URL=true` | `url` | `@-moz-document url("https://example.com/...")` |
| `MATCH_REGEXP=true` | `regexp` | `@-moz-document regexp("...")` |

If all flags are `false`, the script defaults to `url-prefix` using your site URL.

## Generated output

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

Do not edit the preview file directly — changes will be overwritten on the next sync. Edit `main/styles.css` instead.

## Uploading to production

When your local preview looks right, copy the contents of `main/styles.css` or `main/main.js` into the theme editor for production upload. The `preview/` files are for local preview only.

---

## JavaScript preview

### Quick start

```bash
python3 scripts/watch_js.py
```

Edit `main/main.js`, save, refresh your dev site — Tampermonkey loads the latest preview script automatically.

### How it works

```
main/main.js  →  watch_js.py  →  preview/js-local-preview.js  →  HTTP server  →  Tampermonkey loader  →  live site
      ↑                                    ↑                          ↑
 you edit here                  auto-generated; do not edit here   built-in on :5500
```

1. Install `tampermonkey-loader.user.js` in Tampermonkey once (stable loader; rarely changes).
2. `scripts/watch_js.py` watches `main/main.js` and regenerates `preview/js-local-preview.js`.
3. The loader fetches the preview script from `http://127.0.0.1:5500/preview/js-local-preview.js` with cache-busting on each page load.
4. Refresh the browser to pick up changes — no need to reinstall the userscript.

### Tampermonkey setup

Install `tampermonkey-loader.user.js` in Tampermonkey. Update the `@match` line if your `SITE_URL` changes.

Required grants for local development:

| Grant / directive | Purpose |
|-------------------|---------|
| `@connect 127.0.0.1` | Fetch from the local preview server |
| `@grant GM_xmlhttpRequest` | Request the preview script (bypasses page CORS) |
| `@grant GM_addElement` | Inject the preview script into the page |

Verify in DevTools console — filter for `hl-js-local-preview`:

```
[hl-js-local-preview:loader] Loaded preview script: http://127.0.0.1:5500/preview/js-local-preview.js
[hl-js-local-preview:preview] Main script executed successfully
```

### Run the JS watcher

```bash
# Default — watch, start preview server, open SITE_URL from .env.local
python3 scripts/watch_js.py

# Sync once — start server and wait until Ctrl+C
python3 scripts/watch_js.py --once

# Watch without opening the dev site in a browser tab
python3 scripts/watch_js.py --no-open

# Sync only — generate preview file, no server
python3 scripts/watch_js.py --once --no-serve
```

Uses the same CLI flags as the CSS watcher (`--env`, `--once`, `--no-serve`, `--no-open`).

Both CSS and JS watchers share port `5500`. You do **not** need `watch_css.py` running for JS preview — `watch_js.py` starts the same built-in server on its own. If one watcher is already serving port `5500`, the other reuses it.

### JS configuration

| Variable | Description |
|----------|-------------|
| `JS_LOCAL_PREVIEW_NAME` | Output filename without `.js` (default: `js-local-preview`) |
| `SOURCE_JS` | Path to production JS (default: `main/main.js`) |

`SITE_URL` and `OUTPUT_DIR` are shared with the CSS workflow.
