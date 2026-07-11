import { ImageResponse } from "next/og";

export const alt = "Daily Deutsch — Daily German Reading & Listening Practice";
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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F9FAFB",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 180, lineHeight: 1, marginBottom: 24 }}>🥨</div>
        <div style={{ fontSize: 76, fontWeight: 700, color: "#111827" }}>
          Daily Deutsch
        </div>
        <div style={{ fontSize: 32, color: "#6B7280", marginTop: 20 }}>
          Daily German Reading &amp; Listening Practice
        </div>
      </div>
    ),
    { ...size }
  );
}
