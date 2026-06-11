import { CheckCircle2, Package, Stethoscope, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type Check } from "../lib/api";
import { btnGhostSm } from "../lib/buttons";
import ReadinessChecklist from "./ReadinessChecklist";

export default function DiagnosticsTab() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api.diagnostics().then((d) => {
        if (!cancelled) setChecks(d.checks);
      });
    };
    load();
    const t = window.setInterval(load, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  async function handleInstall() {
    setInstalling(true);
    try {
      await api.installDeps();
      const d = await api.diagnostics();
      setChecks(d.checks);
    } finally {
      setInstalling(false);
    }
  }

  const healthDone = checks.filter((c) => c.status === "ok").length;
  const healthTotal = checks.length;
  const healthAllOk = healthTotal > 0 && healthDone === healthTotal;

  return (
    <>
    <div className="theme-divider"></div>
    <div className="diagnostics-panels min-h-0 flex-1 overflow-y-auto">
      <ReadinessChecklist checks={checks} />

      <section className="diagnostics-section diagnostics-health flex min-w-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title flex min-w-0 items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={2} aria-hidden />
            Health checks
          </h2>
          {healthTotal > 0 ? (
            <span className={`sidebar-collapse-summary tabular-nums ${healthAllOk ? "status-text-success" : "status-text-warning"}`}>
              {healthDone}/{healthTotal}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          {checks.map((c) => (
            <div key={c.label} className="pill-row">
              <span className="theme-text-body text-base">{c.label}</span>
              {c.status === "ok" ? (
                <CheckCircle2 className="status-text-success h-4 w-4 shrink-0" strokeWidth={2} aria-label="OK" />
              ) : (
                <XCircle className="status-text-error h-4 w-4 shrink-0" strokeWidth={2} aria-label="Failed" />
              )}
            </div>
          ))}
          <button
            type="button"
            className={`${btnGhostSm} shrink-0 tracking-wide self-end`}
            disabled={installing}
            onClick={handleInstall}
          >
            <Package className="h-3 w-3 shrink-0 inline-block" strokeWidth={2} aria-hidden />
            {installing ? "Installing…" : "pip install"}
          </button>
        </div>
      </section>
    </div>
    </>
    );
  }
