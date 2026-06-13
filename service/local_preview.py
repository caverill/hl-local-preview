"""Start the local preview HTTP server for the active project directory."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / "scripts"
PREVIEW_PORT = 5500
ROOT_MARKER_PATH = "/.hl-preview-root"


def _ensure_scripts_importable() -> None:
    scripts = str(SCRIPTS_DIR)
    if scripts not in sys.path:
        sys.path.insert(0, scripts)


def _kill_port_listeners(port: int) -> None:
    _ensure_scripts_importable()
    from preview_server import kill_port_listeners

    kill_port_listeners(port)


def _remote_preview_root(port: int = PREVIEW_PORT) -> str | None:
    try:
        with urlopen(f"http://127.0.0.1:{port}{ROOT_MARKER_PATH}", timeout=1.0) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except (OSError, URLError, json.JSONDecodeError, ValueError):
        return None
    root = payload.get("root")
    return str(root) if root else None


def ensure_preview_server(project_dir: Path) -> None:
    """Serve preview assets from project_dir, replacing a stale server if needed."""
    _ensure_scripts_importable()
    from preview_server import set_serve_root, start_preview_server

    resolved = project_dir.resolve()
    set_serve_root(resolved)

    remote_root = _remote_preview_root()
    if remote_root != str(resolved):
        _kill_port_listeners(PREVIEW_PORT)
        time.sleep(0.2)

    start_preview_server()
