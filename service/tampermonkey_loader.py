"""API wrapper around scripts/tampermonkey_loader.py."""

from __future__ import annotations

import sys
from pathlib import Path

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from tampermonkey_loader import sync_tampermonkey_loader  # noqa: E402


def read_loader_script(project_dir: Path) -> str:
    loader_path = project_dir / "tampermonkey-loader.user.js"
    if not loader_path.is_file():
        raise FileNotFoundError("Missing tampermonkey-loader.user.js")

    sync_tampermonkey_loader(project_dir)
    return loader_path.read_text(encoding="utf-8")
