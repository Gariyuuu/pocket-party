import type { GameEngine } from "@/games/core/game-engine";
import type { ActionValidationResult } from "@/games/core/action";
import { createSeededRng } from "@/games/core/rng";
import { simulateProjectile, velocityFromAimPower, windForShot } from "@/games/core/physics";
import { applyCrater, generateTerrain, terrainHeightAt, TERRAIN_WIDTH } from "./terrain";
import { PROJECTILE_CONFIG } from "./projectiles";
import { pickTankTacticsAction } from "./bot";
import { DT, GRAVITY, MAX_SHOT_SPEED, MAX_STEPS, MAX_WIND, TANK_MARGIN, TANK_START_HEALTH, TURN_DURATION_MS } from "./constants";
import type { ImpactRecord, Tank, TankTacticsAction, TankTacticsState } from "./types";

function nextAliveIndex(tanks: Tank[], fromIndex: number): number {
  for (let step = 1; step <= tanks.length; step++) {
    const index = (fromIndex + step) % tanks.length;
    if (tanks[index].alive) return index;
  }
  return fromIndex;
}

export function shotSeed(seed: string, turnCount: number): string {
  return `${seed}:tank-shot:${turnCount}`;
}

export const tankTacticsEngine: GameEngine<TankTacticsState, TankTacticsAction> = {
  gameId: "tank-tactics",

  createInitialState({ seed, players, now }) {
    const ordered = [...players].sort((a, b) => a.seat - b.seat);
    const terrainHeights = generateTerrain(seed);
    const usableWidth = TERRAIN_WIDTH - TANK_MARGIN * 2;
    const tanks: Tank[] = ordered.map((p, i) => ({
      playerId: p.playerId,
      x: ordered.length === 1 ? TERRAIN_WIDTH / 2 : TANK_MARGIN + (usableWidth * i) / (ordered.length - 1),
      health: TANK_START_HEALTH,
      alive: true,
    }));

    return {
      players: ordered,
      seed,
      terrainHeights,
      tanks,
      currentTurnPlayerId: ordered[0].playerId,
      turnEndsAt: now + TURN_DURATION_MS,
      turnDurationMs: TURN_DURATION_MS,
      turnCount: 0,
      smokeClouds: [],
      lastShot: null,
      winnerPlayerId: null,
      isDraw: false,
    };
  },

  applyAction(state, action, fromPlayerId): ActionValidationResult<TankTacticsState> {
    if (state.winnerPlayerId || state.isDraw) {
      return { ok: false, reason: "match_not_active", message: "This match already ended." };
    }

    const currentIndex = state.tanks.findIndex((t) => t.playerId === state.currentTurnPlayerId);

    if (action.type === "skip-turn") {
      const nextIndex = nextAliveIndex(state.tanks, currentIndex);
      return {
        ok: true,
        nextState: {
          ...state,
          turnCount: state.turnCount + 1,
          currentTurnPlayerId: state.tanks[nextIndex].playerId,
          turnEndsAt: action.now + state.turnDurationMs,
          smokeClouds: state.smokeClouds
            .map((c) => ({ ...c, turnsRemaining: c.turnsRemaining - 1 }))
            .filter((c) => c.turnsRemaining > 0),
        },
      };
    }

    if (action.type !== "fire") {
      return { ok: false, reason: "malformed_payload", message: "Unknown action type." };
    }
    if (fromPlayerId !== state.currentTurnPlayerId) {
      return { ok: false, reason: "wrong_turn", message: "It's not your turn." };
    }
    if (
      !Number.isFinite(action.angle) ||
      !Number.isFinite(action.power) ||
      action.angle < 0 ||
      action.angle > 180 ||
      action.power < 1 ||
      action.power > 100 ||
      !PROJECTILE_CONFIG[action.projectileType]
    ) {
      return { ok: false, reason: "invalid_move", message: "That shot is out of range." };
    }

    const config = PROJECTILE_CONFIG[action.projectileType];
    const shooter = state.tanks.find((t) => t.playerId === fromPlayerId)!;
    const rng = createSeededRng(shotSeed(state.seed, state.turnCount));
    const wind = windForShot(rng, MAX_WIND);
    const velocity = velocityFromAimPower(action.angle, action.power, MAX_SHOT_SPEED * config.powerMultiplier);
    const startY = terrainHeightAt(state.terrainHeights, shooter.x);

    const result = simulateProjectile({
      start: { x: shooter.x, y: startY - 10 },
      velocity,
      gravity: GRAVITY,
      wind,
      dt: DT,
      maxSteps: MAX_STEPS,
      groundHeightAt: (x) => terrainHeightAt(state.terrainHeights, x),
      restitution: config.restitution,
      maxBounces: config.maxBounces,
    });

    let terrainHeights = state.terrainHeights;
    let tanks = state.tanks;
    const impacts: ImpactRecord[] = [];

    for (const fragment of config.fragments) {
      const impactX = Math.max(0, Math.min(TERRAIN_WIDTH, result.finalPosition.x + fragment.offsetX));
      const impactY = terrainHeightAt(terrainHeights, impactX);
      const damageDealt: Record<string, number> = {};

      tanks = tanks.map((tank) => {
        if (!tank.alive) return tank;
        const dist = Math.abs(tank.x - impactX);
        if (dist > fragment.radius) return tank;
        const damage = Math.round(fragment.damage * (1 - dist / fragment.radius));
        damageDealt[tank.playerId] = damage;
        const health = Math.max(0, tank.health - damage);
        return { ...tank, health, alive: health > 0 };
      });

      terrainHeights = applyCrater(terrainHeights, impactX);
      impacts.push({ x: impactX, y: impactY, radius: fragment.radius, damageDealt });
    }

    const smokeClouds = config.smoke
      ? [
          ...state.smokeClouds,
          { x: result.finalPosition.x, radius: config.smoke.radius, turnsRemaining: config.smoke.turns },
        ]
      : state.smokeClouds;

    const aliveTanks = tanks.filter((t) => t.alive);
    let winnerPlayerId: string | null = null;
    let isDraw = false;
    if (aliveTanks.length === 1) winnerPlayerId = aliveTanks[0].playerId;
    else if (aliveTanks.length === 0) isDraw = true;

    const nextIndex = winnerPlayerId || isDraw ? currentIndex : nextAliveIndex(tanks, currentIndex);

    return {
      ok: true,
      nextState: {
        ...state,
        terrainHeights,
        tanks,
        turnCount: state.turnCount + 1,
        smokeClouds,
        lastShot: {
          playerId: fromPlayerId,
          angle: action.angle,
          power: action.power,
          wind,
          projectileType: action.projectileType,
          path: result.path,
          impacts,
        },
        winnerPlayerId,
        isDraw,
        currentTurnPlayerId: tanks[nextIndex].playerId,
        turnEndsAt: action.now + state.turnDurationMs,
      },
    };
  },

  checkOutcome(state) {
    if (state.winnerPlayerId) return { status: "win", winnerPlayerId: state.winnerPlayerId };
    if (state.isDraw) return { status: "draw" };
    return { status: "active" };
  },

  getBotAction(state, botPlayerId, difficulty) {
    return pickTankTacticsAction(state, botPlayerId, difficulty);
  },
};
