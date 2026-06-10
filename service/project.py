from __future__ import annotations

import json
import shutil
import socket
import subprocess
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
    "scripts/preview_server.py",
    "tampermonkey-loader.user.js",
    ".env.local.example",
    "requirements.txt",
]

TEMPLATE_ENV = """\
SITE_URL=https://example.com/your-sandbox/
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
    "main/styles.css": "/* CMS custom CSS — edit and upload when ready */\n",
    "main/main.js": (
        "$(function () {\n"
        "  console.log('[hl-js-local-preview:main] ready');\n"
        "});\n"
    ),
    "requirements.txt": "watchdog>=3.0.0\nflask>=3.0.0\nflask-cors>=4.0.0\n",
    ".env.local.example": TEMPLATE_ENV,
}


def load_settings() -> dict:
    if not SETTINGS_FILE.is_file():
        return {"project_dir": str(REPO_ROOT)}
    try:
        return json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"project_dir": str(REPO_ROOT)}


def save_settings(data: dict) -> None:
    SETTINGS_FILE.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def get_project_dir() -> Path:
    stored = load_settings().get("project_dir", "")
    path = Path(stored) if stored else REPO_ROOT
    return path if path.is_dir() else REPO_ROOT


def set_project_dir(path: Path) -> None:
    save_settings({"project_dir": str(path.resolve())})


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
    return env_path


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
    if not path.is_dir():
        return {
            "path": str(path),
            "valid": False,
            "missing_files": [],
            **git_repo_info(path),
        }
    return {
        "path": str(path),
        "valid": True,
        "missing_files": missing_files(path),
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
        "urls": preview_urls(project_dir),
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
        src = REPO_ROOT / rel
        if src.is_file():
            shutil.copy2(src, dest)
        elif rel in INLINE_TEMPLATES:
            dest.write_text(INLINE_TEMPLATES[rel], encoding="utf-8")
        else:
            dest.touch()
        created.append(rel)
    return created


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


def preview_urls(project_dir: Path) -> dict[str, str]:
    env = load_env(project_dir / ".env.local")
    css = env.get("CMS_LOCAL_PREVIEW_NAME", "cms-local-preview").strip() or "cms-local-preview"
    js = env.get("JS_LOCAL_PREVIEW_NAME", "js-local-preview").strip() or "js-local-preview"
    out = env.get("OUTPUT_DIR", "preview").strip() or "preview"
    tm = project_dir / "tampermonkey-loader.user.js"
    return {
        "stylus": f"http://127.0.0.1:{PREVIEW_PORT}/{out}/{css}.user.css",
        "js_preview": f"http://127.0.0.1:{PREVIEW_PORT}/{out}/{js}.js",
        "site": env.get("SITE_URL", ""),
        "tampermonkey_loader": (
            f"http://127.0.0.1:{PREVIEW_PORT}/tampermonkey-loader.user.js"
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
        row(f"Port {PREVIEW_PORT}", port_open(PREVIEW_PORT)),
    ]
    if port_open(PREVIEW_PORT):
        checks.append(row("CSS preview URL", url_ok(urls["stylus"]), urls["stylus"]))
        checks.append(row("JS preview URL", url_ok(urls["js_preview"]), urls["js_preview"]))
        if urls["tampermonkey_loader"]:
            checks.append(
                row("Tampermonkey loader URL", url_ok(urls["tampermonkey_loader"]), urls["tampermonkey_loader"])
            )
    return checks
