from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def pick_folder(initial: str | None = None) -> str | None:
    """Open a native folder picker. Returns absolute path or None if cancelled."""
    start = Path(initial).expanduser().resolve() if initial else None
    if start and not start.is_dir():
        start = start.parent if start.parent.is_dir() else None

    if sys.platform == "darwin":
        return _pick_folder_macos(start)
    return _pick_folder_tk(start)


def _pick_folder_macos(start: Path | None) -> str | None:
    if start:
        location = str(start).replace("\\", "\\\\").replace('"', '\\"')
        script = (
            f'POSIX path of (choose folder with prompt "Select project folder" '
            f'default location (POSIX file "{location}"))'
        )
    else:
        script = 'POSIX path of (choose folder with prompt "Select project folder")'

    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return None
    picked = result.stdout.strip()
    return picked or None


def _pick_folder_tk(start: Path | None) -> str | None:
    try:
        import tkinter as tk
        from tkinter import filedialog
    except ImportError:
        return None

    root = tk.Tk()
    root.withdraw()
    try:
        root.attributes("-topmost", True)
    except tk.TclError:
        pass
    picked = filedialog.askdirectory(
        title="Select project folder",
        initialdir=str(start) if start else None,
        mustexist=True,
    )
    root.destroy()
    return picked or None
