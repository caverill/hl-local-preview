"""Preview server helpers for the active project directory."""

from __future__ import annotations

import json
import os
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


def _kill_port_listeners(port: int, *, exclude_pids: set[int] | None = None) -> None:
    _ensure_scripts_importable()
    from preview_server import kill_port_listeners

    kill_port_listeners(port, exclude_pids=exclude_pids)


def kill_preview_port_listeners(port: int = PREVIEW_PORT) -> None:
    _kill_port_listeners(port, exclude_pids={os.getpid()})


def stop_preview_server_if_running() -> bool:
    """Shut down an in-process preview server without killing this process."""
    _ensure_scripts_importable()
    from preview_server import preview_server_running, stop_preview_server

    if not preview_server_running():
        return False
    stop_preview_server()
    return True


def release_preview_port(port: int = PREVIEW_PORT) -> None:
    """Free the preview port: graceful in-process shutdown, then external listeners only."""
    _ensure_scripts_importable()
    from preview_server import port_is_open

    stop_preview_server_if_running()
    time.sleep(0.2)
    if port_is_open(port):
        _kill_port_listeners(port, exclude_pids={os.getpid()})
        time.sleep(0.2)


def _remote_preview_root(port: int = PREVIEW_PORT) -> str | None:
    try:
        with urlopen(f"http://127.0.0.1:{port}{ROOT_MARKER_PATH}", timeout=1.0) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except (OSError, URLError, json.JSONDecodeError, ValueError):
        return None
    root = payload.get("root")
    return str(root) if root else None


def ensure_preview_server(project_dir: Path) -> None:
    """Remember which project directory the watcher should serve on port 5500.

    The preview HTTP server only runs inside the watcher subprocess — not the API —
    so freeing or replacing port 5500 never kills the web UI.
    """
    _ensure_scripts_importable()
    from preview_server import set_serve_root

    set_serve_root(project_dir.resolve())
