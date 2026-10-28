import { ImageResponse } from "next/og";

export const alt = "Senzora Health Intelligence. See Beyond the Signals.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
          background: "#071321",
          color: "#F2FAFF",
        }}
      >
        <svg width="220" height="220" viewBox="0 0 32 32" fill="none">
          <g stroke="#5CE1E6" strokeLinecap="round">
            <ellipse cx="16" cy="16" rx="12" ry="5" strokeWidth="1.2" transform="rotate(-30 16 16)" />
            <ellipse cx="16" cy="16" rx="12" ry="5" strokeWidth="0.9" opacity="0.5" transform="rotate(30 16 16)" />
          </g>
          <circle cx="16" cy="16" r="5.5" fill="#5CE1E6" opacity="0.2" />
          <circle cx="16" cy="16" r="2.8" fill="#F2FAFF" />
          <circle cx="26.4" cy="10" r="1.6" fill="#5CE1E6" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: 18 }}>SENZORA</div>
          <div style={{ marginTop: 8, fontSize: 28, letterSpacing: 10, color: "#5CE1E6" }}>HEALTH INTELLIGENCE</div>
          <div style={{ marginTop: 40, fontSize: 36, color: "#9EB8C9" }}>See Beyond the Signals.</div>
        </div>
      </div>
    ),
    size,
  );
}
