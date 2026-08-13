import { ImageResponse } from "next/og";

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
          background: "#0a0a0a",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 104,
            fontWeight: 800,
            textAlign: "center",
            backgroundImage: "linear-gradient(135deg, #7c3aed 0%, #ec4899 55%, #f59e0b 100%)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Pocket Party
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 34,
            color: "#a3a3a3",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          Play fast multiplayer mini-games with friends, right in the browser
        </div>
      </div>
    ),
    { ...size },
  );
}
