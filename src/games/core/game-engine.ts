import type { GameId } from "./registry";
import type { ActionValidationResult } from "./action";

export interface EnginePlayer {
  playerId: string;
  seat: number;
  nickname: string;
}

export type MatchOutcome =
  | { status: "active" }
  | { status: "draw" }
  | { status: "win"; winnerPlayerId: string };

/**
 * Contract every game implements once, in games/<id>/engine.ts. This is what
 * makes the platform "a reusable multiplayer engine" instead of bespoke
 * networking per game: the room/match/action plumbing in lib/multiplayer
 * only ever talks to this interface, never to a specific game's internals.
 *
 * TState and TAction are plain JSON-serializable objects (they round-trip
 * through the game_states.state and match_actions.payload jsonb columns).
 */
export interface GameEngine<TState, TAction> {
  readonly gameId: GameId;

  createInitialState(params: {
    seed: string;
    players: EnginePlayer[];
    modifiers: Record<string, unknown>;
    /**
     * Server wall-clock time at match creation, supplied by the caller so
     * time-boxed games (Word Clash's round timer) can compute a deadline
     * without the engine itself ever calling Date.now().
     */
    now: number;
  }): TState;

  /**
   * Pure validation + reducer in one step: given the current state and a
   * candidate action from a specific player, either reject it with a reason
   * or return the resulting next state. Must be deterministic and must never
   * read wall-clock time, network, or non-seeded randomness.
   */
  applyAction(
    state: TState,
    action: TAction,
    fromPlayerId: string,
  ): ActionValidationResult<TState>;

  checkOutcome(state: TState): MatchOutcome;

  /** A simple scripted opponent for solo mode, keyed by difficulty. */
  getBotAction?(state: TState, botPlayerId: string, difficulty: "easy" | "medium" | "hard"): TAction;
}
