"""Shared local preview HTTP server for CSS and JS watchers."""

from __future__ import annotations

import http.server
import socket
import socketserver
import threading
import time
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent
PREVIEW_PORT = 5500

_httpd: socketserver.TCPServer | None = None


class PreviewHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def guess_type(self, path: str) -> str:
        if path.endswith(".js"):
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
            print(f"Preview server already running on port {PREVIEW_PORT}")
            return
        raise RuntimeError(
            f"Port {PREVIEW_PORT} is in use but not responding. "
            f"Stop the old process: lsof -iTCP:{PREVIEW_PORT} -sTCP:LISTEN -t | xargs kill"
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
