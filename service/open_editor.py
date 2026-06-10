from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

EDITORS = {
    "cursor": {
        "cli": "cursor",
        "mac_app": "Cursor",
        "label": "Cursor",
    },
    "vscode": {
        "cli": "code",
        "mac_app": "Visual Studio Code",
        "label": "VS Code",
    },
}


def _mac_app_exists(app_name: str) -> bool:
    app_path = Path("/Applications") / f"{app_name}.app"
    if app_path.is_dir():
        return True
    result = subprocess.run(
        ["osascript", "-e", f'exists application "{app_name}"'],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0 and result.stdout.strip().lower() == "true"


def is_editor_available(editor_id: str) -> bool:
    cfg = EDITORS.get(editor_id)
    if not cfg:
        return False
    if shutil.which(cfg["cli"]):
        return True
    if sys.platform == "darwin":
        return _mac_app_exists(cfg["mac_app"])
    return False


def list_available_editors() -> list[dict[str, str | bool]]:
    return [
        {"id": editor_id, "label": cfg["label"], "available": is_editor_available(editor_id)}
        for editor_id, cfg in EDITORS.items()
    ]


def open_in_editor(editor_id: str, path: Path) -> None:
    cfg = EDITORS.get(editor_id)
    if not cfg:
        raise ValueError(f"Unknown editor: {editor_id}")

    resolved = path.expanduser().resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"Not found: {resolved}")

    cli = shutil.which(cfg["cli"])
    if cli:
        subprocess.run([cli, str(resolved)], check=True)
        return

    if sys.platform == "darwin" and _mac_app_exists(cfg["mac_app"]):
        subprocess.run(["open", "-a", cfg["mac_app"], str(resolved)], check=True)
        return

    raise FileNotFoundError(
        f"{cfg['label']} not found — install it or add the '{cfg['cli']}' command to PATH"
    )
