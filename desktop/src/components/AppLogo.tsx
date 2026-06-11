import { useId } from "react";

type Props = {
  className?: string;
  title?: string;
};

export default function AppLogo({ className = "h-12 w-12", title = "HL Local Preview" }: Props) {
  const uid = useId().replace(/:/g, "");
  const bg = `app-logo-bg-${uid}`;
  const screen = `app-logo-screen-${uid}`;
  const glow = `app-logo-glow-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label={title}
      className={`shrink-0 rounded-2xl ${className}`}
    >
      <defs>
        <linearGradient id={bg} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1c1917" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id={screen} x1="9" y1="11" x2="23" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#84cc16" stopOpacity="0.35" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0.15" />
        </linearGradient>
        <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="32" height="32" rx="8" fill={`url(#${bg})`} />
      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="7.25"
        stroke="#84cc16"
        strokeOpacity="0.28"
        strokeWidth="1.5"
      />

      <rect x="7" y="8.5" width="18" height="13" rx="2.25" stroke="#a3e635" strokeWidth="1.75" />
      <rect x="9" y="10.5" width="14" height="9" rx="1.25" fill={`url(#${screen})`} />

      <path d="M10.5 13h5.5" stroke="#d9f99d" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M10.5 15.75h8.5"
        stroke="#a3e635"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path d="M10.5 18.5h4" stroke="#84cc16" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />

      <path d="M12.5 23.5h7" stroke="#84cc16" strokeWidth="1.75" strokeLinecap="round" opacity="0.55" />

      <g filter={`url(#${glow})`}>
        <circle cx="23.25" cy="10.25" r="2.35" fill="#a3e635" />
        <circle cx="23.25" cy="10.25" r="4.25" fill="#a3e635" fillOpacity="0.22" />
      </g>
    </svg>
  );
}
