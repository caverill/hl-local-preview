#!/usr/bin/env python3
"""HTTP API for the HL Local Preview web UI."""

from __future__ import annotations

import atexit
import subprocess
import sys
import webbrowser
from pathlib import Path

from flask import Flask, Response, jsonify, request
from flask_cors import CORS

from service import project
from service.tampermonkey_loader import read_loader_script
from service.folder_picker import pick_folder
from service.open_editor import EDITORS, list_available_editors, open_in_editor
from service.open_path import open_path as open_folder
from service.watcher import state as watcher

app = Flask(__name__)
CORS(app)


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


@app.get("/api/tampermonkey-loader.user.js")
def tampermonkey_loader():
    project_dir = project.get_project_dir()
    try:
        source = read_loader_script(project_dir)
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    return Response(
        source,
        mimetype="application/javascript",
        headers={"Cache-Control": "no-store"},
    )


@app.get("/api/status")
def status():
    d = project.active_project_dir()
    return jsonify({
        "watcher_running": watcher.running,
        "watcher_mode": watcher.mode if watcher.running else None,
        "preview_port": project.PREVIEW_PORT,
        "preview_port_open": project.port_open(project.PREVIEW_PORT),
        "project_dir": str(d),
        "missing_files": project.missing_files(d),
        **project.api_build_times(),
    })


@app.get("/api/project")
def get_project():
    d = project.active_project_dir()
    info = project.project_info(d)
    info.update(project.api_build_times())
    return jsonify(info)


@app.get("/api/preferences")
def get_preferences():
    return jsonify(project.get_preferences())


@app.put("/api/preferences")
def put_preferences():
    data = request.get_json(force=True, silent=True) or {}
    allowed = {}
    if "auto_start_watcher" in data:
        allowed["auto_start_watcher"] = data["auto_start_watcher"]
    if "desktop_notifications" in data:
        allowed["desktop_notifications"] = data["desktop_notifications"]
    if "last_watcher_mode" in data:
        allowed["last_watcher_mode"] = data["last_watcher_mode"]
    return jsonify(project.update_preferences(**allowed))


@app.put("/api/setup")
def put_setup():
    data = request.get_json(force=True, silent=True) or {}
    path = (data.get("path") or "").strip()
    if not path:
        return jsonify({"error": "path required"}), 400
    p = Path(path).expanduser().resolve()
    if not p.is_dir():
        return jsonify({"error": "not a directory"}), 400

    site_url = str(data.get("site_url", "")).strip()
    if not site_url:
        return jsonify({"error": project.SITE_URL_SAVE_MSG}), 400

    project.set_project_dir(p)
    d = project.get_project_dir()
    _, preview_ok, preview_error = project.apply_setup_env(
        d,
        site_url=site_url,
        match_mode=str(data.get("match_mode", "url-prefix")).strip(),
        match_regexp_pattern=str(data.get("match_regexp_pattern", "")).strip(),
    )

    response = {
        "preview_built": preview_ok,
        **project.project_info(d),
    }
    if not preview_ok:
        response["preview_error"] = preview_error
    return jsonify(response)


@app.put("/api/project")
def put_project():
    data = request.get_json(force=True, silent=True) or {}
    path = (data.get("path") or "").strip()
    if not path:
        return jsonify({"error": "path required"}), 400
    p = Path(path).expanduser().resolve()
    if not p.is_dir():
        return jsonify({"error": "not a directory"}), 400
    project.set_project_dir(p)
    return jsonify({"path": str(p)})


@app.put("/api/config")
def put_config():
    data = request.get_json(force=True, silent=True) or {}
    d = project.get_project_dir()
    if "site_url" in data:
        _, preview_ok, preview_error = project.apply_setup_env(
            d,
            site_url=str(data["site_url"]).strip(),
            match_mode=project.match_mode_from_env(project.load_env(d / ".env.local")),
        )
        response: dict = {"ok": True, "urls": project.preview_urls(d), "preview_built": preview_ok}
        if not preview_ok:
            response["preview_error"] = preview_error
        return jsonify(response)
    return jsonify({"ok": True, "urls": project.preview_urls(d)})


@app.post("/api/project/sync")
def sync_project_files():
    if watcher.running:
        return jsonify({"error": "stop the watcher before updating project files"}), 409
    data = request.get_json(force=True, silent=True) or {}
    path = (data.get("path") or "").strip()
    if path:
        p = Path(path).expanduser().resolve()
        if not p.is_dir():
            return jsonify({"error": "not a directory"}), 400
        project.set_project_dir(p)
    d = project.get_project_dir()
    files = data.get("files")
    if files is not None and not isinstance(files, list):
        return jsonify({"error": "files must be a list"}), 400
    updated = project.sync_project_files(d, files if isinstance(files, list) else None)
    return jsonify({"updated": updated, **project.project_info(d)})


@app.post("/api/project/files")
def create_files():
    data = request.get_json(force=True, silent=True) or {}
    path = (data.get("path") or "").strip()
    if path:
        p = Path(path).expanduser().resolve()
        if not p.is_dir():
            return jsonify({"error": "not a directory"}), 400
        project.set_project_dir(p)
    d = project.get_project_dir()
    created = project.create_missing_files(d)
    project.ensure_env_file(d)
    preview_ok, preview_error = project.finalize_project_setup(d)
    response = {
        "created": created,
        "missing": project.missing_files(d),
        "preview_built": preview_ok,
        **project.project_info(d),
    }
    if not preview_ok:
        response["preview_error"] = preview_error
    return jsonify(response)


@app.post("/api/watcher/start")
def start_watcher():
    data = request.get_json(force=True, silent=True) or {}
    mode = str(data.get("mode", "both")).lower()
    d = project.get_project_dir()
    missing = project.missing_files(d)
    if missing:
        return jsonify({"error": "missing required files", "missing": missing}), 400
    if not project.has_site_url(d):
        return jsonify({"error": project.SITE_URL_REQUIRED_MSG}), 400
    missing_deps = project.missing_python_deps()
    if missing_deps:
        return jsonify({"error": project.PYTHON_DEPS_REQUIRED_MSG, "missing_deps": missing_deps}), 400
    try:
        watcher.start(d, mode)
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 400
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"error": str(exc), "running": False}), 500
    except Exception as exc:
        watcher.stop()
        return jsonify({"error": str(exc), "running": False}), 500
    if not watcher.running:
        return jsonify({"error": "Watcher failed to start", "running": False}), 500
    project.update_preferences(last_watcher_mode=mode)
    return jsonify({"running": True, "mode": watcher.mode})


@app.post("/api/watcher/stop")
def stop_watcher():
    watcher.stop()
    return jsonify({"running": False})


@app.post("/api/watcher/restart")
def restart_watcher():
    d = project.get_project_dir()
    if not project.has_site_url(d):
        return jsonify({"error": project.SITE_URL_REQUIRED_MSG}), 400
    missing_deps = project.missing_python_deps()
    if missing_deps:
        return jsonify({"error": project.PYTHON_DEPS_REQUIRED_MSG, "missing_deps": missing_deps}), 400
    try:
        watcher.restart()
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 400
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"error": str(exc), "running": False}), 500
    except Exception as exc:
        watcher.stop()
        return jsonify({"error": str(exc), "running": False}), 500
    return jsonify({"running": watcher.running, "mode": watcher.mode})


@app.post("/api/preview/rebuild")
def rebuild_preview():
    data = request.get_json(force=True, silent=True) or {}
    mode = str(data.get("mode", "both")).lower()
    d = project.get_project_dir()
    missing = project.missing_files(d)
    if missing:
        return jsonify({"error": "missing required files", "missing": missing}), 400
    if not project.has_site_url(d):
        return jsonify({"error": project.SITE_URL_REQUIRED_MSG}), 400
    if watcher.running:
        return jsonify({"error": "stop the watcher before rebuilding"}), 409
    preview_ok, preview_error = project.rebuild_preview_once(d, mode)
    response = {"preview_built": preview_ok, **project.project_info(d)}
    if not preview_ok:
        response["preview_error"] = preview_error
        return jsonify(response), 500
    return jsonify(response)


@app.get("/api/logs")
def logs():
    since = int(request.args.get("since", 0))
    return jsonify({"entries": watcher.logs_since(since), "cursor": watcher.log_cursor()})


@app.post("/api/logs/clear")
def clear_logs():
    since = watcher.clear_logs()
    return jsonify({"ok": True, "since": since})


@app.get("/api/diagnostics")
def diagnostics():
    return jsonify({"checks": project.diagnostics(project.get_project_dir())})


@app.post("/api/deps/install")
def install_deps():
    d = project.get_project_dir()
    req = d / "requirements.txt"
    if not req.is_file():
        return jsonify({"error": "requirements.txt not found"}), 400
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", str(req)],
        cwd=str(d),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    for line in (result.stdout or "").splitlines() + (result.stderr or "").splitlines():
        if line.strip():
            watcher.append_log("info" if result.returncode == 0 else "err", line.strip())
    if result.returncode != 0:
        return jsonify({"error": "pip install failed"}), 500
    updated = project.ensure_watcher_scripts(d)
    if updated:
        watcher.append_log("info", f"Updated watcher scripts: {', '.join(updated)}")
    return jsonify({"ok": True, "updated_scripts": updated})


@app.get("/api/project/inspect")
def inspect_project():
    raw = (request.args.get("path") or "").strip()
    if not raw:
        return jsonify({"error": "path required"}), 400
    p = Path(raw).expanduser()
    return jsonify(project.inspect_project_path(p))


@app.post("/api/project/pick-folder")
def pick_project_folder():
    data = request.get_json(force=True, silent=True) or {}
    initial = (data.get("initial") or "").strip() or str(project.get_project_dir())
    picked = pick_folder(initial)
    if not picked:
        return jsonify({"cancelled": True})
    path = Path(picked).expanduser().resolve()
    if not path.is_dir():
        return jsonify({"error": "not a directory"}), 400
    return jsonify(project.inspect_project_path(path))


@app.post("/api/open")
def open_url():
    data = request.get_json(force=True, silent=True) or {}
    url = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "url required"}), 400
    webbrowser.open(url)
    return jsonify({"ok": True})


@app.get("/api/editors")
def get_editors():
    return jsonify({"editors": list_available_editors()})


@app.post("/api/open/editor")
def open_editor_endpoint():
    data = request.get_json(force=True, silent=True) or {}
    editor = (data.get("editor") or "").strip().lower()
    raw = (data.get("path") or "").strip()
    if not editor:
        return jsonify({"error": "editor required"}), 400
    if editor not in EDITORS:
        return jsonify({"error": "unknown editor"}), 400
    if not raw:
        return jsonify({"error": "path required"}), 400

    p = Path(raw).expanduser()
    if not p.is_absolute():
        p = project.get_project_dir() / p

    try:
        open_in_editor(editor, p)
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 400
    except subprocess.CalledProcessError as exc:
        return jsonify({"error": f"could not open in editor ({exc.returncode})"}), 500
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify({"ok": True})


@app.post("/api/open/path")
def open_path_endpoint():
    data = request.get_json(force=True, silent=True) or {}
    raw = (data.get("path") or "").strip()
    if not raw:
        return jsonify({"error": "path required"}), 400
    try:
        open_folder(Path(raw))
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 400
    except subprocess.CalledProcessError as exc:
        return jsonify({"error": f"could not open folder ({exc.returncode})"}), 500
    return jsonify({"ok": True})


atexit.register(watcher.stop)


def main() -> None:
    print(f"HL Local Preview API → http://127.0.0.1:{project.SERVICE_PORT}")
    app.run(host="127.0.0.1", port=project.SERVICE_PORT, threaded=True, use_reloader=False)


if __name__ == "__main__":
    main()
