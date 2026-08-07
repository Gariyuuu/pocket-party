"use client";

import { cn } from "@/lib/utils";
import { TRIVIA_QUESTIONS } from "./questions";
import type { TriviaBlitzAction, TriviaBlitzState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

const OPTION_LABELS = ["A", "B", "C", "D"];

export function TriviaBlitzPanel({
  state,
  myPlayerId,
  players,
  onAction,
  disabled,
}: {
  state: TriviaBlitzState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: TriviaBlitzAction) => void;
  disabled?: boolean;
}) {
  const questionIndex = state.questionOrder[state.round - 1];
  const question = TRIVIA_QUESTIONS[questionIndex];
  const myAnswer = state.answers[myPlayerId];
  const answeredCount = Object.keys(state.answers).length;

  function submit(answerIndex: number) {
    if (disabled || myAnswer || state.status !== "round-active") return;
    onAction({ type: "answer", answerIndex });
  }

  if (state.status === "match-ended") {
    const sorted = [...state.players].sort((a, b) => (state.totalScores[b.playerId] ?? 0) - (state.totalScores[a.playerId] ?? 0));
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <p className="text-center font-medium" aria-live="polite">
          {state.isDraw ? "It's a draw!" : state.winnerPlayerId === myPlayerId ? "You won!" : `${players.find((p) => p.playerId === state.winnerPlayerId)?.nickname ?? "Opponent"} won`}
        </p>
        <div className="w-full max-w-sm space-y-2 rounded-2xl border p-4">
          {sorted.map((p) => (
            <div key={p.playerId} className="flex items-center justify-between">
              <span>{p.playerId === myPlayerId ? "You" : (players.find((pl) => pl.playerId === p.playerId)?.nickname ?? "Player")}</span>
              <span className="font-semibold">{state.totalScores[p.playerId] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-center text-sm text-muted-foreground" aria-live="polite">
        Question {state.round} of {state.totalRounds} — {answeredCount}/{state.players.length} answered
      </p>

      <div className="w-full max-w-md rounded-2xl border bg-card p-5">
        <p className="mb-4 text-center text-lg font-semibold">{question.question}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {question.options.map((option, i) => {
            const isMine = myAnswer?.answerIndex === i;
            const revealCorrectness = myAnswer !== undefined;
            const isCorrectOption = revealCorrectness && i === question.correctIndex;
            return (
              <button
                key={option}
                type="button"
                disabled={disabled || myAnswer !== undefined}
                onClick={() => submit(i)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-3 text-left transition-colors",
                  !revealCorrectness && "hover:bg-party-violet/15",
                  isCorrectOption && "border-party-lime bg-party-lime/20",
                  isMine && !isCorrectOption && "border-party-pink bg-party-pink/20",
                )}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {OPTION_LABELS[i]}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>
      </div>

      {myAnswer && (
        <p className="text-sm text-muted-foreground">
          {myAnswer.correct ? "Correct! " : "Not quite. "}
          Waiting on {state.players.length - answeredCount} more player{state.players.length - answeredCount === 1 ? "" : "s"}…
        </p>
      )}

      <div className="flex gap-4 text-sm text-muted-foreground">
        {state.players.map((p) => (
          <span key={p.playerId}>
            {p.playerId === myPlayerId ? "You" : (players.find((pl) => pl.playerId === p.playerId)?.nickname ?? "Player")}: {state.totalScores[p.playerId] ?? 0}
          </span>
        ))}
      </div>
    </div>
  );
}
