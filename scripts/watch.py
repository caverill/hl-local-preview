#!/usr/bin/env python3
"""
Watch production CSS and/or JS and sync local preview files.

Usage:
  cp .env.local.example .env.local   # first-time setup
  pip install -r requirements.txt
  python3 scripts/watch.py           # both (default)
  python3 scripts/watch.py css     # CSS only
  python3 scripts/watch.py js      # JS only
  python3 scripts/watch.py both    # CSS + JS
  python3 scripts/watch.py 1       # CSS only (alias)
  python3 scripts/watch.py 2       # JS only (alias)
  python3 scripts/watch.py 3       # both (alias)
"""

from __future__ import annotations

import argparse
import sys
import threading
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import watch_css
import watch_js
from preview_server import set_serve_root, start_preview_server, stop_preview_server

DEFAULT_ENV_PATH = SCRIPT_DIR.parent / ".env.local"
MODE_ALIASES = {
    "1": "css",
    "2": "js",
    "3": "both",
    "css": "css",
    "js": "js",
    "both": "both",
}


def parse_mode(value: str) -> str:
    key = value.strip().lower()
    if key not in MODE_ALIASES:
        raise argparse.ArgumentTypeError(
            f"invalid mode {value!r} — use css, js, both, or 1, 2, 3"
        )
    return MODE_ALIASES[key]


def print_ready_status(
    mode: str,
    css_config: watch_css.Config | None,
    js_config: watch_js.Config | None,
    *,
    serve: bool,
) -> None:
    print()
    print("HL Local Preview Ready")
    print()
    print(f"Mode:        {mode}")

    if css_config is not None:
        match_mode = ", ".join(watch_css.match_mode_labels(css_config))
        print(f"Match Mode:  {match_mode}")
        print(f"CSS source:  {css_config.source_css.relative_to(watch_css.ROOT)}")
        print(f"CSS output:  {css_config.output_path.relative_to(watch_css.ROOT)}")
        if serve:
            print(f"CSS URL:     {watch_css.preview_install_url(css_config)}")

    if js_config is not None:
        print(f"Site URL:    {js_config.site_url}")
        print(f"JS source:   {js_config.source_js.relative_to(watch_js.ROOT)}")
        print(f"JS output:   {js_config.output_path.relative_to(watch_js.ROOT)}")
        if serve:
            refresh = (
                f"on ({js_config.auto_refresh_interval_ms}ms)"
                if js_config.auto_refresh
                else "off (JS_AUTO_REFRESH=false in .env.local)"
            )
            print(f"JS refresh:  auto {refresh}")

    if serve:
        print()
        print("Next steps:")
        if css_config is not None:
            print("1. Enable Live reload in Stylus and install the CSS URL")
        if js_config is not None:
            step = 2 if css_config is not None else 1
            print(f"{step}. Ensure tampermonkey-loader.user.js is installed")
            print(f"{step + 1}. Open dev site and check console for hl-js-local-preview")
        print()


def open_browser_tabs(
    mode: str,
    css_config: watch_css.Config | None,
    js_config: watch_js.Config | None,
) -> None:
    if mode in {"css", "both"} and css_config is not None:
        watch_css.open_stylus_install_tab(css_config)
    if mode in {"js", "both"} and js_config is not None:
        watch_js.open_dev_site_tab(js_config)


def watch_both(
    css_config: watch_css.Config,
    js_config: watch_js.Config,
    env_path: Path,
    *,
    serve: bool,
    open_browser: bool,
) -> int:
    try:
        from watchdog.events import FileSystemEventHandler
        from watchdog.observers import Observer
    except ImportError:
        print("error: install watchdog first: pip install -r requirements.txt", file=sys.stderr)
        return 1

    previous_styles: str | None = None
    previous_source: str | None = None
    sync_targets = {
        css_config.source_css.resolve(),
        js_config.source_js.resolve(),
        env_path.resolve(),
    }
    debounce_seconds = 0.15

    class Handler(FileSystemEventHandler):
        def __init__(self) -> None:
            super().__init__()
            self._timer: threading.Timer | None = None
            self._timer_lock = threading.Lock()

        def _schedule_sync(self, path: Path) -> None:
            resolved = path.resolve()
            if resolved not in sync_targets:
                return

            def run_sync() -> None:
                nonlocal previous_styles, previous_source
                css_result = watch_css.sync_preview(
                    css_config, previous_styles, log_change=True
                )
                js_result = watch_js.sync_preview(
                    js_config, previous_source, log_change=True
                )
                if css_result is not None:
                    previous_styles = css_result
                if js_result is not None:
                    previous_source = js_result

            with self._timer_lock:
                if self._timer is not None:
                    self._timer.cancel()
                self._timer = threading.Timer(debounce_seconds, run_sync)
                self._timer.daemon = True
                self._timer.start()

        def on_modified(self, event) -> None:
            if event.is_directory:
                return
            self._schedule_sync(Path(event.src_path))

        def on_created(self, event) -> None:
            if event.is_directory:
                return
            self._schedule_sync(Path(event.src_path))

        def on_moved(self, event) -> None:
            if event.is_directory:
                return
            self._schedule_sync(Path(event.dest_path))

    previous_styles = watch_css.sync_preview(css_config, previous_styles)
    previous_source = watch_js.sync_preview(js_config, previous_source)
    if previous_styles is None or previous_source is None:
        return 1

    if serve:
        try:
            set_serve_root(watch_css.ROOT)
            start_preview_server()
        except RuntimeError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 1

    print_ready_status("both", css_config, js_config, serve=serve)
    if serve and open_browser:
        open_browser_tabs("both", css_config, js_config)

    print("Watching for changes...")
    observer = Observer()
    handler = Handler()
    observer.schedule(handler, str(css_config.source_css.parent), recursive=False)
    observer.schedule(handler, str(js_config.source_js.parent), recursive=False)
    observer.schedule(handler, str(env_path.parent), recursive=False)
    observer.start()

    print("Press Ctrl+C to stop.")
    print()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print()
        observer.stop()
    observer.join()

    if serve:
        stop_preview_server()

    return 0


def run_once(
    mode: str,
    css_config: watch_css.Config | None,
    js_config: watch_js.Config | None,
    *,
    serve: bool,
    open_browser: bool,
) -> int:
    ok = True
    if css_config is not None:
        ok = watch_css.sync_preview(css_config, None) is not None and ok
    if js_config is not None:
        ok = watch_js.sync_preview(js_config, None) is not None and ok
    if not ok:
        return 1

    if serve:
        try:
            set_serve_root(watch_css.ROOT)
            start_preview_server()
        except RuntimeError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 1

    print_ready_status(mode, css_config, js_config, serve=serve)
    if serve and open_browser:
        open_browser_tabs(mode, css_config, js_config)
    if serve:
        print("Press Ctrl+C to stop.")
        print()
        try:
            while True:
                time.sleep(3600)
        except KeyboardInterrupt:
            print()
        stop_preview_server()
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "mode",
        nargs="?",
        default="both",
        type=parse_mode,
        help="preview mode: css (1), js (2), or both (3). default: both",
    )
    parser.add_argument(
        "--env",
        type=Path,
        default=DEFAULT_ENV_PATH,
        help="Path to .env.local (default: .env.local in repo root)",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Sync once and exit (no file watching)",
    )
    parser.add_argument(
        "--no-serve",
        action="store_true",
        help="Do not start the built-in preview server",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Do not open browser tabs (Stylus install URL and/or SITE_URL)",
    )
    args = parser.parse_args(argv)

    env_path = args.env.resolve()
    serve = not args.no_serve
    open_browser = not args.no_open

    css_config: watch_css.Config | None = None
    js_config: watch_js.Config | None = None

    try:
        if args.mode in {"css", "both"}:
            css_config = watch_css.load_config(env_path)
        if args.mode in {"js", "both"}:
            js_config = watch_js.load_config(env_path)
    except (FileNotFoundError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if args.once:
        return run_once(
            args.mode,
            css_config,
            js_config,
            serve=serve,
            open_browser=open_browser,
        )

    if args.mode == "css" and css_config is not None:
        return watch_css.watch(
            css_config, env_path, serve=serve, open_browser=open_browser
        )
    if args.mode == "js" and js_config is not None:
        return watch_js.watch(
            js_config, env_path, serve=serve, open_browser=open_browser
        )
    if args.mode == "both" and css_config is not None and js_config is not None:
        return watch_both(
            css_config,
            js_config,
            env_path,
            serve=serve,
            open_browser=open_browser,
        )

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
