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
  "mini-golf": {
    rules: [
      "Three holes, played in order. Everyone putts their own ball, turns rotate player by player.",
      "Once your ball reaches the hole, you're done for that hole — everyone else keeps putting.",
      "Taking too many strokes on one hole forces you in automatically, so nobody gets stuck forever.",
      "Once everyone has holed out, the next hole begins. Lowest total strokes across all three holes wins.",
    ],
    tutorial: [
      "Drag back from your ball and release to putt — the further you drag, the more power.",
      "Obstacles bounce your ball rather than stopping it — use the angle to curve around them.",
    ],
  },
  "word-bites": {
    rules: [
      "Everyone shares one rack of letter \"bites\" — chunks of 1-3 letters, in a fixed left-to-right order.",
      "Combine a connected, in-order run of bites into a real word to claim those tiles and score points.",
      "Longer combos score disproportionately more.",
      "The match ends once the whole rack is claimed, or the timer runs out — highest score wins.",
    ],
    tutorial: [
      "Tap bites left to right to build a selection — you can only extend to a bite touching your current selection.",
      "Tap Submit once your selection spells a real word. A wrong guess doesn't cost you anything, so experiment.",
    ],
  },
  "sea-battle": {
    rules: [
      "Place your fleet of 5 ships in secret — a Carrier, Battleship, Cruiser, Submarine, and Destroyer.",
      "Once both fleets are placed, take turns firing at one cell on your opponent's board.",
      "A hit is reported immediately; sinking a whole ship is announced too.",
      "Sink every ship in the enemy fleet before they sink yours to win.",
    ],
    tutorial: [
      "Tap a cell to place the highlighted ship there — Rotate changes its orientation, Randomize places your whole fleet instantly.",
      "Once battling starts, tap a cell on \"Enemy waters\" to fire. You never see the opponent's unhit ships, only your own hits and misses.",
    ],
  },
  checkers: {
    rules: [
      "Pieces move one square diagonally, forward only, toward the opponent's side.",
      "Jump over an adjacent enemy piece into an empty square beyond it to capture — if any of your pieces can capture, you must make a capturing move.",
      "Landing consecutive jumps in one turn is allowed but not required — you can stop early if you'd rather.",
      "Reach the far row to crown a piece into a king, which can move and capture diagonally in any direction.",
      "Capture every enemy piece, or leave them with no legal move, to win.",
    ],
    tutorial: [
      "Tap one of your pieces to select it, then tap a highlighted square to move or jump there.",
      "If you land a jump and another jump is immediately available with the same piece, tap again to continue the chain, or tap \"Stop jumping here\" to end your turn early.",
    ],
  },
  chess: {
    rules: [
      "Standard chess rules: every piece moves and captures the normal way, including castling, en passant, and pawn promotion.",
      "You can't make a move that leaves your own king in check.",
      "Checkmate — no legal move gets your king out of check — ends the match immediately.",
      "A player with no legal move but not in check is stalemated, and the match is a draw.",
    ],
    tutorial: [
      "Tap one of your pieces to see every square it can legally move to, then tap a highlighted square to move there.",
      "Moving a pawn to the far row prompts you to choose what it promotes to.",
    ],
  },
  darts: {
    rules: [
      "Each turn is 3 throws at the board, then it's the next player's turn.",
      "Closer to the bullseye scores more — the rings pay out 50, 25, 15, 10, and 5 points from the center out.",
      "Missing the board entirely scores zero for that throw.",
      "Five rounds each — highest total score across all your throws wins.",
    ],
    tutorial: [
      "Drag the angle and power sliders, then tap Throw.",
      "The dashed line always shows exactly where your current aim will land — adjust until it's centered on a scoring ring.",
    ],
  },
  cornhole: {
    rules: [
      "Each turn is 4 bag tosses at the board, then it's the next player's turn.",
      "A bag that lands on the board scores 1 point; a bag that goes in the hole scores 3.",
      "A bag that misses the board entirely scores nothing.",
      "Four rounds each — highest total score across all your tosses wins.",
    ],
    tutorial: [
      "Drag the angle and power sliders, then tap Toss.",
      "The board is elevated and slanted, with the hole cut near the far end — overshoot slightly to drop a bag in rather than just landing short on the boards.",
    ],
  },
  reversi: {
    rules: [
      "Place a disc so it sandwiches one or more of your opponent's discs (in a straight line) between your new disc and another one of your own — every sandwiched disc flips to your color.",
      "You can only place where at least one flip would happen. If you have no legal move, your turn is skipped automatically.",
      "The match ends when the board fills up or neither player has a legal move.",
      "Whoever has the most discs on the board when it ends wins.",
    ],
    tutorial: [
      "Tap a highlighted square to place a disc there — every legal move is marked.",
      "Corners are the most valuable squares (they can never be flipped back) — the squares diagonally next to a corner are risky, since taking one often hands the opponent that corner.",
    ],
  },
  "dots-and-boxes": {
    rules: [
      "Tap a line to claim it. Whoever draws the fourth side of a box claims that box.",
      "Claiming a box earns you another turn immediately — chain several together and you can claim a run of boxes in one turn.",
      "The match ends once every line is claimed.",
      "Whoever owns the most boxes wins.",
    ],
    tutorial: [
      "Tap any unclaimed line between two dots to draw it.",
      "Careful — drawing the third side of a box (without completing it) hands your opponent a free box next turn.",
    ],
  },
  yahtzee: {
    rules: [
      "Each turn: roll all 5 dice, then choose which to hold and reroll the rest, up to 3 rolls total.",
      "After rolling, lock your dice into one of 13 scoring categories — each category can only be used once per player.",
      "Score 63+ across the six upper-section categories (Ones through Sixes) for a 35-point bonus.",
      "Once everyone has filled all 13 categories, highest total wins.",
    ],
    tutorial: [
      "Tap a die to hold it (it won't reroll), tap Roll to reroll everything else.",
      "Tap a number in the scorecard to lock your current dice into that category — you must roll at least once before you can score.",
    ],
  },
  mancala: {
    rules: [
      "Pick one of your own pits — every seed in it gets sown one-by-one into each following pit (including your own store, but skipping your opponent's store).",
      "Land your last seed in your own store and you go again.",
      "Land your last seed in an empty pit on your own side and you capture it plus everything in the pit directly opposite.",
      "Once either side's pits are all empty, the round ends — whoever has more seeds in their store wins.",
    ],
    tutorial: ["Tap one of your own pits (the bottom row) to sow it — empty pits and your opponent's pits aren't tappable."],
  },
  "trivia-blitz": {
    rules: [
      "Everyone sees the same question and answers independently — there's no turn order.",
      "A correct answer scores 10 points; a wrong answer scores 0. Speed doesn't matter, only being right.",
      "The next question appears once everyone has answered.",
      "After 8 questions, highest total score wins.",
    ],
    tutorial: ["Tap one of the four options to lock in your answer — once you answer, you can't change it for that question."],
  },
};
