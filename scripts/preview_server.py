"""Shared local preview HTTP server for CSS and JS watchers."""

from __future__ import annotations

import http.server
import json
import socket
import socketserver
import subprocess
import sys
import threading
import time
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent
PREVIEW_PORT = 5500
ROOT_MARKER_PATH = "/.hl-preview-root"

_serve_root = ROOT
_httpd: socketserver.TCPServer | None = None


def get_serve_root() -> Path:
    return _serve_root


def set_serve_root(path: Path) -> None:
    global _serve_root
    _serve_root = path.resolve()


class PreviewHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(_serve_root), **kwargs)

    def do_GET(self) -> None:
        if self.path.split("?", 1)[0] == ROOT_MARKER_PATH:
            payload = json.dumps({"root": str(_serve_root)}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)
            return
        super().do_GET()

    def guess_type(self, path: str) -> str:
        if path.endswith(".user.js") or path.endswith(".js"):
            return "application/javascript"
        if path.endswith(".user.css"):
            return "text/css"
        return super().guess_type(path)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format: str, *args) -> None:
        pass


class ThreadedPreviewServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


def kill_port_listeners(port: int) -> None:
    """Stop processes listening on port (Unix: lsof/kill; Windows: netstat/taskkill)."""
    if sys.platform == "win32":
        result = subprocess.run(
            ["netstat", "-ano", "-p", "tcp"],
            capture_output=True,
            text=True,
            check=False,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        for line in result.stdout.splitlines():
            if "LISTENING" not in line.upper():
                continue
            parts = line.split()
            if len(parts) < 5:
                continue
            local_addr, pid = parts[1], parts[-1]
            if local_addr.rsplit(":", 1)[-1] != str(port) or not pid.isdigit():
                continue
            subprocess.run(
                ["taskkill", "/F", "/PID", pid],
                check=False,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
        return

    result = subprocess.run(
        ["lsof", f"-iTCP:{port}", "-sTCP:LISTEN", "-t"],
        capture_output=True,
        text=True,
        check=False,
    )
    for pid in result.stdout.strip().split():
        if pid.isdigit():
            subprocess.run(["kill", pid], check=False)


def port_is_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.2)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def preview_server_is_responding(port: int = PREVIEW_PORT) -> bool:
    """Return True if the preview port is serving HTTP from this project."""
    for url in (f"http://127.0.0.1:{port}/preview/", f"http://127.0.0.1:{port}/"):
        try:
            with urlopen(url, timeout=1.0) as resp:
                if resp.status < 500:
                    return True
        except OSError:
            continue
    return False


def start_preview_server() -> None:
    """Start the preview server, or reuse one already listening on port 5500."""
    global _httpd

    if port_is_open(PREVIEW_PORT):
        if preview_server_is_responding():
            remote_root = None
            try:
                with urlopen(f"http://127.0.0.1:{PREVIEW_PORT}{ROOT_MARKER_PATH}", timeout=1.0) as resp:
                    remote_root = json.loads(resp.read().decode("utf-8")).get("root")
            except OSError:
                remote_root = None
            if remote_root is not None and remote_root == str(_serve_root):
                print(f"Preview server already running on port {PREVIEW_PORT}")
                return
            print(
                f"Replacing preview server on port {PREVIEW_PORT} "
                f"(was {remote_root or 'unknown'}, now {_serve_root})"
            )
            if _httpd is not None:
                _httpd.shutdown()
                _httpd.server_close()
                _httpd = None
            else:
                kill_port_listeners(PREVIEW_PORT)
                time.sleep(0.2)
        raise RuntimeError(
            f"Port {PREVIEW_PORT} is in use but not responding. "
            + (
                f"Stop the old process: netstat -ano | findstr :{PREVIEW_PORT}"
                if sys.platform == "win32"
                else f"Stop the old process: lsof -iTCP:{PREVIEW_PORT} -sTCP:LISTEN -t | xargs kill"
            )
        )

    _httpd = ThreadedPreviewServer(("127.0.0.1", PREVIEW_PORT), PreviewHandler)
    thread = threading.Thread(target=_httpd.serve_forever, daemon=True)
    thread.start()

    for _ in range(30):
        if port_is_open(PREVIEW_PORT):
            break
        time.sleep(0.1)

    print(f"Started preview server on port {PREVIEW_PORT}")


def stop_preview_server() -> None:
    global _httpd

    if _httpd is None:
        return

    _httpd.shutdown()
    _httpd.server_close()
    _httpd = None
    print("Stopped preview server")
