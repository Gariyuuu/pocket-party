import type { GameId } from "./registry";

export interface GameContent {
  rules: string[];
  tutorial: string[];
}

export const GAME_CONTENT: Partial<Record<GameId, GameContent>> = {
  "grid-three": {
    rules: [
      "Take turns placing your symbol on an empty cell.",
      "Classic mode: line up three in a row — across, down, or diagonally — to win.",
      "5x5 mode: line up four in a row instead.",
      "If every cell fills up with no line, it's a draw.",
    ],
    tutorial: [
      "Tap any empty cell on your turn to place your symbol.",
      "Watch for the winning line to animate when someone connects a row.",
    ],
  },
  fourfall: {
    rules: [
      "Take turns dropping a token into any of the seven columns.",
      "Tokens fall to the lowest open space in that column.",
      "Connect four of your tokens in a row — across, down, or diagonally — to win.",
      "If the board fills up with no connection, it's a draw.",
    ],
    tutorial: [
      "Tap a column (or the arrow above it) to drop your token there.",
      "A faint preview shows where your token will land before you drop it.",
    ],
  },
  "word-clash": {
    rules: [
      "Everyone shares the same pool of letters for the round.",
      "Build real words using only the letters shown, each used at most as many times as it appears.",
      "Longer words score more points.",
      "If two or more players submit the exact same word in a round, it scores zero for all of them.",
      "There are three rounds — highest total score wins.",
    ],
    tutorial: [
      "Type a word using only the letters in the pool, then submit before the timer runs out.",
      "You can submit as many different words as you can find each round.",
    ],
  },
  "bounce-cup": {
    rules: [
      "Take turns aiming and setting your shot power to bounce the ball down the table.",
      "Land the ball in a cup to clear it — cups don't come back once they're gone.",
      "Whoever sinks the last remaining cup wins.",
      "Turns always alternate, hit or miss.",
    ],
    tutorial: [
      "Drag the angle and power sliders, then tap Shoot.",
      "The dashed line previews your shot before you take it — the real bounce may drift a little with wind.",
    ],
  },
  "mini-hoops": {
    rules: [
      "Each player takes 5 shots, alternating turns.",
      "The hoop moves between shots — line up angle and power for where it'll be, not where it is now.",
      "Most makes after 5 shots each wins. Equal makes is a draw.",
    ],
    tutorial: [
      "Drag the angle and power sliders, then tap Shoot.",
      "Watch the hoop's position before every shot — it never stops moving.",
    ],
  },
  "tank-tactics": {
    rules: [
      "Take turns aiming, setting power, and picking a shell type, then fire at an opponent's tank.",
      "Each hit deals damage based on how close it lands to the target — direct hits hurt the most.",
      "Explosions dig craters into the terrain, and tanks slide down with it.",
      "Wind shifts every shot — the same aim won't always land the same way.",
      "Run out the turn timer and your turn is skipped.",
      "Last tank standing wins.",
    ],
    tutorial: [
      "Pick a shell type, set your angle and power, then tap Fire.",
      "Standard Shell is reliable. Split Shell covers an area. Heavy Shell hits hard but flies slower. Bounce Shell skips off terrain first. Smoke Shell barely hurts but blankets the landing zone in smoke.",
    ],
  },
  "pocket-shots": {
    rules: [
      "Drag back from the cue ball and release to shoot — the further you drag, the more power.",
      "The first ball you legally pocket assigns your group (Orbs or Rings) for the rest of the match.",
      "Pocketing the cue ball, hitting nothing, or hitting the opponent's ball first is a foul — the cue ball respawns and your turn ends.",
      "Pocket one of your own group's balls with no foul and you shoot again.",
      "Pocket the Comet ball before clearing your group and you lose instantly. Clear your group, then pocket the Comet legally, and you win.",
    ],
    tutorial: [
      "Drag away from the cue ball to aim — you're pulling back, so the ball travels the opposite way.",
      "Release to take the shot. A longer drag means more power.",
    ],
  },
  "orb-hockey": {
    rules: [
      "Drag your paddle anywhere in your half of the table — you can't cross the center line.",
      "Knock the puck into your opponent's goal to score.",
      "First to seven goals wins.",
      "There's a short countdown before the puck drops after every goal.",
    ],
    tutorial: [
      "Drag or tap-and-hold on your half to move your paddle — it follows your finger or cursor directly.",
      "Get your paddle in front of the puck to redirect it toward the opponent's goal.",
    ],
  },
  "quick-draw": {
    rules: [
      "One player is the artist each round and gets a secret word to draw.",
      "Everyone else picks from four possible answers — pick the fastest correct guess for the most points.",
      "The artist scores points too, for every player who guesses correctly.",
      "Every player takes a turn as the artist once per match.",
    ],
    tutorial: [
      "As the artist: draw on the canvas with your mouse or finger — everyone sees your strokes live.",
      "As a guesser: tap an answer as soon as you know it. You only get one guess per round.",
    ],
  },
  "tile-rush": {
    rules: [
      "Everyone gets the same starting board.",
      "Tap a group of two or more same-colored tiles to clear them — bigger groups score more.",
      "Cleared tiles are replaced from the top; the board never runs out.",
      "Special tiles trigger power-ups when cleared: row clear, column clear, shuffle, a score multiplier, or freezing your own progress bar from opponents' view.",
      "Highest score when the two-minute timer runs out wins.",
    ],
    tutorial: [
      "Tap any tile that has a same-colored neighbor to clear that whole connected group.",
      "Watch for the power-up icons — clearing one of those tiles triggers its effect immediately.",
    ],
  },
};
