import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import type { Check } from "../lib/api";
import { detectBrowser, extensionInstallUrl } from "../lib/extensionStores";
import { btnLink, btnToolbarSm } from "../lib/buttons";
import {
  buildReadinessItems,
  readExtensionsInstalled,
  readinessSummary,
  writeExtensionsInstalled,
  type ReadinessItem,
  type ReadinessItemStatus,
} from "../lib/readiness";
import { usePreviewContext } from "../hooks/PreviewContext";

function StatusIcon({ status }: { status: ReadinessItemStatus }) {
  if (status === "ok") {
    return <CheckCircle2 className="status-text-success h-4 w-4 shrink-0" strokeWidth={2} aria-label="Done" />;
  }
  if (status === "fail") {
    return <XCircle className="status-text-error h-4 w-4 shrink-0" strokeWidth={2} aria-label="Needs attention" />;
  }
  return <Circle className="status-text-warning h-4 w-4 shrink-0" strokeWidth={2} aria-label="Pending" />;
}

function ChecklistItem({ item }: { item: ReadinessItem }) {
  return (
    <div className="readiness-row pill-row gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <span className="theme-text-body block text-base leading-tight">{item.label}</span>
        {item.hint ? (
          <span className="theme-text-faint block text-[11px] leading-snug">{item.hint}</span>
        ) : null}
      </div>
      <StatusIcon status={item.status} />
    </div>
  );
}

function ExtensionsChecklistItem({
  item,
  browser,
  onConfirm,
}: {
  item: ReadinessItem;
  browser: ReturnType<typeof detectBrowser>;
  onConfirm: () => void;
}) {
  return (
    <div className="readiness-row pill-row flex-col items-stretch gap-3 py-3">
      <div className="flex w-full items-start gap-3">
        <div className="min-w-0 flex-1">
          <span className="theme-text-body block text-base leading-tight">{item.label}</span>
          {item.hint ? (
            <span className="theme-text-faint block text-[11px] leading-snug">{item.hint}</span>
          ) : null}
        </div>
        <StatusIcon status={item.status} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <a
          href={extensionInstallUrl("stylus", browser)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btnToolbarSm} flex-1`}
        >
          Install Stylus
          <ExternalLink className="h-3 w-3 opacity-40" strokeWidth={2} aria-hidden />
        </a>
        <a
          href={extensionInstallUrl("tampermonkey", browser)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btnToolbarSm} flex-1`}
        >
          Install Tampermonkey
          <ExternalLink className="h-3 w-3 opacity-40" strokeWidth={2} aria-hidden />
        </a>
      </div>

      <button type="button" className={`${btnLink} self-start text-xs transition-opacity hover:opacity-80`} onClick={onConfirm}>
        I&apos;ve installed both extensions
      </button>
    </div>
  );
}

type Props = {
  checks: Check[];
};

export default function ReadinessChecklist({ checks }: Props) {
  const { project, status, running } = usePreviewContext();
  const [extensionsInstalled, setExtensionsInstalled] = useState(readExtensionsInstalled);

  const items = buildReadinessItems(project, status, running, checks, extensionsInstalled);
  const { done, total, allOk } = readinessSummary(items);
  const browser = detectBrowser();

  function markExtensionsInstalled() {
    writeExtensionsInstalled(true);
    setExtensionsInstalled(true);
  }

  return (
    <section className="diagnostics-section flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title flex min-w-0 items-center gap-1.5">
          <ClipboardCheck className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={2} aria-hidden />
          Ready check
        </h2>
        <span className={`sidebar-collapse-summary tabular-nums ${allOk ? "status-text-success" : "status-text-warning"}`}>
          {done}/{total}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => {
          if (item.id === "extensions" && !extensionsInstalled) {
            return (
              <ExtensionsChecklistItem
                key={item.id}
                item={item}
                browser={browser}
                onConfirm={markExtensionsInstalled}
              />
            );
          }
          return <ChecklistItem key={item.id} item={item} />;
        })}
      </div>
    </section>
  );
}
