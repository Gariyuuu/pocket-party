# UI_SYSTEM.md

All facts **Verified** by reading `src/app/globals.css` in full plus the components named below, unless marked otherwise.

## Layout system

- No dedicated layout-primitive components (no custom `Grid`/`Stack` components) — plain Tailwind flex/grid utility classes directly in JSX throughout.
- `src/app/layout.tsx` is the single root layout; no nested route-group layouts exist (flat route structure).
- Safe-area utility classes for notches/home indicators: `.safe-top`, `.safe-bottom`, `.safe-x` (`globals.css`).

## Navigation

- `src/components/landing/site-nav.tsx` — the top nav, used on the landing page and `/lobby` (confirmed present on `/lobby` via `src/app/lobby/page.tsx`).
- No nav on `/room/[code]` (the room experience is meant to be full-screen/focused) or inside a live game (game boards are full-viewport via `game-shell`).

## Page structure (all under `src/app/`)

`page.tsx` (landing), `lobby/page.tsx` (public rooms browser), `room/[code]/page.tsx` (the whole pre-game + in-game experience for a room), `game/[gameId]/page.tsx` (**Verified**: the solo/practice entry point — renders an "isn't playable yet" empty state if the game's `status !== "available"`, otherwise renders `SoloGameShell` directly against a bot when `?mode=solo` is present, with an optional `?difficulty=easy|medium|hard` query param, defaulting to `medium`), `profile/page.tsx`, `leaderboard/page.tsx`, `patch-notes/page.tsx`, `not-found.tsx`, `error.tsx`, `global-error.tsx`.

## Reusable components (`src/components/ui/`)

shadcn/ui-generated, **`base-nova` style — built on `@base-ui/react`, not Radix.** This matters for anyone extending these: Base UI's polymorphism convention is a `render` prop (seen in use in `lobby.tsx`: `<TooltipTrigger render={<span tabIndex={0} />}>`), not Radix's `asChild`.

Present: `avatar`, `badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `separator`, `skeleton`, `slider`, `sonner` (toast provider wrapper), `switch`, `tabs`, `tooltip`. Plus hand-written, non-shadcn-generated: `game-card.tsx` (game picker tile), `player-badge.tsx` (nickname + color + shape + host/ready/you indicators), `state-panel.tsx` (exports `EmptyState`, used for not-found/empty states).

## Themes and design tokens

`src/app/globals.css` is the single source of every design token. Structure:

- **`@theme inline` block** maps semantic Tailwind color names (`--color-background`, `--color-party-violet`, `--color-player-1`, etc.) to raw CSS variables — this is what makes `bg-background`, `text-party-violet` etc. work as Tailwind utility classes.
- **`:root`** (light mode) and **`.dark`** define the actual OKLCH color values for: shadcn's standard semantic set (`background`/`foreground`/`card`/`popover`/`primary`/`secondary`/`muted`/`accent`/`destructive`/`border`/`input`/`ring`/`sidebar-*`/`chart-1..5`), plus two Pocket-Party-specific sets:
  - **Brand accents:** `--party-violet`, `--party-pink`, `--party-cyan`, `--party-amber`, `--party-lime` — these 5 are the tokens the theme wheel overwrites at runtime.
  - **Player identity colors:** `--player-1` through `--player-4` — explicitly commented as "colorblind-safe... paired with shapes/labels, never color alone," and indeed always paired with a shape (`circle`/`triangle`/`square`/`diamond`, `src/components/ui/player-badge.tsx`'s `PlayerBadgeShape`) rather than relied on alone.
- **`--radius`** (0.625rem) is the one base value every `--radius-sm` through `--radius-4xl` scale is derived from via `calc()`.
- **Dark mode:** `next-themes`, class-based (`.dark` on `<html>`), `defaultTheme="system"` (per `theme-provider.tsx` — not independently re-read this pass, consistent with `CLAUDE.md`'s prior description).
- **Theme wheel (3 palettes):** `src/lib/design/theme-packs.ts` defines `classic` / `neon` / `sunset`, each with a full light `AccentSet` and dark `AccentSet` (OKLCH values for the same 5 `violet/pink/cyan/amber/lime` slots) plus a 3-hex-color `swatch` for the picker card preview. Selecting a pack (`use-theme-pack.ts`, Zustand+persist) causes `theme-pack-provider.tsx` to overwrite the 5 `--party-*` custom properties at runtime and `themed-background.tsx` to swap in the matching PNG from `public/themes/`.
- **Theme picker UI (`src/components/theme-pack-picker.tsx`, Verified by direct read, 2026-08-06 checkpoint):** a 3-column CSS grid (`role="radiogroup"`, each option `role="radio"`/`aria-checked`) of button "cards" — each card shows an 8px-tall diagonal gradient swatch strip (built from `pack.swatch`'s 3 hex colors) plus the pack's name below it, with a `Check` icon overlay on the currently-selected card. This exact "grid of swatch cards" shape was a deliberate user choice among options presented, not the only UI this could have taken — see `DECISIONS.md` D-009.

## Background system

- `.bg-gradient-party` (diagonal violet→pink→amber), `.bg-gradient-party-soft` (3 soft radial blobs using `color-mix(in oklch, ...)`), `.text-gradient-party` (gradient text clip) — all defined once in `globals.css` `@layer utilities`, reused across landing/lobby/room-lobby chrome.
- `themed-background.tsx` renders one of the 6 procedurally-generated PNGs (`public/themes/{classic,neon,sunset}-{light,dark}.png`) as a full-bleed background on the landing page, `/lobby`, and the pre-game room lobby — generated by `scripts/generate-theme-backgrounds.js` (a hand-rolled PNG encoder using only Node's `zlib`, soft radial-blob gradients, no external image library, no fetched asset).

## Typography

- `--font-sans` (body), `--font-geist-mono` (mapped to `--font-mono`), `--font-display` (mapped to `--font-heading`, used for headings via a `font-display` utility class seen throughout, e.g. `<h1 className="font-display ...">`). Exact font family/loading mechanism (likely `next/font` in `layout.tsx`) was not re-verified line-by-line in this pass — **Needs confirmation** if precise font-loading behavior matters for a future task.

## Spacing / responsive rules

- Standard Tailwind spacing scale, no custom spacing tokens found.
- `.portrait-hint` utility: hidden by default, shown only on narrow portrait phones (`max-width: 480px` and `orientation: portrait`) — used by `game-shell/landscape-hint.tsx` to nudge players toward landscape for physics games that need the width.
- `.game-surface`: `touch-action: none` + `overscroll-behavior: contain` — prevents accidental page scroll/pull-to-refresh while playing, applied to game board containers.

## Animation system

- Framer Motion, configured globally via `<MotionConfig reducedMotion="user">` in the root layout (respects the OS/browser `prefers-reduced-motion` setting automatically, without every individual `motion.div` needing to check it).
- A CSS-level fallback also exists independently: `@media (prefers-reduced-motion: reduce)` in `globals.css` collapses all CSS animation/transition durations to near-zero — covers any plain-CSS transition that isn't Framer-Motion-driven.
- `tw-animate-css` (imported in `globals.css`) supplies additional Tailwind animation utility classes.

## Icon system

- `lucide-react` for all UI iconography (confirmed via imports in `lobby.tsx`: `Users`, `Copy`, `LogOut`, `Globe`, `Lock`).
- The app icon itself (browser tab / home screen) is separately generated via `next/og`'s `ImageResponse` in `src/app/icon.tsx` / `apple-icon.tsx` / `icon-mark.tsx` — not a lucide icon, not a static file.

## Modals / notifications

- **Modals:** shadcn `Dialog` (Base UI-backed) — used e.g. in `account-linking.tsx` for the "sign in to a different account" flow.
- **Toasts:** `sonner`, mounted once at the root layout, triggered via `toast.success(...)`/`toast.error(...)` throughout (room actions, account linking, match rejections surfaced to the player).

## Forms

- No form library (no react-hook-form/Formik) — plain controlled `useState` + Zod `safeParse` validation, seen consistently in `account-linking.tsx` (email field) and the nickname input flow.

## Loading / empty / error states

- **Loading:** ad hoc per component — e.g. `Lobby`'s `isLoading` renders a centered "Loading room…" paragraph; `skeleton.tsx` exists as a shadcn primitive for skeleton loaders where used.
- **Empty:** `state-panel.tsx`'s `EmptyState` component (title + description), used e.g. for "Room not found."
- **Error:** Next.js App Router conventions — `src/app/error.tsx` (route-segment boundary), `src/app/global-error.tsx` (root layout boundary), `src/app/not-found.tsx` (404).

## Accessibility

- Global `:focus-visible` outline safety net in `globals.css` (`@layer base`) applied to any `<button>`/`<a>`/`[role="button"]`/`[tabindex]` — explicitly there to cover custom interactive elements (game board cells, avatar-color swatches) that don't go through the shadcn `Button` component's own focus styling.
- `.high-contrast` utility class (manual toggle via Settings menu, not OS-linked): darkens borders/ring/muted-foreground and thickens all borders to 1.5px; has its own `.dark .high-contrast` override so it composes correctly with dark mode.
- `prefers-reduced-motion` respected at both the Framer Motion config level and the raw-CSS level (see Animation system above).
- Player-identity colors are deliberately paired with shape, not color-only, per the comment in `globals.css` itself.
- No automated accessibility testing (no axe-core, no Lighthouse CI step found) — accessibility here is "written with intent," not "verified by a tool or a real assistive-technology user."

## Browser support

Not explicitly documented anywhere in the repo (no `.browserslistrc`, no README section on supported browsers found in the grep-based section-header scan). **Unknown** — Next.js 15 / React 19's own baseline support applies by default.

## Known visual inconsistencies

None specifically flagged in code comments or TODOs (the broader TODO/FIXME/HACK grep in this audit returned zero matches app-wide). Any visual inconsistency in practice has not been discovered because the app has never been visually reviewed in a browser during this documentation-only audit — treat "no known issues" as "none documented," not "confirmed pixel-perfect."
