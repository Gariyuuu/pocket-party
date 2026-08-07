"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Maximize, Minimize } from "lucide-react";
import { GameSurface } from "./game-surface";
import { MatchResult } from "./match-result";
import { RulesModal } from "./rules-modal";
import { TutorialOverlay } from "./tutorial-overlay";
import { LandscapeHint } from "./landscape-hint";
import { PHYSICS_HEAVY_GAMES } from "./physics-heavy-games";
import { Button } from "@/components/ui/button";
import { GAME_CONTENT } from "@/games/core/game-content";
import { getGameMeta, type GameId } from "@/games/core/registry";
import { getGameEngine } from "@/games/core/engines";
import { randomSeed } from "@/games/core/rng";
import { useGuestIdentity } from "@/lib/identity/use-guest-identity";
import type { AvatarColorId } from "@/lib/design/tokens";
import type { RoomPlayer } from "@/lib/multiplayer/types";
import { playSfx } from "@/lib/audio/sfx";
import { vibrate } from "@/lib/audio/use-audio-settings";
import { useFullscreen } from "@/lib/design/use-fullscreen";
import { pickWordClashBotWords } from "@/games/word-clash/bot";
import { getWordList } from "@/games/word-clash/dictionary";
import type { WordClashState } from "@/games/word-clash/types";
import type { QuickDrawState } from "@/games/quick-draw/types";
import { pickTileRushMove } from "@/games/tile-rush/bot";
import type { TileRushState } from "@/games/tile-rush/types";

const BOT_GUESS_ACCURACY = { easy: 0.5, medium: 0.7, hard: 0.9 } as const;
const BOT_GUESS_DELAY_MS = { easy: 9000, medium: 6000, hard: 3500 } as const;
const TILE_RUSH_BOT_INTERVAL_MS = { easy: 1800, medium: 1200, hard: 700 } as const;

const YOU_ID = "solo-you";
const BOT_ID = "solo-bot";

type Difficulty = "easy" | "medium" | "hard";

function makeSoloPlayers(nickname: string, avatarColor: AvatarColorId, botName: string): RoomPlayer[] {
  return [
    {
      id: YOU_ID,
      playerId: YOU_ID,
      nickname,
      avatarColor,
      isHost: true,
      isReady: true,
      connectionStatus: "connected",
      seat: 1,
    },
    {
      id: BOT_ID,
      playerId: BOT_ID,
      nickname: botName,
      avatarColor: "amber",
      isHost: false,
      isReady: true,
      connectionStatus: "connected",
      seat: 2,
    },
  ];
}

export function SoloGameShell({ gameId, difficulty }: { gameId: GameId; difficulty: Difficulty }) {
  const router = useRouter();
  const { nickname, avatarColor } = useGuestIdentity();
  const engine = getGameEngine(gameId);
  const meta = getGameMeta(gameId);
  const content = GAME_CONTENT[gameId];
  const botLabel = `Bot (${difficulty[0].toUpperCase()}${difficulty.slice(1)})`;
  const players = useRef(makeSoloPlayers(nickname, avatarColor, botLabel)).current;
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle: toggleFullscreen, supported: fullscreenSupported } = useFullscreen(
    () => containerRef.current,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [state, setState] = useState<any>(() =>
    engine?.createInitialState({
      seed: randomSeed(),
      players: [
        { playerId: YOU_ID, seat: 1, nickname },
        { playerId: BOT_ID, seat: 2, nickname: botLabel },
      ],
      modifiers: {},
      now: Date.now(),
    }),
  );

  const wordListRef = useRef<string[] | null>(null);
  const stockedRoundRef = useRef<number>(0);

  useEffect(() => {
    if (gameId !== "word-clash" || !state) return;
    const wordState = state as WordClashState;
    if (stockedRoundRef.current === wordState.round) return;
    stockedRoundRef.current = wordState.round;

    (async () => {
      if (!wordListRef.current) wordListRef.current = await getWordList();
      const botWords = pickWordClashBotWords(wordState.letterPool, wordListRef.current, difficulty);
      let current = wordState;
      for (const word of botWords) {
        const result = engine!.applyAction(current, { type: "submit-word", word }, BOT_ID);
        if (result.ok) current = result.nextState as WordClashState;
      }
      setState(current);
    })();
  }, [gameId, state, difficulty, engine]);

  const quickDrawGuessedRound = useRef<number>(-1);
  useEffect(() => {
    if (gameId !== "quick-draw" || !state) return;
    const drawState = state as QuickDrawState;
    if (drawState.artistPlayerId !== YOU_ID) return; // bot only guesses when the human is drawing
    if (drawState.guesses[BOT_ID] || quickDrawGuessedRound.current === drawState.round) return;
    quickDrawGuessedRound.current = drawState.round;

    const timeout = setTimeout(() => {
      const guessCorrectly = Math.random() < BOT_GUESS_ACCURACY[difficulty];
      const answerIndex = guessCorrectly
        ? drawState.correctIndex
        : (drawState.correctIndex + 1 + Math.floor(Math.random() * (drawState.options.length - 1))) %
          drawState.options.length;
      const result = engine!.applyAction(
        drawState,
        { type: "submit-guess", answerIndex, now: Date.now() },
        BOT_ID,
      );
      if (result.ok) setState(result.nextState);
    }, BOT_GUESS_DELAY_MS[difficulty] * (0.6 + Math.random() * 0.8));

    return () => clearTimeout(timeout);
  }, [gameId, state, difficulty, engine]);

  useEffect(() => {
    if (gameId !== "tile-rush") return;
    const interval = setInterval(() => {
      setState((current: TileRushState) => {
        if (!current || current.status !== "active") return current;
        const move = pickTileRushMove(current, BOT_ID, difficulty);
        if (!move) return current;
        const result = engine!.applyAction(current, move, BOT_ID);
        return result.ok ? result.nextState : current;
      });
    }, TILE_RUSH_BOT_INTERVAL_MS[difficulty]);
    return () => clearInterval(interval);
  }, [gameId, difficulty, engine]);

  if (!engine || !meta || !state) {
    return <p className="p-8 text-center text-muted-foreground">This game isn&apos;t available yet.</p>;
  }

  const outcome = engine.checkOutcome(state);
  const quickDrawHint =
    gameId === "quick-draw" && (state as QuickDrawState).artistPlayerId === BOT_ID
      ? (state as QuickDrawState).promptWord[0]?.toUpperCase()
      : undefined;

  function handleAction(action: Record<string, unknown> & { type: string }) {
    const result = engine!.applyAction(state, action, YOU_ID);
    if (!result.ok) {
      playSfx("error");
      vibrate(25);
      toast.error(result.message);
      return;
    }
    playSfx(action.type === "place" || action.type === "drop" ? "place" : "select");
    setState(result.nextState);

    const nextOutcome = engine!.checkOutcome(result.nextState);
    const currentTurn = (result.nextState as { currentTurnPlayerId?: string }).currentTurnPlayerId;
    if (nextOutcome.status === "active" && currentTurn === BOT_ID && engine!.getBotAction) {
      setTimeout(() => {
        const botAction = engine!.getBotAction!(result.nextState, BOT_ID, difficulty);
        const botResult = engine!.applyAction(result.nextState, botAction, BOT_ID);
        if (botResult.ok) {
          playSfx(botAction.type === "place" || botAction.type === "drop" ? "place" : "select");
          setState(botResult.nextState);
        }
      }, 500);
    } else if (nextOutcome.status !== "active") {
      const won = nextOutcome.status === "win" && nextOutcome.winnerPlayerId === YOU_ID;
      playSfx(won ? "win" : "draw");
      vibrate(won ? [0, 60, 40, 60] : [0, 120]);
    }
  }

  function handlePlayAgain() {
    setState(
      engine!.createInitialState({
        seed: randomSeed(),
        players: [
          { playerId: YOU_ID, seat: 1, nickname },
          { playerId: BOT_ID, seat: 2, nickname: botLabel },
        ],
        modifiers: {},
        now: Date.now(),
      }),
    );
    stockedRoundRef.current = 0;
  }

  return (
    <div ref={containerRef} className="mx-auto flex max-w-lg flex-col items-center gap-4 bg-background p-4 py-8">
      <div className="flex w-full items-center justify-between">
        <h1 className="font-display text-xl font-bold">{meta.name} · Solo</h1>
        <div className="flex items-center">
          {fullscreenSupported && (
            <Button variant="ghost" size="icon" aria-label="Toggle fullscreen" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            </Button>
          )}
          {content && <RulesModal title={meta.name} content={content} />}
        </div>
      </div>

      {PHYSICS_HEAVY_GAMES.has(meta.id) && <LandscapeHint />}

      {content && <TutorialOverlay gameId={meta.id} title={meta.name} content={content} />}

      <GameSurface
        gameId={meta.id}
        state={state}
        myPlayerId={YOU_ID}
        players={players}
        onAction={handleAction}
        disabled={outcome.status !== "active"}
        botDifficulty={difficulty}
        quickDrawHint={quickDrawHint}
      />

      {outcome.status !== "active" && (
        <MatchResult
          outcome={outcome.status === "draw" ? "draw" : "win"}
          winnerName={outcome.status === "win" ? botLabel : undefined}
          isMe={outcome.status === "win" && outcome.winnerPlayerId === YOU_ID}
          isHost
          onRematch={handlePlayAgain}
          onBackToLobby={() => router.push("/")}
          onLeave={() => router.push("/")}
        />
      )}
    </div>
  );
}
