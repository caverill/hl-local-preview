#!/usr/bin/env python3
"""Start the HL Local Preview web UI (React) + Python API."""

from __future__ import annotations

import shutil
import signal
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UI = ROOT / "desktop"
SERVICE_PORT = 17890
UI_PORT = 1420
UI_URL = f"http://localhost:{UI_PORT}"


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
    print("HL Local Preview — web UI\n")

    if sys.version_info < (3, 10):
        print("Need Python 3.10+")
        return 1
    if not shutil.which("npm"):
        print("Need Node.js — https://nodejs.org")
        return 1

    try:
        import flask  # noqa: F401
    except ImportError:
        print("Run: pip install -r requirements.txt")
        return 1

    procs: list[subprocess.Popen] = []

    def stop(*_):
        for p in procs:
            if p.poll() is None:
                p.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)

    if not port_open(SERVICE_PORT):
        procs.append(subprocess.Popen(
            [sys.executable, "-m", "service.api"],
            cwd=str(ROOT),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        ))
        for _ in range(50):
            if port_open(SERVICE_PORT):
                break
            time.sleep(0.1)
    print(f"  ✓ API http://127.0.0.1:{SERVICE_PORT}")

    if not (UI / "node_modules").is_dir():
        print("  … npm install")
        subprocess.run(["npm", "install"], cwd=str(UI), check=True)

    if not port_open(UI_PORT):
        procs.append(subprocess.Popen(
            ["npm", "run", "dev"],
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
