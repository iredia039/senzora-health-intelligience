type LogoProps = {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
};

const sizes = { sm: 26, md: 34, lg: 48 } as const;

/** Orbital symbol: two tilted signal orbits around a luminous central point. */
export function SenzoraMark({ px = 34 }: { px?: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <g stroke="var(--accent-bright)" strokeLinecap="round">
        <ellipse cx="16" cy="16" rx="12" ry="5" strokeWidth="1.7" transform="rotate(-30 16 16)" />
        <ellipse cx="16" cy="16" rx="12" ry="5" strokeWidth="1.2" opacity="0.5" transform="rotate(30 16 16)" />
      </g>
      <circle cx="16" cy="16" r="5.5" fill="var(--accent-bright)" opacity="0.2" />
      <circle cx="16" cy="16" r="2.8" fill="var(--fg)" className="drop-shadow-[0_0_6px_var(--glow)]" />
      <circle cx="26.4" cy="10" r="1.6" fill="var(--accent-bright)" />
    </svg>
  );
}

export function Logo({ size = "md", showTagline = false }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      <SenzoraMark px={sizes[size]} />
      <div className="leading-none">
        <p className="font-display text-lg font-semibold tracking-[0.22em] text-fg">SENZORA</p>
        <p className="mt-1 font-display text-[0.56rem] font-medium tracking-[0.18em] text-accent">HEALTH INTELLIGENCE</p>
        {showTagline && <p className="mt-2 text-xs tracking-normal text-muted">See Beyond the Signals.</p>}
      </div>
    </div>
  );
}
