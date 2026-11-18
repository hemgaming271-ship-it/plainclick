/** PlainClick mark: a rounded square with three plain "buttons". Drawn here; no third-party artwork. */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="pc-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4aa3ff" />
          <stop offset="1" stopColor="#0062d1" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#pc-bg)" />
      <rect x="15" y="17" width="34" height="7" rx="3.5" fill="#fff" />
      <rect x="15" y="29" width="26" height="7" rx="3.5" fill="#fff" fillOpacity="0.85" />
      <rect x="15" y="41" width="18" height="7" rx="3.5" fill="#fff" fillOpacity="0.7" />
    </svg>
  );
}
