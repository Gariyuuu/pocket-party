"use client";

import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { scoreForCategory, totalScore, upperSectionSubtotal, UPPER_BONUS, UPPER_BONUS_THRESHOLD } from "./scoring";
import { YAHTZEE_CATEGORIES } from "./types";
import type { YahtzeeAction, YahtzeeCategory, YahtzeeState } from "./types";
import type { RoomPlayer } from "@/lib/multiplayer/types";

const DIE_ICONS = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

const CATEGORY_LABELS: Record<YahtzeeCategory, string> = {
  ones: "Ones",
  twos: "Twos",
  threes: "Threes",
  fours: "Fours",
  fives: "Fives",
  sixes: "Sixes",
  threeOfKind: "3 of a Kind",
  fourOfKind: "4 of a Kind",
  fullHouse: "Full House",
  smallStraight: "Sm. Straight",
  largeStraight: "Lg. Straight",
  yahtzee: "Yahtzee",
  chance: "Chance",
};

export function YahtzeeBoard({
  state,
  myPlayerId,
  players,
  onAction,
  disabled,
}: {
  state: YahtzeeState;
  myPlayerId: string;
  players: RoomPlayer[];
  onAction: (action: YahtzeeAction) => void;
  disabled?: boolean;
}) {
  const isMyTurn = state.currentTurnPlayerId === myPlayerId && state.status === "active";
  const currentPlayer = players.find((p) => p.playerId === state.currentTurnPlayerId);
  const hasRolled = state.rollsUsedThisTurn > 0;
  const myScores = state.scores[myPlayerId] ?? {};

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-center font-medium" aria-live="polite">
        {state.status === "match-ended"
          ? state.isDraw
            ? "It's a draw!"
            : state.winnerPlayerId === myPlayerId
              ? "You won!"
              : `${players.find((p) => p.playerId === state.winnerPlayerId)?.nickname ?? "Opponent"} won`
          : isMyTurn
            ? hasRolled
              ? `Roll ${state.rollsUsedThisTurn}/3 — hold dice, roll again, or score`
              : "Your turn — roll the dice"
            : `${currentPlayer?.nickname ?? "Opponent"}'s turn`}
      </p>

      <div className="flex gap-2">
        {state.dice.map((value, i) => {
          const Icon = DIE_ICONS[value - 1];
          const held = state.heldDice[i];
          return (
            <button
              key={i}
              type="button"
              disabled={disabled || !isMyTurn || !hasRolled}
              aria-label={`Die showing ${value}${held ? ", held" : ""}`}
              onClick={() => onAction({ type: "toggle-hold", die: i })}
              className={cn(
                "flex size-12 items-center justify-center rounded-xl border-2 bg-card transition-colors sm:size-14",
                held ? "border-party-pink bg-party-pink/20" : "border-border",
              )}
            >
              <Icon className="size-8 sm:size-10" />
            </button>
          );
        })}
      </div>

      <Button disabled={disabled || !isMyTurn || state.rollsUsedThisTurn >= 3} onClick={() => onAction({ type: "roll" })}>
        {hasRolled ? `Roll again (${3 - state.rollsUsedThisTurn} left)` : "Roll"}
      </Button>

      <div className="w-full max-w-md overflow-x-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="p-2 text-left font-medium">Category</th>
              {players.map((p) => (
                <th key={p.playerId} className="p-2 text-right font-medium">
                  {p.playerId === myPlayerId ? "You" : p.nickname}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {YAHTZEE_CATEGORIES.map((category) => (
              <tr key={category} className="border-b last:border-b-0">
                <td className="p-2">{CATEGORY_LABELS[category]}</td>
                {players.map((p) => {
                  const playerScores = state.scores[p.playerId] ?? {};
                  const filled = playerScores[category];
                  const canScoreHere = isMyTurn && p.playerId === myPlayerId && hasRolled && filled === undefined;
                  return (
                    <td key={p.playerId} className="p-2 text-right">
                      {filled !== undefined ? (
                        filled
                      ) : canScoreHere ? (
                        <button
                          type="button"
                          disabled={disabled}
                          className="rounded-md bg-party-lime/30 px-2 py-0.5 font-medium hover:bg-party-lime/50"
                          onClick={() => onAction({ type: "score", category })}
                        >
                          {scoreForCategory(state.dice, category)}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t bg-muted/40">
              <td className="p-2 font-medium">Upper bonus (63+ → +35)</td>
              {players.map((p) => {
                const playerScores = state.scores[p.playerId] ?? {};
                const subtotal = upperSectionSubtotal(playerScores);
                return (
                  <td key={p.playerId} className="p-2 text-right text-muted-foreground">
                    {subtotal}/{UPPER_BONUS_THRESHOLD}
                    {subtotal >= UPPER_BONUS_THRESHOLD ? ` (+${UPPER_BONUS})` : ""}
                  </td>
                );
              })}
            </tr>
            <tr className="bg-muted/60 font-semibold">
              <td className="p-2">Total</td>
              {players.map((p) => (
                <td key={p.playerId} className="p-2 text-right">
                  {totalScore(state.scores[p.playerId] ?? {})}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {state.status === "active" && Object.keys(myScores).length === YAHTZEE_CATEGORIES.length && (
        <p className="text-xs text-muted-foreground">You&apos;ve filled every category — waiting for the others to finish.</p>
      )}
    </div>
  );
}
