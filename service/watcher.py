from __future__ import annotations

import subprocess
import threading
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path


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
    _proc: subprocess.Popen[str] | None = field(default=None, repr=False)
    _log_id: int = 0
    _logs: deque[LogEntry] = field(default_factory=lambda: deque(maxlen=500))
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def append_log(self, level: str, message: str) -> None:
        with self._lock:
            self._log_id += 1
            self._logs.append(LogEntry(self._log_id, level, message))

    def logs_since(self, since_id: int = 0) -> list[dict]:
        with self._lock:
            return [
                {"id": e.id, "level": e.level, "message": e.message}
                for e in self._logs
                if e.id > since_id
            ]

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
        script = project_dir / "scripts" / "watch.py"
        if not script.is_file():
            raise FileNotFoundError(f"Missing {script}")

        env_path = project_dir / ".env.local"
        args = [
            "python3",
            "-u",
            str(script),
            mode,
            "--no-open",
            "--env",
            str(env_path),
        ]
        self.append_log("cmd", f"python3 -u scripts/watch.py {mode} --no-open")

        self._proc = subprocess.Popen(
            args,
            cwd=str(project_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        self.running = True
        self.mode = mode
        self.project_dir = project_dir

        assert self._proc.stdout and self._proc.stderr
        threading.Thread(target=self._reader, args=(self._proc.stdout, "info"), daemon=True).start()
        threading.Thread(target=self._reader, args=(self._proc.stderr, "err"), daemon=True).start()
        threading.Thread(target=self._wait, daemon=True).start()

    def _wait(self) -> None:
        if not self._proc:
            return
        code = self._proc.wait()
        self.running = False
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
        if self.project_dir:
            self.start(self.project_dir, self.mode)


state = WatcherState()
