/**
 * useOrbitEngine.ts — Orbit Rush game engine.
 *
 * All continuous motion (player angle, radius spring, hazard spawning, score
 * accrual, difficulty ramp) runs on the Reanimated UI thread via
 * `useFrameCallback`. The JS thread is NEVER used for per-frame animation —
 * no setInterval, no React state updates for motion. JS is only touched on
 * discrete events (crash / near-miss / shard) through `runOnJS`.
 *
 * Coordinate system (polar, radians):
 *   centerX = W/2, centerY = H/2
 *   x = centerX + r * cos(theta)
 *   y = centerY + r * sin(theta)
 *   R      = 115 (base)
 *   R_in   = R - 26 = 89
 *   R_out  = R + 26 = 141
 *
 * Hitboxes:
 *   collision  |dθ| < 8°  AND same track   -> Game Over
 *   near-miss  |dθ| < 14° AND opposite track -> +50, combo++, purple pulse
 *
 * Difficulty: ω starts 2.4 rad/s, +5% every 10s, capped 4.5 rad/s.
 */
import { useCallback, useRef, useState } from 'react';
import {
  makeMutable,
  runOnJS,
  useFrameCallback,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { GameGeometry, type Track } from '../theme/theme';
import { Feedback } from '../services/sound';
import {
  addToWallet,
  loadHighScore,
  loadWallet,
  saveHighScore,
} from '../services/storage';

export const POOL_SIZE = 24;
const LEAD_ANGLE = 1.4; // rad ahead of player where hazards spawn
const PICKUP_HIT = (10 * Math.PI) / 180; // shard pickup angular tolerance

export type Screen = 'idle' | 'playing' | 'over';

export interface OrbitEngine {
  screen: Screen;
  wallet: number;
  highScore: number;
  reviveUsed: boolean;
  runShards: number;
  finalScore: number;

  // SharedValues (UI thread authoritative)
  theta: SharedValue<number>;
  radius: SharedValue<number>;
  omega: SharedValue<number>;
  score: SharedValue<number>;
  combo: SharedValue<number>;
  shards: SharedValue<number>;
  shakeX: SharedValue<number>;
  shakeY: SharedValue<number>;
  nearMissPulse: SharedValue<number>;
  gameState: SharedValue<number>; // 0 idle, 1 playing, 2 over
  center: SharedValue<{ x: number; y: number }>;

  hazardAngle: SharedValue<number>[];
  hazardTrack: SharedValue<number>[]; // 0 inside, 1 outside
  hazardActive: SharedValue<number>[];
  hazardPassed: SharedValue<number>[];

  shardAngle: SharedValue<number>[];
  shardTrack: SharedValue<number>[];
  shardActive: SharedValue<number>[];

  start: () => void;
  toggleTrack: () => void;
  revive: () => void;
  doubleShards: () => void;
  endRunAndCommit: () => Promise<void>;
  setCenter: (x: number, y: number) => void;
}

function angleDiff(a: number, b: number): number {
  'worklet';
  let d = a - b;
  d = ((d + Math.PI) % (2 * Math.PI)) - Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
}

function makePool(size: number, initial: number): SharedValue<number>[] {
  return Array.from({ length: size }, () => makeMutable(initial));
}

export function useOrbitEngine(): OrbitEngine {
  const [screen, setScreen] = useState<Screen>('idle');
  const [wallet, setWallet] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [reviveUsed, setReviveUsed] = useState(false);
  const [runShards, setRunShards] = useState(0);
  const [finalScore, setFinalScore] = useState(0);

  // ---- SharedValues ----
  const theta = useSharedValue(0);
  const radius = useSharedValue(GameGeometry.insideRadius);
  const omega = useSharedValue<number>(GameGeometry.baseOmega);
  const score = useSharedValue(0);
  const combo = useSharedValue(1);
  const shards = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const nearMissPulse = useSharedValue(0);
  const gameState = useSharedValue(0);
  const center = useSharedValue({ x: 0, y: 0 });

  const playerTrack = useSharedValue<Track>('inside'); // 'inside' | 'outside'
  const survivalTime = useSharedValue(0);
  const spawnTimer = useSharedValue(0);
  const lastTime = useSharedValue(0);

  // pools (created once)
  const hazardAngle = useRef(makePool(POOL_SIZE, -999)).current;
  const hazardTrack = useRef(makePool(POOL_SIZE, 0)).current;
  const hazardActive = useRef(makePool(POOL_SIZE, 0)).current;
  const hazardPassed = useRef(makePool(POOL_SIZE, 0)).current;

  const shardAngle = useRef(makePool(POOL_SIZE, -999)).current;
  const shardTrack = useRef(makePool(POOL_SIZE, 0)).current;
  const shardActive = useRef(makePool(POOL_SIZE, 0)).current;

  // ---- JS-side event handlers (invoked via runOnJS) ----
  const handleCrash = useCallback(() => {
    Feedback.onCrash();
    setScreen('over');
  }, []);

  const handleNearMiss = useCallback(() => {
    Feedback.onNearMiss();
  }, []);

  const handleShard = useCallback(() => {
    Feedback.onShard();
  }, []);

  // ---- Main frame loop (UI thread worklet) ----
  useFrameCallback((info) => {
    'worklet';
    if (gameState.value !== 1) {
      lastTime.value = info.timeSinceFirstFrame;
      return;
    }
    const now = info.timeSinceFirstFrame;
    let dt = (now - lastTime.value) / 1000;
    lastTime.value = now;
    if (dt <= 0 || dt > 0.1) dt = 0.016; // clamp pauses / first frame

    // advance player
    theta.value += omega.value * dt;
    if (theta.value > Math.PI * 2) theta.value -= Math.PI * 2;

    // survival score
    score.value += dt * 10;

    // difficulty ramp (every 10s)
    survivalTime.value += dt;
    if (survivalTime.value >= 10) {
      survivalTime.value -= 10;
      const next = omega.value * (1 + GameGeometry.omegaStep);
      omega.value = Math.min(GameGeometry.maxOmega, next);
    }

    // spawning
    spawnTimer.value += dt;
    const spawnInterval = Math.max(0.45, 0.9 - (omega.value - GameGeometry.baseOmega) * 0.12);
    if (spawnTimer.value >= spawnInterval) {
      spawnTimer.value = 0;
      const spawnAngle = theta.value + LEAD_ANGLE;
      const track: number = Math.random() < 0.5 ? 0 : 1;
      for (let i = 0; i < POOL_SIZE; i++) {
        if (hazardActive[i].value === 0) {
          hazardAngle[i].value = spawnAngle;
          hazardTrack[i].value = track;
          hazardActive[i].value = 1;
          hazardPassed[i].value = 0;
          break;
        }
      }
      // 50% chance to also drop a shard on the opposite track
      if (Math.random() < 0.5) {
        const sTrack = track === 0 ? 1 : 0;
        for (let i = 0; i < POOL_SIZE; i++) {
          if (shardActive[i].value === 0) {
            shardAngle[i].value = spawnAngle + (Math.random() - 0.5) * 0.3;
            shardTrack[i].value = sTrack;
            shardActive[i].value = 1;
            break;
          }
        }
      }
    }

    const pTrack = playerTrack.value === 'inside' ? 0 : 1;

    // hazard collision / near-miss
    for (let i = 0; i < POOL_SIZE; i++) {
      if (hazardActive[i].value !== 1) continue;
      const d = angleDiff(theta.value, hazardAngle[i].value);
      const sameTrack = hazardTrack[i].value === pTrack;
      if (d < GameGeometry.collisionHit && sameTrack) {
        gameState.value = 2;
        shakeX.value = (Math.random() - 0.5) * 2 * GameGeometry.shake;
        shakeY.value = (Math.random() - 0.5) * 2 * GameGeometry.shake;
        runOnJS(handleCrash)();
        return;
      }
      if (hazardPassed[i].value === 0 && d < GameGeometry.nearMissHit && !sameTrack) {
        hazardPassed[i].value = 1;
        combo.value += 1;
        score.value += 50;
        nearMissPulse.value = 1;
        shakeX.value = (Math.random() - 0.5) * 2 * GameGeometry.shake;
        shakeY.value = (Math.random() - 0.5) * 2 * GameGeometry.shake;
        runOnJS(handleNearMiss)();
      }
    }

    // shard pickup
    for (let i = 0; i < POOL_SIZE; i++) {
      if (shardActive[i].value !== 1) continue;
      const d = angleDiff(theta.value, shardAngle[i].value);
      const sameTrack = shardTrack[i].value === pTrack;
      if (d < PICKUP_HIT && sameTrack) {
        shardActive[i].value = 0;
        shards.value += 1;
        score.value += 10;
        runOnJS(handleShard)();
      }
    }

    // decay shake & pulse
    shakeX.value *= 0.85;
    shakeY.value *= 0.85;
    if (nearMissPulse.value > 0) nearMissPulse.value = Math.max(0, nearMissPulse.value - dt * 2);
  });

  // ---- Public actions ----
  const resetPools = () => {
    for (let i = 0; i < POOL_SIZE; i++) {
      hazardActive[i].value = 0;
      hazardPassed[i].value = 0;
      hazardAngle[i].value = -999;
      shardActive[i].value = 0;
      shardAngle[i].value = -999;
    }
  };

  const start = useCallback(() => {
    resetPools();
    theta.value = 0;
    radius.value = GameGeometry.insideRadius;
    playerTrack.value = 'inside';
    omega.value = GameGeometry.baseOmega;
    score.value = 0;
    combo.value = 1;
    shards.value = 0;
    survivalTime.value = 0;
    spawnTimer.value = 0;
    lastTime.value = 0;
    shakeX.value = 0;
    shakeY.value = 0;
    nearMissPulse.value = 0;
    setReviveUsed(false);
    setRunShards(0);
    setFinalScore(0);
    gameState.value = 1;
    setScreen('playing');
  }, [
    combo,
    gameState,
    hazardActive,
    hazardAngle,
    hazardPassed,
    lastTime,
    nearMissPulse,
    omega,
    playerTrack,
    radius,
    score,
    shardActive,
    shardAngle,
    shakeX,
    shakeY,
    shards,
    spawnTimer,
    survivalTime,
    theta,
  ]);

  const toggleTrack = useCallback(() => {
    if (gameState.value !== 1) return;
    const next: Track = playerTrack.value === 'inside' ? 'outside' : 'inside';
    playerTrack.value = next;
    const target = next === 'inside' ? GameGeometry.insideRadius : GameGeometry.outsideRadius;
    radius.value = withSpring(target, { damping: 14, stiffness: 220 });
    Feedback.onTrackSwitch();
  }, [gameState, playerTrack, radius]);

  const revive = useCallback(() => {
    // clear all hazards within 180° of the player
    for (let i = 0; i < POOL_SIZE; i++) {
      if (hazardActive[i].value === 1) {
        const d = Math.abs(((theta.value - hazardAngle[i].value + Math.PI) % (2 * Math.PI)) - Math.PI);
        if (d < Math.PI) {
          hazardActive[i].value = 0;
          hazardPassed[i].value = 1;
        }
      }
    }
    setReviveUsed(true);
    gameState.value = 1;
    setScreen('playing');
  }, [gameState, hazardActive, hazardPassed, theta]);

  const doubleShards = useCallback(() => {
    shards.value = shards.value * 2;
  }, [shards]);

  const endRunAndCommit = useCallback(async () => {
    const runShardsVal = Math.floor(shards.value);
    const runScore = Math.floor(score.value);
    setRunShards(runShardsVal);
    setFinalScore(runScore);
    const newWallet = await addToWallet(runShardsVal);
    setWallet(newWallet);
    const isHigh = await saveHighScore(runScore);
    if (isHigh) {
      const hs = await loadHighScore();
      setHighScore(hs);
    }
  }, [score, shards]);

  const setCenter = useCallback(
    (x: number, y: number) => {
      center.value = { x, y };
    },
    [center],
  );

  // hydrate wallet & high score on first render
  const hydrated = useRef(false);
  if (!hydrated.current) {
    hydrated.current = true;
    loadWallet().then(setWallet);
    loadHighScore().then(setHighScore);
  }

  return {
    screen,
    wallet,
    highScore,
    reviveUsed,
    runShards,
    finalScore,
    theta,
    radius,
    omega,
    score,
    combo,
    shards,
    shakeX,
    shakeY,
    nearMissPulse,
    gameState,
    center,
    hazardAngle,
    hazardTrack,
    hazardActive,
    hazardPassed,
    shardAngle,
    shardTrack,
    shardActive,
    start,
    toggleTrack,
    revive,
    doubleShards,
    endRunAndCommit,
    setCenter,
  };
}
