"""Sync Tampermonkey loader @match rules from SITE_URL / match mode in .env.local."""

from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import urlparse

LOADER_FILENAME = "tampermonkey-loader.user.js"
SERVICE_PORT = 17890
MATCH_BLOCK_START = "// AUTO-MATCH-START - synced from SITE_URL in .env.local"
MATCH_BLOCK_END = "// AUTO-MATCH-END"
UPDATE_URL_LINE = (
    f"// @updateURL      http://127.0.0.1:{SERVICE_PORT}/api/tampermonkey-loader.user.js"
)


def load_env(env_path: Path) -> dict[str, str]:
    if not env_path.is_file():
        return {}
    out: dict[str, str] = {}
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, _, val = line.partition("=")
        out[key.strip()] = val.strip()
    return out


def env_truthy(value: str | None) -> bool:
    if not value:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def match_mode_from_env(env: dict[str, str]) -> str:
    if env_truthy(env.get("MATCH_REGEXP")):
        return "regexp"
    if env_truthy(env.get("MATCH_URL")):
        return "url"
    if env_truthy(env.get("MATCH_DOMAIN")):
        return "domain"
    if env_truthy(env.get("MATCH_URL_PREFIX")):
        return "url-prefix"
    return "url-prefix"


def tampermonkey_directives(env: dict[str, str]) -> list[tuple[str, str]]:
    site_url = env.get("SITE_URL", "").strip()
    if not site_url:
        return []

    mode = match_mode_from_env(env)
    directives: list[tuple[str, str]] = []

    if mode == "domain" or env_truthy(env.get("MATCH_DOMAIN")):
        parsed = urlparse(site_url)
        domain = parsed.netloc or site_url
        directives.append(("match", f"*://{domain}/*"))

    if mode == "url-prefix" or env_truthy(env.get("MATCH_URL_PREFIX")):
        directives.append(("include", url_prefix_include_pattern(site_url)))

    if mode == "url" or env_truthy(env.get("MATCH_URL")):
        directives.append(("match", site_url))
        directives.append(("include", url_prefix_include_pattern(site_url)))

    if mode == "regexp" or env_truthy(env.get("MATCH_REGEXP")):
        pattern = env.get("MATCH_REGEXP_PATTERN", "").strip() or default_regexp_pattern(site_url)
        directives.append(("include", pattern))

    if not directives:
        directives.append(("include", url_prefix_include_pattern(site_url)))

    return directives


def url_prefix_include_pattern(site_url: str) -> str:
    parsed = urlparse(site_url)
    if not parsed.netloc:
        return f"^{re.escape(site_url.rstrip('/'))}.*"

    host = re.escape(parsed.netloc)
    path = re.escape(parsed.path.rstrip("/"))
    return f"^https?://{host}{path}.*"


def default_regexp_pattern(site_url: str) -> str:
    escaped = re.escape(site_url.rstrip("/"))
    return f"^{escaped}(/.*)?$"


def format_match_block(directives: list[tuple[str, str]]) -> list[str]:
    lines = [MATCH_BLOCK_START]
    for directive, pattern in directives:
        if directive == "include":
            if not pattern.startswith("/"):
                pattern = f"/{pattern}/"
            lines.append(f"// @include       {pattern}")
        else:
            lines.append(f"// @match          {pattern}")
    lines.append(MATCH_BLOCK_END)
    return lines


def _is_match_block_start(line: str) -> bool:
    stripped = line.strip()
    return stripped == MATCH_BLOCK_START or stripped.startswith("// AUTO-MATCH-START")


def _replace_or_insert_block(lines: list[str], block: list[str]) -> list[str]:
    start = next((i for i, line in enumerate(lines) if _is_match_block_start(line)), None)
    end = next((i for i, line in enumerate(lines) if line.strip() == MATCH_BLOCK_END), None)

    if start is not None and end is not None and end >= start:
        return [*lines[:start], *block, *lines[end + 1 :]]

    out: list[str] = []
    in_header = False
    inserted = False

    for line in lines:
        stripped = line.strip()
        if stripped == "// ==UserScript==":
            in_header = True
            out.append(line)
            continue

        if in_header and stripped == "// ==/UserScript==":
            if not inserted:
                if out and out[-1].strip():
                    out.append("//")
                out.extend(block)
                out.append("//")
                inserted = True
            in_header = False
            out.append(line)
            continue

        if in_header and (
            stripped.startswith("// @match")
            or stripped.startswith("// @include")
            or stripped.startswith("// Match the same pages")
            or stripped.startswith("// AUTO-MATCH-START")
        ):
            if not inserted:
                if out and out[-1].strip():
                    out.append("//")
                out.extend(block)
                out.append("//")
                inserted = True
            continue

        out.append(line)

    return out


def _ensure_update_url(lines: list[str]) -> list[str]:
    if any(line.strip().startswith("// @updateURL") for line in lines):
        return [
            UPDATE_URL_LINE if line.strip().startswith("// @updateURL") else line
            for line in lines
        ]

    out: list[str] = []
    inserted = False
    for line in lines:
        out.append(line)
        if not inserted and line.strip().startswith("// @author"):
            out.append(UPDATE_URL_LINE)
            inserted = True
    return out


def _bump_version_if_needed(original: str, updated: str, new_block: list[str]) -> str:
    old_block = re.search(
        r"// AUTO-MATCH-START.*?// AUTO-MATCH-END",
        original,
        flags=re.DOTALL,
    )
    if old_block and old_block.group(0) == "\n".join(new_block):
        return updated

    def bump(match: re.Match[str]) -> str:
        major, minor, patch = (int(part) for part in match.group(1).split("."))
        return f"// @version        {major}.{minor}.{patch + 1}"

    return re.sub(r"// @version\s+(\d+\.\d+\.\d+)", bump, updated, count=1)


def sync_tampermonkey_loader(project_dir: Path) -> bool:
    loader_path = project_dir / LOADER_FILENAME
    if not loader_path.is_file():
        return False

    env = load_env(project_dir / ".env.local")
    directives = tampermonkey_directives(env)
    if not directives:
        return False

    block = format_match_block(directives)
    original = loader_path.read_text(encoding="utf-8")
    lines = original.splitlines()
    updated_lines = _replace_or_insert_block(lines, block)
    updated_lines = _ensure_update_url(updated_lines)
    updated = "\n".join(updated_lines) + "\n"
    updated = _bump_version_if_needed(original, updated, block)

    if updated == original:
        return False

    loader_path.write_text(updated, encoding="utf-8")
    return True
