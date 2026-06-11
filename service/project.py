from __future__ import annotations

import json
import shutil
import socket
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

REPO_ROOT = Path(__file__).resolve().parent.parent
PREVIEW_PORT = 5500
SERVICE_PORT = 17890
SETTINGS_FILE = REPO_ROOT / ".hl-preview-settings.json"

REQUIRED_FILES = [
    "main/styles.css",
    "main/main.js",
    "scripts/watch.py",
    "tampermonkey-loader.user.js",
]

ALL_PROJECT_FILES = [
    "main/styles.css",
    "main/main.js",
    "scripts/watch.py",
    "scripts/watch_css.py",
    "scripts/watch_js.py",
    "scripts/tampermonkey_loader.py",
    "scripts/preview_server.py",
    "tampermonkey-loader.user.js",
    ".env.local.example",
    "requirements.txt",
    ".gitignore",
]

# Copied from the HL Local Preview repo; safe to refresh without touching user CSS/JS or .env.local.
SYNCABLE_PROJECT_FILES = [
    "scripts/watch.py",
    "scripts/watch_css.py",
    "scripts/watch_js.py",
    "scripts/tampermonkey_loader.py",
    "scripts/preview_server.py",
    "requirements.txt",
    ".gitignore",
    ".env.local.example",
]

PROJECT_GITIGNORE_TEMPLATE = REPO_ROOT / "templates" / "project.gitignore"

# Read at scaffold time (not import time) so template edits apply without restarting the API.
SCAFFOLD_TEMPLATE_FILES = {
    "main/styles.css": REPO_ROOT / "templates" / "main.styles.css",
    "main/main.js": REPO_ROOT / "templates" / "main.main.js",
}

TEMPLATE_ENV = """\
SITE_URL=
CMS_LOCAL_PREVIEW_NAME=cms-local-preview
SOURCE_CSS=main/styles.css
JS_LOCAL_PREVIEW_NAME=js-local-preview
SOURCE_JS=main/main.js
OUTPUT_DIR=preview
JS_AUTO_REFRESH=true
JS_AUTO_REFRESH_INTERVAL_MS=500
MATCH_DOMAIN=false
MATCH_URL_PREFIX=true
MATCH_URL=false
MATCH_REGEXP=false
"""

INLINE_TEMPLATES = {
    "requirements.txt": "watchdog>=3.0.0\nflask>=3.0.0\nflask-cors>=4.0.0\n",
    ".env.local.example": TEMPLATE_ENV,
}


def scaffold_template_text(rel: str) -> str | None:
    path = SCAFFOLD_TEMPLATE_FILES.get(rel)
    if path and path.is_file():
        return path.read_text(encoding="utf-8")
    return INLINE_TEMPLATES.get(rel)


def repo_source_bytes(rel: str) -> bytes | None:
    if rel == ".gitignore":
        if PROJECT_GITIGNORE_TEMPLATE.is_file():
            return PROJECT_GITIGNORE_TEMPLATE.read_bytes()
        return None
    if rel in INLINE_TEMPLATES:
        return INLINE_TEMPLATES[rel].encode("utf-8")
    source = REPO_ROOT / rel
    if source.is_file():
        return source.read_bytes()
    return None


def _is_same_repo_file(project_dir: Path, rel: str) -> bool:
    dest = (project_dir / rel).resolve()
    source = (REPO_ROOT / rel).resolve()
    return dest == source


def outdated_syncable_files(project_dir: Path) -> list[str]:
    outdated: list[str] = []
    is_repo_root = project_dir.resolve() == REPO_ROOT.resolve()
    for rel in SYNCABLE_PROJECT_FILES:
        if rel == ".gitignore" and is_repo_root:
            continue
        dest = project_dir / rel
        if not dest.is_file():
            continue
        if rel != ".gitignore" and _is_same_repo_file(project_dir, rel):
            continue
        expected = repo_source_bytes(rel)
        if expected is None:
            continue
        try:
            if dest.read_bytes() != expected:
                outdated.append(rel)
        except OSError:
            continue
    return outdated


def sync_project_files(project_dir: Path, files: list[str] | None = None) -> list[str]:
    allowed = set(SYNCABLE_PROJECT_FILES)
    is_repo_root = project_dir.resolve() == REPO_ROOT.resolve()
    targets = [
        rel
        for rel in (files if files is not None else outdated_syncable_files(project_dir))
        if rel in allowed and not (rel == ".gitignore" and is_repo_root)
    ]
    if not targets:
        return []

    updated: list[str] = []
    for rel in targets:
        dest = project_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        if rel == ".gitignore" and PROJECT_GITIGNORE_TEMPLATE.is_file():
            shutil.copy2(PROJECT_GITIGNORE_TEMPLATE, dest)
            updated.append(rel)
        elif rel in INLINE_TEMPLATES:
            dest.write_text(INLINE_TEMPLATES[rel], encoding="utf-8")
            updated.append(rel)
        elif (REPO_ROOT / rel).is_file():
            shutil.copy2(REPO_ROOT / rel, dest)
            updated.append(rel)

    if any(rel.startswith("scripts/") for rel in updated):
        sync_tampermonkey_loader(project_dir)

    return updated


def _mtime_iso(path: Path) -> str | None:
    if not path.is_file():
        return None
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()


def active_project_dir() -> Path:
    """Project the watcher is using while running, otherwise the saved project."""
    try:
        from service.watcher import state as watcher

        if watcher.running and watcher.project_dir is not None:
            return watcher.project_dir
    except ImportError:
        pass
    return get_project_dir()


def preview_build_times(
    project_dir: Path,
    *,
    event_rebuild_at: str | None = None,
) -> dict[str, str | None]:
    env_path = project_dir / ".env.local"
    env = load_env(env_path) if env_path.is_file() else {}
    out = env.get("OUTPUT_DIR", "preview").strip() or "preview"
    css_name = env.get("CMS_LOCAL_PREVIEW_NAME", "cms-local-preview").strip() or "cms-local-preview"
    js_name = env.get("JS_LOCAL_PREVIEW_NAME", "js-local-preview").strip() or "js-local-preview"

    css_path = project_dir / out / f"{css_name}.user.css"
    js_path = project_dir / out / f"{js_name}.js"

    css_at = _mtime_iso(css_path)
    js_at = _mtime_iso(js_path)

    mtimes: list[float] = []
    if css_path.is_file():
        mtimes.append(css_path.stat().st_mtime)
    if js_path.is_file():
        mtimes.append(js_path.stat().st_mtime)

    last_at = (
        datetime.fromtimestamp(max(mtimes), tz=timezone.utc).isoformat()
        if mtimes
        else None
    )
    if event_rebuild_at and (not last_at or event_rebuild_at > last_at):
        last_at = event_rebuild_at
    return {
        "css_built_at": css_at,
        "js_built_at": js_at,
        "last_rebuild_at": last_at,
    }


def api_build_times() -> dict[str, str | None]:
    try:
        from service.watcher import state as watcher

        return preview_build_times(
            active_project_dir(),
            event_rebuild_at=watcher.last_rebuild_at,
        )
    except ImportError:
        return preview_build_times(active_project_dir())


RECENT_DIRS_LIMIT = 8
VALID_WATCHER_MODES = frozenset({"both", "css", "js"})


def default_settings() -> dict:
    return {
        "project_dir": str(REPO_ROOT),
        "recent_dirs": [],
        "auto_start_watcher": False,
        "last_watcher_mode": "both",
        "desktop_notifications": False,
    }


def load_settings() -> dict:
    data = default_settings()
    if not SETTINGS_FILE.is_file():
        return data
    try:
        stored = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
        if isinstance(stored, dict):
            data.update(stored)
    except json.JSONDecodeError:
        pass
    return data


def save_settings(data: dict) -> None:
    SETTINGS_FILE.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def valid_recent_dirs(recent: list | None = None) -> list[str]:
    dirs = recent if recent is not None else load_settings().get("recent_dirs", [])
    if not isinstance(dirs, list):
        return []
    out: list[str] = []
    for raw in dirs:
        if not isinstance(raw, str) or not raw.strip():
            continue
        path = Path(raw)
        if path.is_dir():
            out.append(str(path.resolve()))
    return out


def push_recent_dir(path: Path) -> None:
    settings = load_settings()
    resolved = str(path.resolve())
    recent = [d for d in valid_recent_dirs(settings.get("recent_dirs")) if d != resolved]
    recent.insert(0, resolved)
    settings["recent_dirs"] = recent[:RECENT_DIRS_LIMIT]
    settings["project_dir"] = resolved
    save_settings(settings)


def get_project_dir() -> Path:
    stored = load_settings().get("project_dir", "")
    path = Path(stored) if stored else REPO_ROOT
    return path if path.is_dir() else REPO_ROOT


def set_project_dir(path: Path) -> None:
    push_recent_dir(path)


def get_preferences() -> dict:
    settings = load_settings()
    mode = str(settings.get("last_watcher_mode", "both")).lower()
    if mode not in VALID_WATCHER_MODES:
        mode = "both"
    return {
        "recent_dirs": valid_recent_dirs(settings.get("recent_dirs")),
        "auto_start_watcher": bool(settings.get("auto_start_watcher")),
        "last_watcher_mode": mode,
        "desktop_notifications": bool(settings.get("desktop_notifications")),
    }


def update_preferences(**kwargs) -> dict:
    settings = load_settings()
    if "auto_start_watcher" in kwargs:
        settings["auto_start_watcher"] = bool(kwargs["auto_start_watcher"])
    if "desktop_notifications" in kwargs:
        settings["desktop_notifications"] = bool(kwargs["desktop_notifications"])
    if "last_watcher_mode" in kwargs:
        mode = str(kwargs["last_watcher_mode"]).lower()
        if mode in VALID_WATCHER_MODES:
            settings["last_watcher_mode"] = mode
    save_settings(settings)
    return get_preferences()


def load_env(env_path: Path) -> dict[str, str]:
    if not env_path.is_file():
        return {}
    out: dict[str, str] = {}
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, _, val = line.partition("=")
        out[key.strip()] = val.strip()
    return out


def write_env(env_path: Path, values: dict[str, str]) -> None:
    lines: list[str] = []
    if env_path.is_file():
        written: set[str] = set()
        for line in env_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if stripped and not stripped.startswith("#"):
                key = stripped.split("=", 1)[0].strip()
                if key in values:
                    lines.append(f"{key}={values[key]}")
                    written.add(key)
                    continue
            lines.append(line)
        for k, v in values.items():
            if k not in written:
                lines.append(f"{k}={v}")
    else:
        lines = [f"{k}={v}" for k, v in values.items()]
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


MATCH_MODES = frozenset({"domain", "url-prefix", "url", "regexp"})


def env_truthy(value: str | None) -> bool:
    if not value:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def match_mode_from_env(env: dict[str, str]) -> str:
    if env_truthy(env.get("MATCH_REGEXP")):
        return "regexp"
    if env_truthy(env.get("MATCH_URL")):
        return "url"
    if env_truthy(env.get("MATCH_DOMAIN")):
        return "domain"
    if env_truthy(env.get("MATCH_URL_PREFIX")):
        return "url-prefix"
    return "url-prefix"


def match_env_updates(mode: str, regexp_pattern: str = "") -> dict[str, str]:
    if mode not in MATCH_MODES:
        mode = "url-prefix"
    return {
        "MATCH_DOMAIN": "true" if mode == "domain" else "false",
        "MATCH_URL_PREFIX": "true" if mode == "url-prefix" else "false",
        "MATCH_URL": "true" if mode == "url" else "false",
        "MATCH_REGEXP": "true" if mode == "regexp" else "false",
        "MATCH_REGEXP_PATTERN": regexp_pattern.strip() if mode == "regexp" else "",
    }


def ensure_env_file(project_dir: Path) -> Path:
    """Create .env.local from the built-in template if it does not exist yet."""
    env_path = project_dir / ".env.local"
    if env_path.is_file():
        return env_path
    env_path.write_text(TEMPLATE_ENV, encoding="utf-8")
    return env_path


def apply_setup_env(
    project_dir: Path,
    *,
    site_url: str,
    match_mode: str,
    match_regexp_pattern: str = "",
) -> Path:
    """Ensure .env.local exists and write setup fields from the web UI."""
    env_path = ensure_env_file(project_dir)
    updates = {"SITE_URL": site_url.strip()}
    updates.update(match_env_updates(match_mode, match_regexp_pattern))
    write_env(env_path, updates)
    preview_ok, preview_error = finalize_project_setup(project_dir)
    return env_path, preview_ok, preview_error


def find_git_root(path: Path) -> Path | None:
    """Return the nearest parent directory that contains a .git entry."""
    try:
        current = path.expanduser().resolve()
    except OSError:
        return None
    for candidate in [current, *current.parents]:
        git = candidate / ".git"
        if git.is_dir() or git.is_file():
            return candidate
    return None


def remote_to_web_url(remote: str) -> str | None:
    remote = remote.strip()
    if not remote:
        return None
    if remote.startswith("git@"):
        host, _, repo = remote.partition(":")
        if host.endswith("github.com") and repo:
            return f"https://github.com/{repo.removesuffix('.git')}"
        return None
    if remote.startswith("http://") or remote.startswith("https://"):
        return remote.removesuffix(".git")
    return None


def git_repo_info(path: Path) -> dict:
    root = find_git_root(path)
    if not root:
        return {
            "is_git_repo": False,
            "repo_root": None,
            "remote_url": None,
            "remote_web_url": None,
            "branch": None,
        }

    remote_url: str | None = None
    branch: str | None = None
    for args in (
        ["git", "-C", str(root), "remote", "get-url", "origin"],
        ["git", "-C", str(root), "rev-parse", "--abbrev-ref", "HEAD"],
    ):
        try:
            result = subprocess.run(args, capture_output=True, text=True, timeout=2, check=False)
        except (OSError, subprocess.TimeoutExpired):
            continue
        if result.returncode != 0:
            continue
        value = result.stdout.strip()
        if args[3] == "remote":
            remote_url = value or None
        else:
            branch = value or None

    return {
        "is_git_repo": True,
        "repo_root": str(root),
        "remote_url": remote_url,
        "remote_web_url": remote_to_web_url(remote_url or ""),
        "branch": branch,
    }


def inspect_project_path(path: Path) -> dict:
    env = load_env(path / ".env.local") if path.is_dir() else {}
    if not path.is_dir():
        return {
            "path": str(path),
            "valid": False,
            "missing_files": [],
            "site_url": env.get("SITE_URL", ""),
            **git_repo_info(path),
        }
    return {
        "path": str(path),
        "valid": True,
        "missing_files": missing_files(path),
        "outdated_files": outdated_syncable_files(path),
        "site_url": env.get("SITE_URL", ""),
        **git_repo_info(path),
    }


def project_info(project_dir: Path) -> dict:
    env = load_env(project_dir / ".env.local")
    return {
        "path": str(project_dir),
        "site_url": env.get("SITE_URL", ""),
        "match_mode": match_mode_from_env(env),
        "match_regexp_pattern": env.get("MATCH_REGEXP_PATTERN", ""),
        "missing_files": missing_files(project_dir),
        "outdated_files": outdated_syncable_files(project_dir),
        "urls": preview_urls(project_dir),
        "recent_dirs": get_preferences()["recent_dirs"],
        **preview_build_times(project_dir),
        **git_repo_info(project_dir),
    }


def missing_files(project_dir: Path) -> list[str]:
    return [rel for rel in REQUIRED_FILES if not (project_dir / rel).is_file()]


def create_missing_files(project_dir: Path) -> list[str]:
    created: list[str] = []
    for rel in ALL_PROJECT_FILES:
        dest = project_dir / rel
        if dest.is_file():
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        if rel == ".gitignore" and PROJECT_GITIGNORE_TEMPLATE.is_file():
            shutil.copy2(PROJECT_GITIGNORE_TEMPLATE, dest)
        elif (template := scaffold_template_text(rel)) is not None:
            dest.write_text(template, encoding="utf-8")
        elif (REPO_ROOT / rel).is_file():
            shutil.copy2(REPO_ROOT / rel, dest)
        else:
            dest.touch()
        created.append(rel)
    return created


def sync_tampermonkey_loader(project_dir: Path) -> None:
    scripts_dir = str(REPO_ROOT / "scripts")
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)
    from tampermonkey_loader import sync_tampermonkey_loader as sync_loader

    sync_loader(project_dir)


def _run_watch_once(
    project_dir: Path,
    mode: str = "both",
    *,
    no_serve: bool = False,
    log_prefix: str = "watch.py",
) -> tuple[bool, str]:
    """Run watch.py --once; optionally append lines to the activity log."""
    env_path = project_dir / ".env.local"
    watch_script = project_dir / "scripts" / "watch.py"
    if not env_path.is_file():
        return False, "missing .env.local"
    if not watch_script.is_file():
        return False, "missing scripts/watch.py"
    if missing_files(project_dir):
        return False, "missing required project files"

    mode = mode.lower()
    if mode not in VALID_WATCHER_MODES:
        mode = "both"

    args = [
        sys.executable,
        "-u",
        str(watch_script),
        mode,
        "--once",
        "--no-open",
        "--env",
        str(env_path),
    ]
    if no_serve:
        args.append("--no-serve")

    try:
        from service.watcher import state as watcher

        watcher.append_log("cmd", f"{log_prefix} {mode} --once")
    except ImportError:
        watcher = None  # type: ignore[assignment]

    result = subprocess.run(
        args,
        cwd=str(project_dir),
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )

    if watcher is not None:
        for line in (result.stdout or "").splitlines():
            if not line.strip():
                continue
            lower = line.lower()
            if "error" in lower:
                level = "err"
            elif "updated" in lower or "rebuilt" in lower:
                level = "ok"
            else:
                level = "info"
            watcher.append_log(level, line.strip())
        for line in (result.stderr or "").splitlines():
            if line.strip():
                watcher.append_log("err", line.strip())

    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip()
        return False, detail or "preview build failed"

    return True, ""


def build_initial_previews(project_dir: Path) -> tuple[bool, str]:
    """Build preview/ CSS and JS once from source files."""
    return _run_watch_once(project_dir, "both", no_serve=True, log_prefix="watch.py")


def rebuild_preview_once(project_dir: Path, mode: str = "both") -> tuple[bool, str]:
    """One-shot preview sync without starting the file watcher."""
    preview_ok, preview_error = _run_watch_once(
        project_dir,
        mode,
        no_serve=True,
        log_prefix="Rebuild",
    )
    if not preview_ok:
        return False, preview_error
    try:
        from service.local_preview import ensure_preview_server

        ensure_preview_server(project_dir)
    except OSError:
        pass
    return True, ""


def finalize_project_setup(project_dir: Path) -> tuple[bool, str]:
    """Sync Tampermonkey rules, build preview files, and start preview server."""
    sync_tampermonkey_loader(project_dir)
    preview_ok, preview_error = build_initial_previews(project_dir)
    try:
        from service.local_preview import ensure_preview_server

        ensure_preview_server(project_dir)
    except OSError:
        pass
    return preview_ok, preview_error


def port_open(port: int) -> bool:
    for host in ("127.0.0.1", "::1"):
        family = socket.AF_INET6 if host == "::1" else socket.AF_INET
        try:
            with socket.socket(family, socket.SOCK_STREAM) as sock:
                sock.settimeout(0.2)
                if sock.connect_ex((host, port)) == 0:
                    return True
        except OSError:
            continue
    return False


def url_ok(url: str) -> bool:
    try:
        with urlopen(url, timeout=1.5) as resp:
            return resp.status < 400
    except OSError:
        return False


def _css_preview_revision(project_dir: Path, out: str, css_name: str) -> int | None:
    path = project_dir / out / f"{css_name}.revision.json"
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        rev = data.get("revision")
        return int(rev) if rev is not None else None
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        return None


def preview_urls(project_dir: Path) -> dict[str, str]:
    env = load_env(project_dir / ".env.local")
    css = env.get("CMS_LOCAL_PREVIEW_NAME", "cms-local-preview").strip() or "cms-local-preview"
    js = env.get("JS_LOCAL_PREVIEW_NAME", "js-local-preview").strip() or "js-local-preview"
    out = env.get("OUTPUT_DIR", "preview").strip() or "preview"
    tm = project_dir / "tampermonkey-loader.user.js"
    css_rev = _css_preview_revision(project_dir, out, css)
    stylus_url = f"http://127.0.0.1:{PREVIEW_PORT}/{out}/{css}.user.css"
    if css_rev is not None:
        stylus_url = f"{stylus_url}?rev={css_rev}"
    return {
        "stylus": stylus_url,
        "js_preview": f"http://127.0.0.1:{PREVIEW_PORT}/{out}/{js}.js",
        "site": env.get("SITE_URL", ""),
        "tampermonkey_loader": (
            f"http://127.0.0.1:{SERVICE_PORT}/api/tampermonkey-loader.user.js"
            if tm.is_file()
            else ""
        ),
    }


def diagnostics(project_dir: Path) -> list[dict[str, str]]:
    env = load_env(project_dir / ".env.local")
    urls = preview_urls(project_dir)

    def row(label: str, ok: bool, detail: str = "") -> dict[str, str]:
        return {"label": label, "status": "ok" if ok else "fail", "detail": detail}

    checks = [
        row(".env.local", (project_dir / ".env.local").is_file()),
        row("SITE_URL set", bool(env.get("SITE_URL"))),
        row("main/styles.css", (project_dir / "main/styles.css").is_file()),
        row("main/main.js", (project_dir / "main/main.js").is_file()),
        row("Git repository", find_git_root(project_dir) is not None),
    ]
    if port_open(PREVIEW_PORT):
        checks.append(row("CSS preview URL", url_ok(urls["stylus"]), urls["stylus"]))
        checks.append(row("JS preview URL", url_ok(urls["js_preview"]), urls["js_preview"]))
    if urls["tampermonkey_loader"]:
        checks.append(
            row(
                "Tampermonkey loader URL",
                url_ok(urls["tampermonkey_loader"]),
                urls["tampermonkey_loader"],
            )
        )
    return checks
