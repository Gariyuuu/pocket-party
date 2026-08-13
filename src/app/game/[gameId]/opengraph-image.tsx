import { ImageResponse } from "next/og";
import { AVAILABLE_GAMES, GAME_REGISTRY, type GameId } from "@/games/core/registry";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return AVAILABLE_GAMES.map((game) => ({ gameId: game.id }));
}

const ACCENT_HEX: Record<string, string> = {
  violet: "#7c3aed",
  pink: "#ec4899",
  cyan: "#06b6d4",
  amber: "#f59e0b",
  lime: "#84cc16",
};

export default async function Image({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const game = GAME_REGISTRY[gameId as GameId];
  const accent = ACCENT_HEX[game?.accent ?? "violet"];

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
            fontSize: 96,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
          }}
        >
          {game?.name ?? "Pocket Party"}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 40,
            color: accent,
            fontWeight: 600,
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          {game?.tagline ?? "A Pocket Party mini-game"}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 60,
            fontSize: 30,
            color: "#a3a3a3",
            textAlign: "center",
          }}
        >
          Pocket Party
        </div>
      </div>
    ),
    { ...size },
  );
}
