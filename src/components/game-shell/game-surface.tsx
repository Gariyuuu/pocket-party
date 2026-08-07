"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { GameId } from "@/games/core/registry";
import type { RoomPlayer } from "@/lib/multiplayer/types";
import type { UseRealtimeRoomResult } from "@/lib/realtime/use-realtime-room";

/** Only Orb Hockey and Quick Draw need this — their high-frequency, never-persisted paddle/puck/stroke sync. */
export type RealtimeBroadcast = Pick<UseRealtimeRoomResult, "sendBroadcast" | "onBroadcast">;

// Each board is its own chunk — a room playing Grid Three never downloads
// Fourfall's or Word Clash's code (or the big bundled dictionary Word Clash
// and Word Bites share, see games/core/dictionary.ts).
const GridThreeBoard = dynamic(() => import("@/games/grid-three/board").then((m) => m.GridThreeBoard), {
  loading: () => <Skeleton className="h-72 w-72" />,
});
const FourfallBoard = dynamic(() => import("@/games/fourfall/board").then((m) => m.FourfallBoard), {
  loading: () => <Skeleton className="h-72 w-72" />,
});
const WordClashPanel = dynamic(() => import("@/games/word-clash/panel").then((m) => m.WordClashPanel), {
  loading: () => <Skeleton className="h-72 w-full max-w-sm" />,
});
const BounceCupBoard = dynamic(() => import("@/games/bounce-cup/board").then((m) => m.BounceCupBoard), {
  loading: () => <Skeleton className="h-56 w-full max-w-2xl" />,
});
const MiniHoopsBoard = dynamic(() => import("@/games/mini-hoops/board").then((m) => m.MiniHoopsBoard), {
  loading: () => <Skeleton className="h-56 w-full max-w-2xl" />,
});
const TankTacticsBoard = dynamic(() => import("@/games/tank-tactics/board").then((m) => m.TankTacticsBoard), {
  loading: () => <Skeleton className="h-96 w-full max-w-3xl" />,
});
const PocketShotsBoard = dynamic(() => import("@/games/pocket-shots/board").then((m) => m.PocketShotsBoard), {
  loading: () => <Skeleton className="h-56 w-full max-w-2xl" />,
});
const OrbHockeyBoard = dynamic(() => import("@/games/orb-hockey/board").then((m) => m.OrbHockeyBoard), {
  loading: () => <Skeleton className="h-[460px] w-[300px]" />,
});
const QuickDrawBoard = dynamic(() => import("@/games/quick-draw/board").then((m) => m.QuickDrawBoard), {
  loading: () => <Skeleton className="h-72 w-full max-w-xl" />,
});
const TileRushBoard = dynamic(() => import("@/games/tile-rush/board").then((m) => m.TileRushBoard), {
  loading: () => <Skeleton className="h-72 w-full max-w-sm" />,
});
const MiniGolfBoard = dynamic(() => import("@/games/mini-golf/board").then((m) => m.MiniGolfBoard), {
  loading: () => <Skeleton className="h-56 w-full max-w-2xl" />,
});
const WordBitesPanel = dynamic(() => import("@/games/word-bites/panel").then((m) => m.WordBitesPanel), {
  loading: () => <Skeleton className="h-72 w-full max-w-sm" />,
});
const SeaBattleBoard = dynamic(() => import("@/games/sea-battle/board").then((m) => m.SeaBattleBoard), {
  loading: () => <Skeleton className="h-72 w-full max-w-2xl" />,
});
const CheckersBoard = dynamic(() => import("@/games/checkers/board").then((m) => m.CheckersBoard), {
  loading: () => <Skeleton className="h-96 w-96" />,
});
const ChessBoard = dynamic(() => import("@/games/chess/board").then((m) => m.ChessBoard), {
  loading: () => <Skeleton className="h-96 w-96" />,
});
const DartsBoard = dynamic(() => import("@/games/darts/board").then((m) => m.DartsBoard), {
  loading: () => <Skeleton className="h-56 w-full max-w-2xl" />,
});
const CornholeBoard = dynamic(() => import("@/games/cornhole/board").then((m) => m.CornholeBoard), {
  loading: () => <Skeleton className="h-56 w-full max-w-2xl" />,
});
const ReversiBoard = dynamic(() => import("@/games/reversi/board").then((m) => m.ReversiBoard), {
  loading: () => <Skeleton className="h-96 w-96" />,
});
const DotsAndBoxesBoard = dynamic(() => import("@/games/dots-and-boxes/board").then((m) => m.DotsAndBoxesBoard), {
  loading: () => <Skeleton className="h-96 w-96" />,
});
const YahtzeeBoard = dynamic(() => import("@/games/yahtzee/board").then((m) => m.YahtzeeBoard), {
  loading: () => <Skeleton className="h-96 w-full max-w-md" />,
});
const MancalaBoard = dynamic(() => import("@/games/mancala/board").then((m) => m.MancalaBoard), {
  loading: () => <Skeleton className="h-56 w-full max-w-lg" />,
});
const TriviaBlitzPanel = dynamic(() => import("@/games/trivia-blitz/panel").then((m) => m.TriviaBlitzPanel), {
  loading: () => <Skeleton className="h-72 w-full max-w-md" />,
});

interface GameSurfaceProps {
  gameId: GameId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any;
  myPlayerId: string;
  players: RoomPlayer[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction: (action: any) => void;
  disabled?: boolean;
  /** Present for online matches, absent for local solo-vs-bot — Orb Hockey uses this to decide whether to open a broadcast channel or run a local bot paddle. */
  matchId?: string;
  /** Present for online matches only — Orb Hockey/Quick Draw's ephemeral paddle/puck/stroke sync, published directly over Ably (see protocol.ts's RoomBroadcastEvent). */
  broadcast?: RealtimeBroadcast;
  /** Solo-mode-only: how sharp Orb Hockey's built-in bot paddle should be. */
  botDifficulty?: "easy" | "medium" | "hard";
  /** Solo-mode-only: Quick Draw's first-letter hint when the bot is "drawing" (bots can't actually draw). */
  quickDrawHint?: string;
}

/** Dispatches to the right game's presentational board — the one place that knows every game id. */
export function GameSurface({
  gameId,
  state,
  myPlayerId,
  players,
  onAction,
  disabled,
  matchId,
  broadcast,
  botDifficulty,
  quickDrawHint,
}: GameSurfaceProps) {
  switch (gameId) {
    case "grid-three":
      return (
        <GridThreeBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "fourfall":
      return (
        <FourfallBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "word-clash":
      return (
        <WordClashPanel
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "bounce-cup":
      return (
        <BounceCupBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "mini-hoops":
      return (
        <MiniHoopsBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "tank-tactics":
      return (
        <TankTacticsBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "pocket-shots":
      return (
        <PocketShotsBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "orb-hockey":
      return (
        <OrbHockeyBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
          matchId={matchId}
          broadcast={broadcast}
          botDifficulty={botDifficulty}
        />
      );
    case "quick-draw":
      return (
        <QuickDrawBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
          matchId={matchId}
          broadcast={broadcast}
          hint={quickDrawHint}
        />
      );
    case "tile-rush":
      return (
        <TileRushBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "mini-golf":
      return (
        <MiniGolfBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "word-bites":
      return (
        <WordBitesPanel
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "sea-battle":
      return (
        <SeaBattleBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "checkers":
      return (
        <CheckersBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "chess":
      return (
        <ChessBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "darts":
      return (
        <DartsBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "cornhole":
      return (
        <CornholeBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "reversi":
      return (
        <ReversiBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "dots-and-boxes":
      return (
        <DotsAndBoxesBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "yahtzee":
      return (
        <YahtzeeBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "mancala":
      return (
        <MancalaBoard
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    case "trivia-blitz":
      return (
        <TriviaBlitzPanel
          state={state}
          myPlayerId={myPlayerId}
          players={players}
          onAction={onAction}
          disabled={disabled}
        />
      );
    default:
      return null;
  }
}
