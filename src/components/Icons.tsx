import type { ReactNode } from 'react';

const PATHS: Record<string, ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  trash: <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a1 1 0 0 1 1-1h10" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />,
  send: <path d="M12 19V5M5 12l7-7 7 7" />,
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />,
  sliders: (
    <>
      <path d="M4 7h9M19 7h1M4 17h1M11 17h9" />
      <circle cx="16" cy="7" r="2.2" />
      <circle cx="8" cy="17" r="2.2" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M16 7l3 3" />
    </>
  ),
  chevron: <path d="M6 9l6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
};

export function Icon({ name, className = 'size-[18px]' }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

export function Logo({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="7" fill="var(--c-accent)" />
      <path
        d="M8 7v5.5a4 4 0 0 0 8 0V7"
        fill="none"
        stroke="var(--c-accent-ink)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
