type LogoProps = {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
};

const sizes = { sm: 26, md: 34, lg: 48 } as const;

export function VeluneMark({ px = 34 }: { px?: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="drop-shadow-[0_0_8px_var(--glow)]"
    >
      <path
        d="M5 7 L15 25 L19.5 15.5 L22 19.5 L27 9"
        stroke="var(--accent-bright)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ size = "md", showTagline = false }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      <VeluneMark px={sizes[size]} />
      <div className="leading-none">
        <p className="text-lg font-semibold tracking-[0.22em] text-fg">VELUNE</p>
        <p className="mt-1 text-[0.65rem] font-medium tracking-[0.34em] text-accent">HEALTH</p>
        {showTagline && <p className="mt-2 text-xs tracking-normal text-muted">Your health, better understood.</p>}
      </div>
    </div>
  );
}
