from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def open_path(path: Path) -> None:
    """Open a folder in the system file manager."""
    resolved = path.expanduser().resolve()
    if not resolved.is_dir():
        raise FileNotFoundError(f"Not a directory: {resolved}")

    if sys.platform == "darwin":
        subprocess.run(["open", str(resolved)], check=True)
        return
    if sys.platform == "win32":
        subprocess.run(["explorer", str(resolved)], check=True)
        return
    subprocess.run(["xdg-open", str(resolved)], check=True)
