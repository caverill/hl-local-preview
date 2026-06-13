import { Braces, Palette, type LucideIcon } from "lucide-react";

type PreviewCardProps = {
  title: string;
  file: string;
  url?: string;
  tone: "purple" | "yellow";
  icon: LucideIcon;
};

function PreviewCard({ title, file, url, tone, icon: Icon }: PreviewCardProps) {
  const cardClass = tone === "purple" ? "preview-card-purple" : "preview-card-yellow";
  const iconClass = tone === "purple" ? "icon-purple" : "icon-yellow";

  return (
    <div className={`preview-card flex flex-col gap-2 ${cardClass}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} strokeWidth={2} aria-hidden />
        <h3 className="theme-text text-base font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="theme-text-muted font-mono text-sm">{file}</p>
      {url ? (
        <p className="theme-text-faint truncate font-mono text-[11px] leading-relaxed">{url}</p>
      ) : null}
    </div>
  );
}

type Props = {
  cssUrl?: string;
  jsUrl?: string;
};

export default function PreviewFilesSection({ cssUrl, jsUrl }: Props) {
  return (
    <section className="diagnostics-section flex min-w-0 flex-col gap-2">
      <h2 className="section-title">Preview files</h2>
      <p className="theme-text-faint text-[11px] leading-snug">
        Local URLs served to Stylus and Tampermonkey when the watcher is running.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PreviewCard
          title="CSS"
          file="main/styles.css"
          url={cssUrl}
          tone="purple"
          icon={Palette}
        />
        <PreviewCard
          title="JavaScript"
          file="main/main.js"
          url={jsUrl}
          tone="yellow"
          icon={Braces}
        />
      </div>
    </section>
  );
}
