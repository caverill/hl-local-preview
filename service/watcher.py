from __future__ import annotations

import os
import subprocess
import sys
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from service import project


def _sanitize_log_line(line: str) -> str:
    return project.sanitize_log_text(line)


@dataclass
class LogEntry:
    id: int
    level: str
    message: str


@dataclass
class WatcherState:
    running: bool = False
    mode: str = "both"
    project_dir: Path | None = None
    last_rebuild_at: str | None = None
    _proc: subprocess.Popen[str] | None = field(default=None, repr=False)
    _log_id: int = 0
    _logs: deque[LogEntry] = field(default_factory=lambda: deque(maxlen=500))
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def note_rebuild(self) -> None:
        with self._lock:
            self.last_rebuild_at = datetime.now(timezone.utc).isoformat()

    def append_log(self, level: str, message: str) -> None:
        message = _sanitize_log_line(message)
        with self._lock:
            self._log_id += 1
            self._logs.append(LogEntry(self._log_id, level, message))
            lower = message.lower()
            if level == "ok" and ("rebuilt" in lower or "updated" in lower):
                self.last_rebuild_at = datetime.now(timezone.utc).isoformat()

    def logs_since(self, since_id: int = 0) -> list[dict]:
        with self._lock:
            return [
                {"id": e.id, "level": e.level, "message": e.message}
                for e in self._logs
                if e.id > since_id
            ]

    def log_cursor(self) -> int:
        with self._lock:
            return self._log_id

    def clear_logs(self) -> int:
        """Drop buffered log lines; return the current id cursor for since= polling."""
        with self._lock:
            self._logs.clear()
            return self._log_id

    def _classify(self, line: str) -> str:
        lower = line.lower()
        if "error" in lower:
            return "err"
        if "updated" in lower or "rebuilt" in lower:
            return "ok"
        if "warn" in lower:
            return "warn"
        return "info"

    def _reader(self, stream, level: str) -> None:
        for raw in stream:
            line = raw.rstrip()
            if line:
                self.append_log(
                    self._classify(line) if level == "info" else level,
                    line,
                )

    def start(self, project_dir: Path, mode: str = "both") -> None:
        self.stop()
        if not project.has_site_url(project_dir):
            raise ValueError(project.SITE_URL_REQUIRED_MSG)
        missing_deps = project.missing_python_deps()
        if missing_deps:
            raise ValueError(project.PYTHON_DEPS_REQUIRED_MSG)
        updated_scripts = project.ensure_watcher_scripts(project_dir)
        if updated_scripts:
            self.append_log("info", f"Updated watcher scripts: {', '.join(updated_scripts)}")
        script = project_dir / "scripts" / "watch.py"
        if not script.is_file():
            raise FileNotFoundError(f"Missing {script}")

        env_path = project_dir / ".env.local"
        py = project.python_executable()
        args = [
            py,
            "-u",
            str(script),
            mode,
            "--no-open",
            "--env",
            str(env_path),
        ]
        self.append_log("cmd", f"{py} -u scripts/watch.py {mode} --no-open")

        self._proc = subprocess.Popen(
            args,
            cwd=str(project_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=project._subprocess_env(),
            bufsize=1,
        )
        self.running = True
        self.mode = mode
        self.project_dir = project_dir

        assert self._proc.stdout and self._proc.stderr
        threading.Thread(target=self._reader, args=(self._proc.stdout, "info"), daemon=True).start()
        threading.Thread(target=self._reader, args=(self._proc.stderr, "err"), daemon=True).start()
        proc = self._proc
        threading.Thread(target=self._wait, args=(proc,), daemon=True).start()

        for _ in range(20):
            if proc.poll() is not None:
                break
            time.sleep(0.05)
        if proc.poll() is not None:
            self.running = False
            self._proc = None
            raise RuntimeError(
                "Watcher failed to start. Restart the app with "
                f"`python scripts/dev_desktop.py` (using {py})."
            )

    def _wait(self, proc: subprocess.Popen[str]) -> None:
        code = proc.wait()
        if self._proc is not proc:
            return
        self.running = False
        self._proc = None
        if code != 0:
            self.append_log("warn", f"Watcher exited (code {code})")

    def stop(self) -> None:
        if self._proc and self._proc.poll() is None:
            self._proc.terminate()
            try:
                self._proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self._proc.kill()
        self._proc = None
        self.running = False

    def restart(self) -> None:
        if not self.project_dir:
            return
        if not project.has_site_url(self.project_dir):
            self.append_log("warn", project.SITE_URL_REQUIRED_MSG)
            return
        mode = self.mode
        self.append_log("cmd", f"Restarting watcher ({mode})...")
        self.start(self.project_dir, mode)


state = WatcherState()
