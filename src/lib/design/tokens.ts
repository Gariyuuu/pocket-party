/**
 * Pocket Party design tokens.
 *
 * Player identity is never color-only: each slot pairs a CSS color variable
 * with a distinct shape so colorblind players can always tell slots apart.
 */

export type PlayerSlot = 1 | 2 | 3 | 4;

export type PlayerShape = "circle" | "triangle" | "square" | "diamond";

export const PLAYER_IDENTITY: Record<
  PlayerSlot,
  { colorVar: string; shape: PlayerShape; label: string }
> = {
  1: { colorVar: "var(--color-player-1)", shape: "circle", label: "Player 1" },
  2: { colorVar: "var(--color-player-2)", shape: "triangle", label: "Player 2" },
  3: { colorVar: "var(--color-player-3)", shape: "square", label: "Player 3" },
  4: { colorVar: "var(--color-player-4)", shape: "diamond", label: "Player 4" },
};

export const AVATAR_COLOR_OPTIONS = [
  { id: "violet", value: "var(--color-party-violet)", label: "Violet" },
  { id: "pink", value: "var(--color-party-pink)", label: "Pink" },
  { id: "cyan", value: "var(--color-party-cyan)", label: "Cyan" },
  { id: "amber", value: "var(--color-party-amber)", label: "Amber" },
  { id: "lime", value: "var(--color-party-lime)", label: "Lime" },
  { id: "p1", value: "var(--color-player-1)", label: "Sky" },
  { id: "p2", value: "var(--color-player-2)", label: "Coral" },
  { id: "p4", value: "var(--color-player-4)", label: "Berry" },
] as const;

export type AvatarColorId = (typeof AVATAR_COLOR_OPTIONS)[number]["id"];

/** Consistent spacing scale used across game shells and modals (rem units). */
export const SPACING = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
} as const;

/** Typography scale for headings/body across the platform. */
export const TYPE_SCALE = {
  display: "clamp(2.25rem, 4vw + 1rem, 3.75rem)",
  h1: "clamp(1.75rem, 2vw + 1rem, 2.5rem)",
  h2: "clamp(1.375rem, 1vw + 1rem, 1.75rem)",
  body: "1rem",
  small: "0.875rem",
  tiny: "0.75rem",
} as const;
