#!/usr/bin/env python3
"""
Watch production CSS and sync it into a Stylus user.css preview file.

Usage:
  cp .env.local.example .env.local   # first-time setup
  pip install -r requirements.txt
  python3 scripts/watch_css.py       # watch for changes
  python3 scripts/watch_css.py --once  # sync once and exit
"""

from __future__ import annotations

import difflib
from datetime import datetime
import sys
import threading
import time
import webbrowser
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from preview_server import PREVIEW_PORT, start_preview_server, stop_preview_server

ROOT = SCRIPT_DIR.parent
DEFAULT_ENV_PATH = ROOT / ".env.local"

# --- defaults (override via .env.local) ---
DEFAULT_SOURCE_CSS = "main/styles.css"
DEFAULT_OUTPUT_DIR = "preview"
DEFAULT_PREVIEW_NAME = "css-local-preview"


@dataclass
class Config:
    site_url: str
    preview_name: str
    source_css: Path
    output_path: Path
    match_domain: bool
    match_url_prefix: bool
    match_url: bool
    match_regexp: bool
    regexp_pattern: str | None


def parse_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}


def load_env(path: Path) -> dict[str, str]:
    if not path.is_file():
        raise FileNotFoundError(f"Missing config file: {path}")

    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, _, raw = line.partition("=")
        values[key.strip()] = raw.strip()
    return values


def load_config(env_path: Path) -> Config:
    env = load_env(env_path)

    site_url = env.get("SITE_URL", "").strip()
    if not site_url:
        raise ValueError("Site URL is required — set SITE_URL in .env.local")

    preview_name = env.get("CMS_LOCAL_PREVIEW_NAME", DEFAULT_PREVIEW_NAME).strip() or DEFAULT_PREVIEW_NAME
    source_css = ROOT / env.get("SOURCE_CSS", DEFAULT_SOURCE_CSS).strip()
    output_dir = ROOT / env.get("OUTPUT_DIR", DEFAULT_OUTPUT_DIR).strip()
    output_path = output_dir / f"{preview_name}.user.css"

    return Config(
        site_url=site_url,
        preview_name=preview_name,
        source_css=source_css,
        output_path=output_path,
        match_domain=parse_bool(env.get("MATCH_DOMAIN", "false")),
        match_url_prefix=parse_bool(env.get("MATCH_URL_PREFIX", "false")),
        match_url=parse_bool(env.get("MATCH_URL", "false")),
        match_regexp=parse_bool(env.get("MATCH_REGEXP", "false")),
        regexp_pattern=env.get("MATCH_REGEXP_PATTERN", "").strip() or None,
    )


def matching_rules(config: Config) -> list[str]:
    """Return @-moz-document selector strings (without the @-moz-document keyword)."""
    rules: list[str] = []
    parsed = urlparse(config.site_url)

    if config.match_domain:
        domain = parsed.netloc or config.site_url
        rules.append(f'domain("{domain}")')

    if config.match_url_prefix:
        rules.append(f'url-prefix("{config.site_url}")')

    if config.match_url:
        rules.append(f'url("{config.site_url}")')

    if config.match_regexp:
        pattern = config.regexp_pattern or config.site_url
        rules.append(f'regexp("{pattern}")')

    if not rules:
        rules.append(f'url-prefix("{config.site_url}")')

    return rules


def indent_css(css: str) -> str:
    return "\n".join(f"  {line}" if line else "" for line in css.rstrip().splitlines())


def build_user_css(styles: str, config: Config) -> str:
    header = f"""/* ==UserStyle==
@name           {config.preview_name}
@namespace      higherlogic-local-dev
@version        1.0.0
@description    Local CMS preview CSS generated from production styles
==/UserStyle== */
"""
    body = indent_css(styles)
    blocks = [f"@-moz-document {rule} {{\n{body}\n}}" for rule in matching_rules(config)]
    return header + "\n" + "\n\n".join(blocks) + "\n"


def match_mode_labels(config: Config) -> list[str]:
    labels: list[str] = []
    if config.match_domain:
        labels.append("domain")
    if config.match_url_prefix:
        labels.append("url-prefix")
    if config.match_url:
        labels.append("url")
    if config.match_regexp:
        labels.append("regexp")
    if not labels:
        labels.append("url-prefix")
    return labels


def format_change_timestamp() -> str:
    return datetime.now().strftime("%I:%M %p").lstrip("0")


def normalize_styles(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def styles_are_equal(previous: str | None, current: str) -> bool:
    if previous is None:
        return False
    return normalize_styles(previous) == normalize_styles(current)


def count_line_changes(old: str, new: str) -> tuple[int, int]:
    diff = difflib.unified_diff(
        old.splitlines(),
        new.splitlines(),
        lineterm="",
    )
    added = 0
    removed = 0
    for line in diff:
        if line.startswith("+") and not line.startswith("+++"):
            added += 1
        elif line.startswith("-") and not line.startswith("---"):
            removed += 1
    return added, removed


def print_sync_status(
    config: Config,
    previous_styles: str | None,
    styles: str,
    *,
    changed: bool,
) -> None:
    ts = format_change_timestamp()
    source = config.source_css.relative_to(ROOT)
    if not changed:
        print(f"[{ts}] Unchanged {source}")
        return
    if previous_styles is None:
        line_count = len(styles.splitlines())
        print(f"[{ts}] Updated {source} ({line_count} lines)")
        return
    added, removed = count_line_changes(
        normalize_styles(previous_styles),
        normalize_styles(styles),
    )
    if added == 0 and removed == 0:
        print(f"[{ts}] Unchanged {source}")
        return
    print(f"[{ts}] Updated {source} (+{added} / -{removed})")


def print_ready_status(config: Config, *, serve: bool) -> None:
    match_mode = ", ".join(match_mode_labels(config))
    source = config.source_css.relative_to(ROOT)
    output = config.output_path.relative_to(ROOT)

    print()
    print("CMS Local Preview Ready")
    print()
    print(f"Match Mode:  {match_mode}")
    print(f"Source:      {source}")
    print(f"Output:      {output}")
    if serve:
        print(f"Preview URL: {preview_install_url(config)}")
        print()
        print("Next steps:")
        print("1. Enable Live reload in Stylus")
        print("2. Click Install style")
        print("3. Keep the preview tab open")
        print()


def sync_preview(config: Config, previous_styles: str | None, *, log_change: bool = False) -> str | None:
    if not config.source_css.is_file():
        print(f"error: source CSS not found: {config.source_css.relative_to(ROOT)}", file=sys.stderr)
        return None

    styles = config.source_css.read_text(encoding="utf-8")
    preview = build_user_css(styles, config)
    config.output_path.parent.mkdir(parents=True, exist_ok=True)

    preview_unchanged = (
        config.output_path.exists()
        and config.output_path.read_text(encoding="utf-8") == preview
    )
    source_unchanged = styles_are_equal(previous_styles, styles)

    if preview_unchanged:
        if log_change and (source_unchanged or previous_styles is not None):
            print_sync_status(config, previous_styles, styles, changed=False)
        return styles

    config.output_path.write_text(preview, encoding="utf-8")
    if log_change:
        print_sync_status(config, previous_styles, styles, changed=True)
    return styles


def preview_install_url(config: Config) -> str:
    rel = config.output_path.relative_to(ROOT).as_posix()
    return f"http://127.0.0.1:{PREVIEW_PORT}/{rel}"


def open_stylus_install_tab(config: Config) -> None:
    webbrowser.open(preview_install_url(config))


def watch(config: Config, env_path: Path, *, serve: bool, open_browser: bool) -> int:
    try:
        from watchdog.events import FileSystemEventHandler
        from watchdog.observers import Observer
    except ImportError:
        print("error: install watchdog first: pip install -r requirements.txt", file=sys.stderr)
        return 1

    previous_styles: str | None = None
    sync_targets = {config.source_css.resolve(), env_path.resolve()}
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
                nonlocal previous_styles
                result = sync_preview(config, previous_styles, log_change=True)
                if result is not None:
                    previous_styles = result

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

    previous_styles = sync_preview(config, previous_styles)
    if previous_styles is None:
        return 1

    if serve:
        try:
            start_preview_server()
        except RuntimeError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 1

    print_ready_status(config, serve=serve)
    if serve and open_browser:
        open_stylus_install_tab(config)

    observer = Observer()
    handler = Handler()
    observer.schedule(handler, str(config.source_css.parent), recursive=False)
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


if __name__ == "__main__":
    from watch import main as watch_main

    raise SystemExit(watch_main(["css", *sys.argv[1:]]))
