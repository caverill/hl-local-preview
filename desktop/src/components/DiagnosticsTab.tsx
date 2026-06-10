import { AlertTriangle, CheckCircle2, Package, Stethoscope, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Check = { label: string; status: string; detail: string };

export default function DiagnosticsTab() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    api.diagnostics().then((d) => setChecks(d.checks));
    const t = setInterval(() => api.diagnostics().then((d) => setChecks(d.checks)), 8000);
    return () => clearInterval(t);
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between gap-3">
        <span className="section-title flex items-center gap-1.5">
          <Stethoscope className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={2} aria-hidden />
          Health checks
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-interactive theme-btn-ghost accent-hover btn-interactive-lime flex shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium tracking-wide"
          disabled={installing}
          onClick={handleInstall}
        >
          <Package className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
          {installing ? "Installing…" : "pip install"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {checks.map((c) => (
          <div key={c.label} className="pill-row">
            <span className="theme-text-body text-sm">{c.label}</span>
            {c.status === "ok" ? (
              <CheckCircle2 className="accent-text h-4 w-4 shrink-0" strokeWidth={2} aria-label="OK" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-red-400" strokeWidth={2} aria-label="Failed" />
            )}
          </div>
        ))}
      </div>

      <p className="theme-callout-warn glass-inner flex items-start gap-2 p-4 text-xs leading-relaxed">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/80" strokeWidth={2} aria-hidden />
        Stylus and Tampermonkey installs must be approved manually in your browser.
      </p>
    </div>
  );
}
