import { btnNeutralBlockLeft } from "../lib/buttons";

type Props = {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

export default function PreferenceToggle({ label, description, checked, disabled, onChange }: Props) {
  return (
    <button
      type="button"
      className={`${btnNeutralBlockLeft} ${disabled ? "pointer-events-none opacity-40" : ""}`}
      aria-pressed={checked}
      aria-disabled={disabled}
      onClick={disabled ? undefined : () => onChange(!checked)}
    >
      <span
        className={`preference-toggle-track shrink-0 ${checked ? "preference-toggle-on" : ""}`}
        aria-hidden
      >
        <span className="preference-toggle-thumb" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-base leading-tight">{label}</span>
        {description ? (
          <span className="theme-text-faint block text-[11px] leading-snug">{description}</span>
        ) : null}
      </span>
    </button>
  );
}
