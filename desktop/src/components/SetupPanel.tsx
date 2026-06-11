import {
  ExternalLink,
  FilePlus,
  FolderOpen,
  FolderSearch,
  GitBranch,
  Link2,
  RefreshCw,
  Save,
  Settings,
  Target,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, type GitRepoInfo, type ProjectInfo } from "../lib/api";
import {
  btnAccentMd,
  btnClose,
  btnDisabled,
  btnLink,
  btnNeutralMd,
  btnNeutralXs,
  btnPrimaryMd,
} from "../lib/buttons";
import { formatRecentDir } from "../lib/logFilters";
import { DEFAULT_SITE_URL, MATCH_MODE_OPTIONS, type MatchMode, type SetupValues } from "../lib/setup";

const setupIcon = "setup-icon shrink-0";

type Props = {
  open: boolean;
  project: ProjectInfo | null;
  onClose: () => void;
  onSave: (values: SetupValues) => Promise<void>;
  onSaved?: () => void;
  onCreateFiles: (path: string) => Promise<
    ProjectInfo & { created: string[]; preview_built?: boolean; preview_error?: string }
  >;
  onUpdateFiles: (path: string) => Promise<ProjectInfo & { updated: string[] }>;
  onSwitchProject?: (path: string) => Promise<void>;
  watcherRunning?: boolean;
};

export default function SetupPanel({
  open,
  project,
  onClose,
  onSave,
  onSaved,
  onCreateFiles,
  onUpdateFiles,
  onSwitchProject,
  watcherRunning = false,
}: Props) {
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
  const [updating, setUpdating] = useState(false);
  const [outdatedFiles, setOutdatedFiles] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pathError, setPathError] = useState(false);
  const [missingFilesError, setMissingFilesError] = useState(false);
  const [siteUrlError, setSiteUrlError] = useState(false);

  const initedForOpenRef = useRef(false);
  const pathRef = useRef(path);
  pathRef.current = path;
  const inspectRequestIdRef = useRef(0);

  useEffect(() => {
    if (!open) {
      initedForOpenRef.current = false;
      return;
    }
    if (!project || initedForOpenRef.current) return;
    setPath(project.path);
    setSiteUrl("");
    setMatchMode(project.match_mode ?? "url-prefix");
    setMatchRegexpPattern(project.match_regexp_pattern ?? "");
    setMissingFiles(project.missing_files);
    setOutdatedFiles(project.outdated_files ?? []);
    setGitInfo({
      is_git_repo: project.is_git_repo,
      repo_root: project.repo_root,
      remote_url: project.remote_url,
      remote_web_url: project.remote_web_url,
      branch: project.branch,
    });
    setError("");
    setPathError(false);
    setMissingFilesError(false);
    setSiteUrlError(false);
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
    const inspectedPath = path.trim();
    const requestId = ++inspectRequestIdRef.current;
    const handle = window.setTimeout(() => {
      api
        .inspectProject(inspectedPath)
        .then((result) => {
          if (requestId !== inspectRequestIdRef.current) return;
          if (pathRef.current.trim() !== inspectedPath) return;
          if (result.valid) setMissingFiles(result.missing_files);
          setOutdatedFiles(result.outdated_files ?? []);
          setSiteUrl(result.site_url ?? "");
          setGitInfo({
            is_git_repo: result.is_git_repo,
            repo_root: result.repo_root,
            remote_url: result.remote_url,
            remote_web_url: result.remote_web_url,
            branch: result.branch,
          });
        })
        .catch(() => {
          if (requestId !== inspectRequestIdRef.current) return;
          if (pathRef.current.trim() !== inspectedPath) return;
          setGitInfo(null);
        });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [open, path]);

  useEffect(() => {
    if (missingFiles.length === 0) setMissingFilesError(false);
  }, [missingFiles.length]);

  function applyInspect(result: {
    path: string;
    missing_files: string[];
    outdated_files?: string[];
    site_url?: string;
    is_git_repo: boolean;
    repo_root: string | null;
    remote_url: string | null;
    remote_web_url: string | null;
    branch: string | null;
  }) {
    inspectRequestIdRef.current += 1;
    setPath(result.path);
    setPathError(false);
    setMissingFiles(result.missing_files);
    setOutdatedFiles(result.outdated_files ?? []);
    setSiteUrl(result.site_url ?? "");
    setGitInfo({
      is_git_repo: result.is_git_repo,
      repo_root: result.repo_root,
      remote_url: result.remote_url,
      remote_web_url: result.remote_web_url,
      branch: result.branch,
    });
  }

  async function handleRecentFolder(dir: string) {
    setError("");
    setPath(dir);
    setPathError(false);
    if (onSwitchProject) {
      setBusy(true);
      try {
        await onSwitchProject(dir);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not switch project folder");
      } finally {
        setBusy(false);
      }
    }
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

  async function handleUpdateFiles() {
    if (!path.trim()) {
      setPathError(true);
      return;
    }
    setUpdating(true);
    setError("");
    try {
      const result = await onUpdateFiles(path);
      setOutdatedFiles(result.outdated_files ?? []);
      setMissingFiles(result.missing_files);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update project files");
    } finally {
      setUpdating(false);
    }
  }

  async function handleCreateFiles() {
    if (!path.trim()) {
      setPathError(true);
      return;
    }
    setCreating(true);
    setError("");
    try {
      const result = await onCreateFiles(path);
      setMissingFiles(result.missing_files);
      setSiteUrl("");
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
    setError("");

    const nextPathError = !path.trim();
    const nextMissingFilesError = missingFiles.length > 0;
    const nextSiteUrlError = !siteUrl.trim();

    setPathError(nextPathError);
    setMissingFilesError(nextMissingFilesError);
    setSiteUrlError(nextSiteUrlError);

    if (nextPathError || nextMissingFilesError || nextSiteUrlError) return;

    setBusy(true);
    try {
      await onSave({ path, siteUrl, matchMode, matchRegexpPattern });
      onSaved?.();
      dialogRef.current?.close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || picking || creating || updating;
  const recentDirs = (project?.recent_dirs ?? []).filter((dir) => dir && dir !== path.trim());

  return (
    <dialog ref={dialogRef} className="setup-modal modal">
      <div className="setup-modal-box modal-box max-h-[min(90vh,100rem)] overflow-y-auto">
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
          <h3 className="theme-text flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Settings className={`${setupIcon} h-5 w-5`} strokeWidth={2} aria-hidden />
            Setup
          </h3>
          <p className="theme-text-soft text-base">
            Project folder, dev site URL, and Stylus match mode for CSS preview.
          </p>
        </div>

        {error && (
          <div role="alert" className="theme-callout-error">
            {error}
          </div>
        )}

        <fieldset>
          <legend className="section-title mb-2 flex items-center gap-1.5">
            <FolderOpen className={`${setupIcon} h-3.5 w-3.5`} strokeWidth={2} aria-hidden />
            Project folder
            <span className="setup-required-mark" aria-hidden>
              *
            </span>
          </legend>
          <div className="flex gap-2">
            <input
              className={`setup-input min-w-0 flex-1 ${pathError ? "setup-input-error" : ""}`}
              value={path}
              onChange={(e) => {
                setPath(e.target.value);
                setSiteUrl("");
                if (pathError) setPathError(false);
              }}
              placeholder="/path/to/your/project"
              required
              aria-required="true"
              aria-invalid={pathError}
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
          {pathError ? (
            <p className="setup-field-error" role="alert">
              Choose a project folder before saving.
            </p>
          ) : null}
          {recentDirs.length > 0 ? (
            <div className="mt-2 flex flex-col gap-1.5">
              <span className="theme-text-faint text-[11px] uppercase tracking-[0.12em]">Recent</span>
              <div className="flex flex-wrap gap-1.5">
                {recentDirs.map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    className={`${btnNeutralXs} max-w-full truncate`}
                    title={dir}
                    disabled={disabled}
                    onClick={() => void handleRecentFolder(dir)}
                  >
                    {formatRecentDir(dir)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </fieldset>
        {gitInfo?.is_git_repo && (
          <div className="theme-git-panel rounded-xl border px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="theme-text flex items-center gap-1.5 text-base font-medium">
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
          <p className="theme-text-faint text-base">No Git repository found in this folder or its parents.</p>
        ) : null}
        

        {missingFiles.length > 0 && (
          <div
            className={`theme-git-panel rounded-xl border p-4 ${missingFilesError ? "setup-panel-error" : ""}`}
            aria-invalid={missingFilesError}
          >
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
            {missingFilesError ? (
              <p className="setup-field-error" role="alert">
                Create the missing project files before saving.
              </p>
            ) : null}
          </div>
        )}

        {missingFiles.length === 0 && outdatedFiles.length > 0 && (
          <div className="theme-callout-warn rounded-xl border p-4">
            <p className="text-base font-medium">
              {outdatedFiles.length} toolkit file{outdatedFiles.length === 1 ? "" : "s"} behind this
              app
            </p>
            <p className="theme-text-soft mt-1 text-[11px] leading-snug">
              Updates scripts and templates from HL Local Preview. Does not change{" "}
              <span className="font-mono">main/styles.css</span>,{" "}
              <span className="font-mono">main/main.js</span>, or{" "}
              <span className="font-mono">.env.local</span>.
            </p>
            <ul className="theme-text-muted mt-2 space-y-1 font-mono text-[11px]">
              {outdatedFiles.map((file) => (
                <li key={file}>{file}</li>
              ))}
            </ul>
            <button
              type="button"
              className={`${btnNeutralMd} mt-3 ${disabled || watcherRunning ? btnDisabled : ""}`}
              aria-disabled={disabled || watcherRunning}
              onClick={disabled || watcherRunning ? undefined : handleUpdateFiles}
            >
              <RefreshCw
                className={`${setupIcon} h-4 w-4 ${updating ? "animate-spin" : ""}`}
                strokeWidth={2}
                aria-hidden
              />
              {updating ? "Updating…" : "Update project files"}
            </button>
            {watcherRunning ? (
              <p className="theme-text-faint mt-2 text-[11px]">Stop the watcher before updating.</p>
            ) : null}
          </div>
        )}
        <div className="theme-divider" />
        
        <fieldset>
          <legend className="section-title mb-2 flex items-center gap-1.5">
            <Link2 className={`${setupIcon} h-3.5 w-3.5`} strokeWidth={2} aria-hidden />
            SITE_URL
            <span className="setup-required-mark" aria-hidden>
              *
            </span>
          </legend>
          <input
            className={`setup-input ${siteUrlError ? "setup-input-error" : ""}`}
            placeholder={DEFAULT_SITE_URL}
            value={siteUrl}
            onChange={(e) => {
              setSiteUrl(e.target.value);
              if (siteUrlError) setSiteUrlError(false);
            }}
            required
            aria-required="true"
            aria-invalid={siteUrlError}
          />
          {siteUrlError ? (
            <p className="setup-field-error" role="alert">
              SITE_URL is required — enter your dev site URL before saving.
            </p>
          ) : null}
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
                  <span className="theme-text block text-base font-medium">{label}</span>
                  <span className="theme-text-muted block text-base">{hint}</span>
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
        <p className="theme-callout-info flex items-start gap-2 text-base leading-relaxed">
          <Target className={`${setupIcon} mt-0.5 h-4 w-4 shrink-0`} strokeWidth={2} aria-hidden />
          <span>
            After you save, open <span className="theme-text font-medium">Diagnostics</span> to install
            browser extensions and finish the ready check.
          </span>
        </p>
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
