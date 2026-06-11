import { BookOpen, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { btnClose, btnNeutralMd, btnPrimaryMd } from "../lib/buttons";
import { HOW_TO_STEPS, type HowToMediaItem, type HowToStep } from "../lib/howToGuide";

type Props = {
  open: boolean;
  onClose: () => void;
};

function mediaLabel(step: HowToStep) {
  if (step.videos?.length) {
    return step.videos.map((item) => item.video.replace("/how-to/", "")).join(", ");
  }
  const file = (step.video ?? step.gif ?? "").replace("/how-to/", "");
  return file || "media file";
}

function MediaPlaceholder({
  step,
  stepNumber,
  item,
}: {
  step: HowToStep;
  stepNumber: number;
  item?: HowToMediaItem;
}) {
  const file = item ? item.video.replace("/how-to/", "") : mediaLabel(step);

  return (
    <div className="how-to-media-placeholder">
      <span className="font-mono text-xs uppercase tracking-widest opacity-60">Step {stepNumber}</span>
      {item ? (
        <span className="theme-text-muted mt-2 text-center text-base">
          {item.label}: add <span className="font-mono">{file}</span> to{" "}
          <span className="font-mono">desktop/public/how-to/</span>
        </span>
      ) : (
        <span className="theme-text-muted mt-2 text-center text-base">
          Add <span className="font-mono">{file}</span> to{" "}
          <span className="font-mono">desktop/public/how-to/</span>
        </span>
      )}
      <span className="theme-text-faint mt-2 text-center text-xs">
        Use MP4 when possible — GIFs over ~10&nbsp;MB can freeze the app.
      </span>
    </div>
  );
}

function StepVideo({ src, alt, onMissing }: { src: string; alt: string; onMissing: () => void }) {
  return (
    <video
      key={src}
      src={src}
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
      className="h-full w-full object-contain"
      aria-label={alt}
      onCanPlay={(event) => {
        void event.currentTarget.play().catch(() => {});
      }}
      onError={onMissing}
    />
  );
}

function DualStepMedia({ step, stepNumber }: { step: HowToStep; stepNumber: number }) {
  const items = step.videos!;
  const [activeIndex, setActiveIndex] = useState(0);
  const [missing, setMissing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setActiveIndex(0);
    setMissing({});
  }, [step.id]);

  const active = items[activeIndex]!;

  return (
    <div className="flex flex-col gap-2">
      <div role="tablist" aria-label="Watcher demo" className="how-to-media-tabs">
        {items.map((item, index) => (
          <button
            key={item.label}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            className={`how-to-media-tab ${index === activeIndex ? "how-to-media-tab-active" : ""}`}
            onClick={() => setActiveIndex(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="how-to-media" role="tabpanel" aria-label={active.label}>
        {missing[active.video] ? (
          <MediaPlaceholder step={step} stepNumber={stepNumber} item={active} />
        ) : (
          <StepVideo
            src={active.video}
            alt={active.alt}
            onMissing={() => setMissing((prev) => ({ ...prev, [active.video]: true }))}
          />
        )}
      </div>
    </div>
  );
}

function StepMedia({ step, stepNumber }: { step: HowToStep; stepNumber: number }) {
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setMissing(false);
  }, [step.id, step.video, step.gif]);

  if (step.videos?.length) {
    return <DualStepMedia step={step} stepNumber={stepNumber} />;
  }

  if (missing) {
    return (
      <div className="how-to-media">
        <MediaPlaceholder step={step} stepNumber={stepNumber} />
      </div>
    );
  }

  if (step.video) {
    return (
      <div className="how-to-media">
        <StepVideo src={step.video} alt={step.alt} onMissing={() => setMissing(true)} />
      </div>
    );
  }

  if (step.gif) {
    return (
      <div className="how-to-media">
        <img
          key={step.gif}
          src={step.gif}
          alt={step.alt}
          className="h-full w-full object-contain"
          loading="lazy"
          onError={() => setMissing(true)}
        />
      </div>
    );
  }

  return (
    <div className="how-to-media">
      <div className="how-to-media-placeholder">
        <span className="font-mono text-xs uppercase tracking-widest opacity-60">Step {stepNumber}</span>
        <span className="theme-text-muted mt-2 text-center text-base">No media configured for this step.</span>
      </div>
    </div>
  );
}

export default function HowToModal({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const step = HOW_TO_STEPS[stepIndex]!;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === HOW_TO_STEPS.length - 1;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      setStepIndex(0);
      if (dialog.open) dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function goNext() {
    if (isLast) dialogRef.current?.close();
    else setStepIndex((i) => Math.min(HOW_TO_STEPS.length - 1, i + 1));
  }

  return (
    <dialog ref={dialogRef} className="how-to-modal setup-modal modal">
      {open ? (
        <div className="how-to-modal-box setup-modal-box modal-box overflow-y-auto">
          <form method="dialog">
            <button type="submit" className={btnClose} aria-label="Close">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </form>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="theme-text flex items-center gap-2 text-xl font-semibold tracking-tight">
                <BookOpen className="setup-icon h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                How to use
              </h3>
              <p className="theme-text-soft text-xs uppercase tracking-[0.12em]">
                Step {stepIndex + 1} of {HOW_TO_STEPS.length}
              </p>
            </div>

            <StepMedia step={step} stepNumber={stepIndex + 1} />

            <div className="flex flex-col gap-2">
              <h4 className="theme-text text-lg font-semibold tracking-tight">{step.title}</h4>
              <p className="theme-text-muted text-base leading-relaxed">{step.description}</p>
            </div>

            <div className="flex items-center justify-center gap-1.5">
              {HOW_TO_STEPS.map((s, i) => (
                <span
                  key={s.id}
                  className={`h-1.5 rounded-full transition-all ${
                    i === stepIndex ? "w-5 accent-dot" : "w-1.5 bg-white/20"
                  }`}
                  aria-hidden
                />
              ))}
            </div>

            <div className="modal-action gap-2">
              <button
                type="button"
                className={`${btnNeutralMd} flex items-center gap-1.5`}
                disabled={isFirst}
                onClick={goBack}
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
                Back
              </button>
              <button type="button" className={`${btnPrimaryMd} flex items-center gap-1.5`} onClick={goNext}>
                {isLast ? "Done" : "Next"}
                {!isLast && <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <form method="dialog" className="modal-backdrop">
        <button type="submit" aria-label="Close">
          close
        </button>
      </form>
    </dialog>
  );
}
