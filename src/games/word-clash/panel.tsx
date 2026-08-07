"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isFormableFromPool } from "./letter-pool";
import { isRealWord } from "./dictionary";
import { wordScore } from "./scoring";
import type { WordClashAction, WordClashState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

interface WordClashPanelProps {
  state: WordClashState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: WordClashAction) => void;
  disabled?: boolean;
}

export function WordClashPanel({ state, myPlayerId, players, onAction, disabled }: WordClashPanelProps) {
  const [draft, setDraft] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((state.roundEndsAt - Date.now()) / 1000)));
  const advanceRequested = useRef(false);

  useEffect(() => {
    advanceRequested.current = false;
  }, [state.round]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((state.roundEndsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && state.status === "round-active" && !advanceRequested.current) {
        advanceRequested.current = true;
        onAction({ type: "advance-round", now: Date.now() });
      }
    }, 250);
    return () => clearInterval(interval);
  }, [state.roundEndsAt, state.status, onAction]);

  const myWords = state.submissions[myPlayerId] ?? [];

  async function handleSubmit() {
    const word = draft.trim().toUpperCase();
    setInlineError(null);
    if (word.length < 3) {
      setInlineError("Words need at least 3 letters.");
      return;
    }
    if (!isFormableFromPool(word, state.letterPool)) {
      setInlineError("That word isn't in this round's letters.");
      return;
    }
    if (myWords.some((s) => s.word === word)) {
      setInlineError("Already submitted that one.");
      return;
    }
    if (!(await isRealWord(word))) {
      setInlineError("Not a real word.");
      return;
    }
    onAction({ type: "submit-word", word });
    setDraft("");
  }

  const lastRoundResult = state.roundHistory[state.roundHistory.length - 1];

  const rankedPlayers = useMemo(
    () =>
      [...state.players].sort(
        (a, b) => (state.totalScores[b.playerId] ?? 0) - (state.totalScores[a.playerId] ?? 0),
      ),
    [state.players, state.totalScores],
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        <Badge variant="secondary">
          Round {state.round}/{state.totalRounds}
        </Badge>
        <Badge variant={secondsLeft <= 10 ? "destructive" : "outline"} className="tabular-nums">
          {secondsLeft}s
        </Badge>
      </div>

      <div className="flex flex-wrap justify-center gap-2" aria-label="Letter pool">
        {state.letterPool.map((letter, i) => (
          <span
            key={`${letter}-${i}`}
            className="flex size-9 items-center justify-center rounded-lg border bg-card font-display text-lg font-bold sm:size-10"
          >
            {letter}
          </span>
        ))}
      </div>

      {!disabled && state.status === "round-active" && (
        <div className="flex w-full max-w-sm flex-col gap-1">
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Build a word…"
              maxLength={12}
              autoComplete="off"
            />
            <Button onClick={handleSubmit}>Submit</Button>
          </div>
          {inlineError && <p className="text-sm text-destructive">{inlineError}</p>}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-1.5">
        {myWords.map((s) => (
          <Badge key={s.word} variant="outline">
            {s.word} · {wordScore(s.word.length)}pt
          </Badge>
        ))}
      </div>

      {lastRoundResult && (
        <p className="text-sm text-muted-foreground">
          Last round: {Object.entries(lastRoundResult.scores).map(([id, score]) => {
            const name = players.find((p) => p.playerId === id)?.nickname ?? "Player";
            return `${name} +${score}`;
          }).join(" · ")}
        </p>
      )}

      <ol className="flex w-full max-w-sm flex-col gap-1">
        {rankedPlayers.map((p, i) => (
          <li key={p.playerId} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm">
            <span>
              {i + 1}. {players.find((rp) => rp.playerId === p.playerId)?.nickname ?? p.nickname}
              {p.playerId === myPlayerId && " (you)"}
            </span>
            <span className="font-display font-bold tabular-nums">{state.totalScores[p.playerId] ?? 0}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
