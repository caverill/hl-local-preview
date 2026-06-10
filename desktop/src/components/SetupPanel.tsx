import {
  ExternalLink,
  FilePlus,
  FolderOpen,
  FolderSearch,
  GitBranch,
  Link2,
  Puzzle,
  Save,
  Settings,
  Target,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, type GitRepoInfo, type ProjectInfo } from "../lib/api";
import {
  detectBrowser,
  extensionInstallUrl,
  extensionStoreLabel,
  type ExtensionId,
} from "../lib/extensionStores";
import {
  btnAccentMd,
  btnClose,
  btnDisabled,
  btnLink,
  btnNeutralMd,
  btnNeutralXs,
  btnPrimaryMd,
} from "../lib/buttons";
import { MATCH_MODE_OPTIONS, type MatchMode, type SetupValues } from "../lib/setup";

const setupIcon = "setup-icon shrink-0";

type Props = {
  open: boolean;
  project: ProjectInfo | null;
  onClose: () => void;
  onSave: (values: SetupValues) => Promise<void>;
  onCreateFiles: (path: string) => Promise<
    ProjectInfo & { created: string[]; preview_built?: boolean; preview_error?: string }
  >;
};

function ExtensionInstallLink({
  extension,
  label,
  browser,
}: {
  extension: ExtensionId;
  label: string;
  browser: ReturnType<typeof detectBrowser>;
}) {
  const url = extensionInstallUrl(extension, browser);
  const store = extensionStoreLabel(browser);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Install ${label} (${store})`}
      className={`${btnNeutralMd} flex flex-1`}
    >
      {label}
    </a>
  );
}

export default function SetupPanel({ open, project, onClose, onSave, onCreateFiles }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [path, setPath] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [matchMode, setMatchMode] = useState<MatchMode>("url-prefix");
  const [matchRegexpPattern, setMatchRegexpPattern] = useState("");
  const [missingFiles, setMissingFiles] = useState<string[]>([]);
  const [gitInfo, setGitInfo] = useState<GitRepoInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const initedForOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initedForOpenRef.current = false;
      return;
    }
    if (!project || initedForOpenRef.current) return;
    setPath(project.path);
    setSiteUrl(project.site_url);
    setMatchMode(project.match_mode ?? "url-prefix");
    setMatchRegexpPattern(project.match_regexp_pattern ?? "");
    setMissingFiles(project.missing_files);
    setGitInfo({
      is_git_repo: project.is_git_repo,
      repo_root: project.repo_root,
      remote_url: project.remote_url,
      remote_web_url: project.remote_web_url,
      branch: project.branch,
    });
    setError("");
    initedForOpenRef.current = true;
  }, [open, project]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) dialog.showModal();
    else if (dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  useEffect(() => {
    if (!open || !path.trim()) {
      setGitInfo(null);
      return;
    }
    const handle = window.setTimeout(() => {
      api
        .inspectProject(path.trim())
        .then((result) => {
          if (result.valid) setMissingFiles(result.missing_files);
          setGitInfo({
            is_git_repo: result.is_git_repo,
            repo_root: result.repo_root,
            remote_url: result.remote_url,
            remote_web_url: result.remote_web_url,
            branch: result.branch,
          });
        })
        .catch(() => setGitInfo(null));
    }, 350);
    return () => window.clearTimeout(handle);
  }, [open, path]);

  function applyInspect(result: {
    path: string;
    missing_files: string[];
    is_git_repo: boolean;
    repo_root: string | null;
    remote_url: string | null;
    remote_web_url: string | null;
    branch: string | null;
  }) {
    setPath(result.path);
    setMissingFiles(result.missing_files);
    setGitInfo({
      is_git_repo: result.is_git_repo,
      repo_root: result.repo_root,
      remote_url: result.remote_url,
      remote_web_url: result.remote_web_url,
      branch: result.branch,
    });
  }

  async function handlePickFolder() {
    setPicking(true);
    setError("");
    try {
      const result = await api.pickFolder(path);
      if (result.path) applyInspect(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open folder picker");
    } finally {
      setPicking(false);
    }
  }

  async function handleCreateFiles() {
    if (!path.trim()) {
      setError("Choose a project folder first");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const result = await onCreateFiles(path);
      setMissingFiles(result.missing_files);
      if (result.preview_built === false && result.preview_error) {
        setError(`Project files created, but preview build failed: ${result.preview_error}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create project files");
    } finally {
      setCreating(false);
    }
  }

  async function handleOpenFolder(targetPath: string) {
    setError("");
    try {
      await api.openPath(targetPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open folder");
    }
  }

  async function handleUseRepoRoot() {
    if (!gitInfo?.repo_root) return;
    setPath(gitInfo.repo_root);
  }

  const repoRootDiffers =
    gitInfo?.is_git_repo &&
    gitInfo.repo_root &&
    path.trim() &&
    gitInfo.repo_root !== path.trim();

  async function handleSave() {
    setBusy(true);
    setError("");
    try {
      await onSave({ path, siteUrl, matchMode, matchRegexpPattern });
      dialogRef.current?.close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || picking || creating;
  const browser = detectBrowser();
  const storeLabel = extensionStoreLabel(browser);

  return (
    <dialog ref={dialogRef} className="setup-modal modal">
      <div className="setup-modal-box modal-box max-h-[min(90vh,60rem)] overflow-y-auto">
        <form method="dialog">
          <button
            type="submit"
            className={btnClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </form>

        <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="theme-text flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Settings className={`${setupIcon} h-5 w-5`} strokeWidth={2} aria-hidden />
            Setup
          </h3>
          <p className="theme-text-soft text-sm">
            Project folder, dev site URL, and Stylus match mode for CSS preview.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <fieldset>
          <legend className="section-title mb-2 flex items-center gap-1.5">
            <Puzzle className={`${setupIcon} h-3.5 w-3.5`} strokeWidth={2} aria-hidden />
            Browser extensions
          </legend>
          <p className="theme-text-muted mb-2 text-xs">
            Install once — links open {storeLabel} for your browser.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <ExtensionInstallLink extension="stylus" label="Stylus" browser={browser} />
            <ExtensionInstallLink extension="tampermonkey" label="Tampermonkey" browser={browser} />
          </div>
        </fieldset>

        <div className="theme-divider" />
        <fieldset>
          <legend className="section-title mb-2 flex items-center gap-1.5">
            <FolderOpen className={`${setupIcon} h-3.5 w-3.5`} strokeWidth={2} aria-hidden />
            Project folder
          </legend>
          <div className="flex gap-2">
            <input
              className="setup-input min-w-0 flex-1"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/path/to/your/project"
            />
            <button
              type="button"
              className={`${btnNeutralMd} shrink-0 ${disabled ? btnDisabled : ""}`}
              aria-disabled={disabled}
              onClick={disabled ? undefined : handlePickFolder}
            >
              <FolderSearch className={`${setupIcon} h-4 w-4`} strokeWidth={2} aria-hidden />
              {picking ? "…" : "Browse"}
            </button>
          </div>
        </fieldset>
        {gitInfo?.is_git_repo && (
          <div className="theme-git-panel rounded-xl border px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="theme-text flex items-center gap-1.5 text-sm font-medium">
                  <GitBranch className={`${setupIcon} h-4 w-4`} strokeWidth={2} aria-hidden />
                  Git repository
                  {gitInfo.branch ? (
                    <span className="theme-text-muted font-normal">· {gitInfo.branch}</span>
                  ) : null}
                </p>
                <p className="theme-text-muted mt-1 truncate font-mono text-[11px]">{gitInfo.repo_root}</p>
                {gitInfo.remote_url ? (
                  <p className="theme-text-faint mt-1 truncate font-mono text-[11px]">{gitInfo.remote_url}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  className={btnNeutralXs}
                  onClick={() => gitInfo.repo_root && handleOpenFolder(gitInfo.repo_root)}
                >
                  <FolderOpen className={`${setupIcon} h-3.5 w-3.5`} strokeWidth={2} aria-hidden />
                  Open folder
                </button>
                {gitInfo.remote_web_url ? (
                  <button
                    type="button"
                    className={btnNeutralXs}
                    onClick={() => window.open(gitInfo.remote_web_url!, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className={`${setupIcon} h-3.5 w-3.5`} strokeWidth={2} aria-hidden />
                    Open remote
                  </button>
                ) : null}
              </div>
            </div>
            {repoRootDiffers ? (
              <button
                type="button"
                className={`${btnLink} mt-2`}
                onClick={handleUseRepoRoot}
              >
                Use repo root instead
              </button>
            ) : null}
          </div>
        )}

        {path.trim() && gitInfo && !gitInfo.is_git_repo ? (
          <p className="theme-text-faint text-xs">No Git repository found in this folder or its parents.</p>
        ) : null}

        {missingFiles.length > 0 && (
          <div className="theme-git-panel rounded-xl border p-4">
            <p className="setup-missing-title">
              {missingFiles.length} required file{missingFiles.length === 1 ? "" : "s"} missing
            </p>
            <ul className="theme-text-muted mt-2 space-y-1 font-mono text-[11px]">
              {missingFiles.map((file) => (
                <li key={file}>{file}</li>
              ))}
            </ul>
            <button
              type="button"
              className={`${btnAccentMd} mt-2 ${disabled ? btnDisabled : ""}`}
              aria-disabled={disabled}
              onClick={disabled ? undefined : handleCreateFiles}
            >
              <FilePlus className={`${setupIcon} h-4 w-4`} strokeWidth={2} aria-hidden />
              {creating ? "Creating…" : "Create project files"}
            </button>
          </div>
        )}
        <div className="theme-divider" />
        <fieldset>
          <legend className="section-title mb-2 flex items-center gap-1.5">
            <Link2 className={`${setupIcon} h-3.5 w-3.5`} strokeWidth={2} aria-hidden />
            SITE_URL
          </legend>
          <input
            className="setup-input"
            placeholder="https://example.com/sandbox/"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
          />
        </fieldset>
        <div className="theme-divider" />
        <fieldset>
          <legend className="section-title mb-2 flex items-center gap-1.5">
            <Target className={`${setupIcon} h-3.5 w-3.5`} strokeWidth={2} aria-hidden />
            CSS match mode
          </legend>
          <div className="flex flex-col gap-2">
            {MATCH_MODE_OPTIONS.map(({ id, label, hint }) => (
              <label
                key={id}
                className={`setup-radio flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 ${
                  matchMode === id ? "accent-radio-selected" : "setup-radio-inactive"
                }`}
              >
                <input
                  type="radio"
                  name="match-mode"
                  className="mt-0.5"
                  checked={matchMode === id}
                  onChange={() => setMatchMode(id)}
                />
                <span>
                  <span className="theme-text block text-sm font-medium">{label}</span>
                  <span className="theme-text-muted block text-xs">{hint}</span>
                </span>
              </label>
            ))}
          </div>
          {matchMode === "regexp" && (
            <input
              className="setup-input mt-2"
              placeholder="^https://example\\.com/sandbox/.*$"
              value={matchRegexpPattern}
              onChange={(e) => setMatchRegexpPattern(e.target.value)}
            />
          )}
        </fieldset>

        <div className="theme-divider" />

        <div className="modal-action gap-2">
          <form method="dialog">
            <button
              type="submit"
              className={btnNeutralMd}
              disabled={busy}
            >
              Cancel
            </button>
          </form>
          <button
            type="button"
            className={`${btnPrimaryMd} ${busy ? btnDisabled : ""}`}
            aria-disabled={busy}
            onClick={busy ? undefined : handleSave}
          >
            <Save className="h-4 w-4" strokeWidth={2} aria-hidden />
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" aria-label="Close">
          close
        </button>
      </form>
    </dialog>
  );
}
