import type { JSX } from "react";

/**
 * Shared visual mark for every generated icon size (favicon, apple touch
 * icon) — a rounded gradient square with a simple controller glyph, drawn
 * with plain divs (no `transform`, kept to flexbox + absolute positioning)
 * since next/og's ImageResponse renders through Satori, a constrained CSS
 * subset rather than a full browser engine.
 */
export function IconMark({ size }: { size: number }): JSX.Element {
  const pad = size * 0.16;
  const glyphWidth = size - pad * 2;
  const glyphHeight = glyphWidth * 0.62;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 55%, #f59e0b 100%)",
        borderRadius: size * 0.22,
      }}
    >
      <div
        style={{
          width: glyphWidth,
          height: glyphHeight,
          display: "flex",
          position: "relative",
          background: "#ffffff",
          borderRadius: glyphHeight * 0.4,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: glyphWidth * 0.14,
            top: glyphHeight * 0.36,
            width: glyphWidth * 0.16,
            height: glyphHeight * 0.28,
            background: "#7c3aed",
            borderRadius: glyphHeight * 0.06,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: glyphWidth * 0.13,
            top: glyphHeight * 0.16,
            width: glyphWidth * 0.15,
            height: glyphHeight * 0.28,
            background: "#ec4899",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: glyphWidth * 0.3,
            bottom: glyphHeight * 0.16,
            width: glyphWidth * 0.15,
            height: glyphHeight * 0.28,
            background: "#f59e0b",
            borderRadius: "50%",
          }}
        />
      </div>
    </div>
  );
}
