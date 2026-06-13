#!/usr/bin/env python3
"""Start the HL Local Preview web UI (React) + Python API."""

from __future__ import annotations

import shutil
import signal
import subprocess
import sys
import time
import webbrowser
import os
from pathlib import Path


def _configure_stdout() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, OSError, ValueError):
            pass

ROOT = Path(__file__).resolve().parent.parent
UI = ROOT / "desktop"
SERVICE_PORT = 17890
UI_PORT = 1420
UI_URL = f"http://localhost:{UI_PORT}"


def _ensure_supported_python() -> bool:
    if sys.platform != "win32":
        return True
    lower = sys.executable.lower()
    if "msys" in lower or "windowsapps" in lower:
        print("On Windows, start the app with the official Python install:")
        print("  python scripts/dev_desktop.py")
        print(f"Do not use python3 ({sys.executable})")
        return False
    return True


def _kill_port_listeners(port: int) -> None:
    sys.path.insert(0, str(ROOT / "scripts"))
    from preview_server import kill_port_listeners

    kill_port_listeners(port)


def port_open(port: int) -> bool:
    import socket

    for host in ("127.0.0.1", "::1"):
        family = socket.AF_INET6 if host == "::1" else socket.AF_INET
        try:
            with socket.socket(family, socket.SOCK_STREAM) as s:
                s.settimeout(0.2)
                if s.connect_ex((host, port)) == 0:
                    return True
        except OSError:
            continue
    return False


def main() -> int:
    _configure_stdout()
    print("HL Local Preview — web UI\n")

    if sys.version_info < (3, 10):
        print("Need Python 3.10+")
        return 1
    if not _ensure_supported_python():
        return 1
    npm = shutil.which("npm")
    if not npm:
        print("Need Node.js — https://nodejs.org")
        return 1

    try:
        import flask  # noqa: F401
        import watchdog  # noqa: F401
    except ImportError:
        print("Run: pip install -r requirements.txt")
        print(f"Use the same Python as this app: {sys.executable}")
        return 1

    procs: list[subprocess.Popen] = []

    def stop(*_):
        for p in procs:
            if p.poll() is None:
                p.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)

    if port_open(SERVICE_PORT):
        _kill_port_listeners(SERVICE_PORT)
        time.sleep(0.3)
    procs.append(subprocess.Popen(
        [sys.executable, "-m", "service.api"],
        cwd=str(ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env={
            **os.environ,
            "PYTHONIOENCODING": "utf-8",
            "PYTHONUTF8": "1",
        },
    ))
    for _ in range(50):
        if port_open(SERVICE_PORT):
            break
        time.sleep(0.1)
    print(f"  ✓ API http://127.0.0.1:{SERVICE_PORT}")
    print(f"    Python: {sys.executable}")

    if not (UI / "node_modules").is_dir():
        print("  … npm install")
        subprocess.run([npm, "install"], cwd=str(UI), check=True)

    if not port_open(UI_PORT):
        procs.append(subprocess.Popen(
            [npm, "run", "dev"],
            cwd=str(UI),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        ))
        for _ in range(150):
            if port_open(UI_PORT):
                break
            time.sleep(0.1)
        if not port_open(UI_PORT):
            print(f"  ✗ Vite failed on port {UI_PORT}")
            if sys.platform == "win32":
                print(f"    netstat -ano | findstr :{UI_PORT}")
            else:
                print(f"    lsof -iTCP:{UI_PORT} -sTCP:LISTEN -t | xargs kill")
            stop()
    print(f"  ✓ UI {UI_URL}\n")
    print("Press Ctrl+C to stop.\n")

    time.sleep(0.3)
    webbrowser.open(UI_URL)

    while True:
        for p in procs:
            if p.poll() is not None and p.returncode not in (0, None):
                stop()
        time.sleep(0.5)


if __name__ == "__main__":
    raise SystemExit(main())
