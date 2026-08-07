import { z } from "zod";

/**
 * Every player input, for every game, travels as one of these envelopes.
 * The server route handler is the only writer of match_actions — it always
 * re-derives sequence + validates before insert, never trusts a client's
 * claimed sequence number blindly (see lib/multiplayer/submit-action.ts).
 */
export const actionEnvelopeSchema = z.object({
  matchId: z.string().uuid(),
  playerId: z.string().uuid(),
  actionType: z.string().min(1).max(64),
  payload: z.record(z.string(), z.unknown()),
  clientTimestamp: z.number().int().nonnegative(),
  sequence: z.number().int().nonnegative(),
});

export type ActionEnvelope = z.infer<typeof actionEnvelopeSchema>;

export type ActionRejectionReason =
  | "wrong_player"
  | "wrong_turn"
  | "invalid_move"
  | "duplicate_action"
  | "rate_limited"
  | "match_not_active"
  | "malformed_payload";

export type ActionValidationResult<TState> =
  | { ok: true; nextState: TState }
  | { ok: false; reason: ActionRejectionReason; message: string };
