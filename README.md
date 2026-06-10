# HL Local Preview

Local CSS preview workflow for CMS theme development. Edit production CSS locally, sync it into a Stylus `user.css` file, and preview changes on a live site through the [Stylus](https://github.com/openstyles/stylus) browser extension.

`watch_css.py` includes a **threaded built-in HTTP server** on port `5500` for Stylus live reload — no separate web server extension required.

## Quick start

```bash
cp .env.local.example .env.local   # set your site URL
pip install -r requirements.txt
python3 scripts/watch_css.py       # sync, serve, open Stylus install URL
```

Edit `main/styles.css`, save, and changes appear on your dev site via Stylus.

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
│   └── styles.css                   # Production CSS — edit this
├── preview/
│   └── cms-local-preview.user.css   # Generated Stylus file (gitignored)
├── scripts/
│   └── watch_css.py                 # Watcher, sync, and preview server
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
# Default — watch for changes, start preview server, open Stylus install URL
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

When your local preview looks right, copy the contents of `main/styles.css` into the theme editor for production upload. The `preview/` file is for local Stylus preview only.
