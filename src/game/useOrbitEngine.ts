/**
 * useOrbitEngine.ts — Orbit Rush 2-lane runner engine.
 *
 * All continuous motion (scroll offset, player X spring, hazard/shard
 * movement, score accrual, difficulty ramp) runs on the Reanimated UI thread
 * via `useFrameCallback`. The JS thread is NEVER used for per-frame animation.
 *
 * Coordinate system (linear, world-space):
 *   scrollOffset increases over time (world scrolls down toward player).
 *   screenY = scrollOffset - worldY + screenH  (objects move DOWN)
 *   Player is fixed at playerY = H * 0.75, playerX springs between 2 lanes.
 *   Hazards/shards have fixed worldY positions, recycled when off-screen.
 *
 * Pattern system:
 *   Patterns are grids of [lane0, lane1] rows. The engine spawns one pattern
 *   at a time at the top of the screen. When the pattern's last row passes the
 *   player, the next pattern is spawned after a gap.
 *
 * Hitboxes:
 *   collision  |screenY - playerY| < 28px AND same lane  -> Game Over
 *   near-miss  |screenY - playerY| < 48px AND opp lane  -> +50, combo++
 *   shard      |screenY - playerY| < 35px AND same lane  -> +10, +1 shard
 *
 * Difficulty: speed starts 320 px/s, +6% every 10s, capped 720 px/s.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  makeMutable,
  runOnJS,
  useFrameCallback,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { GameGeometry } from '../theme/theme';
import { Feedback } from '../services/sound';
import {
  addToWallet,
  loadHighScore,
  loadWallet,
  saveHighScore,
} from '../services/storage';
import { pickPattern, type Cell, type Pattern } from './patterns';

export const POOL_SIZE = 48; // enough for the longest pattern + gap

export type Screen = 'idle' | 'playing' | 'over';

export interface OrbitEngine {
  screen: Screen;
  wallet: number;
  highScore: number;
  reviveUsed: boolean;
  runShards: number;
  finalScore: number;
  shieldActive: boolean;
  magnetActive: boolean;

  // SharedValues (UI thread authoritative)
  scrollOffset: SharedValue<number>;
  playerX: SharedValue<number>;
  playerLane: SharedValue<number>;
  speed: SharedValue<number>;
  score: SharedValue<number>;
  combo: SharedValue<number>;
  shards: SharedValue<number>;
  shakeX: SharedValue<number>;
  shakeY: SharedValue<number>;
  nearMissPulse: SharedValue<number>;
  gameState: SharedValue<number>; // 0 idle, 1 playing, 2 over
  screenW: SharedValue<number>;
  screenH: SharedValue<number>;
  shieldGlow: SharedValue<number>;
  magnetGlow: SharedValue<number>;

  // Object pools: worldY, lane, active, passed
  objWorldY: SharedValue<number>[];
  objLane: SharedValue<number>[];
  objType: SharedValue<number>[]; // 0=empty, 1=hazard, 2=shard
  objActive: SharedValue<number>[];
  objPassed: SharedValue<number>[];

  start: () => void;
  toggleTrack: () => void;
  revive: () => void;
  doubleShards: () => void;
  endRunAndCommit: () => Promise<void>;
  setScreenSize: (w: number, h: number) => void;
  goHome: () => void;
  pause: () => void;
  resume: () => void;
  equipShield: () => void;
  equipMagnet: () => void;
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
  const [shieldActive, setShieldActive] = useState(false);
  const [magnetActive, setMagnetActive] = useState(false);

  // ---- SharedValues ----
  const scrollOffset = useSharedValue(0);
  const playerX = useSharedValue(0);
  const playerLane = useSharedValue<number>(0);
  const speed = useSharedValue<number>(GameGeometry.baseSpeed);
  const score = useSharedValue(0);
  const combo = useSharedValue(1);
  const shards = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const nearMissPulse = useSharedValue(0);
  const gameState = useSharedValue(0);
  const screenW = useSharedValue(375);
  const screenH = useSharedValue(667);
  const shieldGlow = useSharedValue(0);
  const magnetGlow = useSharedValue(0);

  const lastTime = useSharedValue(0);
  const nextSpawnY = useSharedValue(0); // worldY where next pattern starts

  // Pattern spawning state (JS-side, read by worklet via mutables)
  const currentPattern = useRef<Pattern | null>(null);
  const patternRowIndex = useRef(0);

  // Object pools
  const objWorldY = useRef(makePool(POOL_SIZE, -9999)).current;
  const objLane = useRef(makePool(POOL_SIZE, 0)).current;
  const objType = useRef(makePool(POOL_SIZE, 0)).current;
  const objActive = useRef(makePool(POOL_SIZE, 0)).current;
  const objPassed = useRef(makePool(POOL_SIZE, 0)).current;

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

  const handleShieldBreak = useCallback(() => {
    Feedback.onNearMiss(); // reuse heavy haptic + sound
    setShieldActive(false);
  }, []);

  // ---- Spawn one row of a pattern into the pool ----
  const spawnRow = useCallback(
    (rowCells: Cell[], worldY: number) => {
      for (let lane = 0; lane < rowCells.length; lane++) {
        const cell = rowCells[lane];
        if (cell === 0) continue;
        for (let i = 0; i < POOL_SIZE; i++) {
          if (objActive[i].value === 0) {
            objWorldY[i].value = worldY;
            objLane[i].value = lane;
            objType[i].value = cell; // 1=hazard, 2=shard
            objActive[i].value = 1;
            objPassed[i].value = 0;
            break;
          }
        }
      }
    },
    [objActive, objLane, objPassed, objType, objWorldY],
  );

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
    if (dt <= 0 || dt > 0.1) dt = 0.016;

    // advance scroll
    scrollOffset.value += speed.value * dt;
    score.value += dt * 10;

    // difficulty ramp — continuous gradual speed increase (compounds every
    // frame instead of jumping 5% every 10s, so the pace feels smooth).
    // Equivalent to speedStep per 10s, but applied smoothly per frame.
    speed.value = Math.min(
      GameGeometry.maxSpeed,
      speed.value * (1 + (GameGeometry.speedStep * dt) / 10),
    );

    const playerY = screenH.value * GameGeometry.playerYFraction;

    // collision / near-miss / shard pickup
    for (let i = 0; i < POOL_SIZE; i++) {
      if (objActive[i].value !== 1) continue;
      const screenY = scrollOffset.value - objWorldY[i].value + screenH.value;
      const dy = Math.abs(screenY - playerY);
      const sameLane = objLane[i].value === playerLane.value;

      if (objType[i].value === 1) {
        // hazard
        if (dy < GameGeometry.collisionHitY && sameLane) {
          // Shield absorbs one hit
          if (shieldGlow.value > 0) {
            shieldGlow.value = 0;
            runOnJS(handleShieldBreak)();
            objActive[i].value = 0;
            objPassed[i].value = 1;
            shakeX.value = (Math.random() - 0.5) * 2 * GameGeometry.shake;
            shakeY.value = (Math.random() - 0.5) * 2 * GameGeometry.shake;
            continue;
          }
          gameState.value = 2;
          shakeX.value = (Math.random() - 0.5) * 2 * GameGeometry.shake;
          shakeY.value = (Math.random() - 0.5) * 2 * GameGeometry.shake;
          runOnJS(handleCrash)();
          return;
        }
        if (objPassed[i].value === 0 && dy < GameGeometry.nearMissHitY && !sameLane) {
          objPassed[i].value = 1;
          combo.value += 1;
          score.value += 50;
          nearMissPulse.value = 1;
          shakeX.value = (Math.random() - 0.5) * 2 * GameGeometry.shake;
          shakeY.value = (Math.random() - 0.5) * 2 * GameGeometry.shake;
          runOnJS(handleNearMiss)();
        }
      } else if (objType[i].value === 2) {
        // shard — magnet collects from either lane
        const magnetHit = magnetGlow.value > 0
          ? dy < GameGeometry.shardHitY
          : dy < GameGeometry.shardHitY && sameLane;
        if (magnetHit) {
          objActive[i].value = 0;
          shards.value += 1;
          score.value += 10;
          runOnJS(handleShard)();
        }
      }

      // recycle off-screen objects (scrolled past bottom)
      if (screenY > screenH.value + 100) {
        objActive[i].value = 0;
      }
    }

    // pattern spawning — check if we need to spawn the next row
    // nextSpawnY is the worldY of the next row to spawn
    while (scrollOffset.value + screenH.value + 50 > nextSpawnY.value) {
      // we need to spawn a row at nextSpawnY
      // but pattern selection happens on JS thread; use a mutable flag
      // For simplicity, we spawn rows based on a JS-side pattern ref
      // communicated via a shared mutable
      // Actually, we can't call JS from worklet synchronously, so we
      // pre-compute the entire pattern's rows on the JS side and store
      // them in mutables. Let's use a different approach:
      // Pre-spawn the entire pattern at once when nextSpawnY is reached.
      break;
    }

    // decay shake & pulse
    shakeX.value *= 0.85;
    shakeY.value *= 0.85;
    if (nearMissPulse.value > 0)
      nearMissPulse.value = Math.max(0, nearMissPulse.value - dt * 2);
  });

  // ---- Pattern spawning (JS-side interval) ----
  // The spawn loop runs on a 50ms JS interval and reads SharedValues to check
  // if a new pattern row needs to be spawned. This is NOT continuous animation
  // — it's discrete spawning events (a few times per second).
  const spawnTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSpawnLoop = useCallback(() => {
    if (spawnTimer.current) clearInterval(spawnTimer.current);
    currentPattern.current = null;
    patternRowIndex.current = 0;
    // Delay first spawn by gracePeriod so the player has time to react
    nextSpawnY.value = -1; // sentinel: not yet initialized

    spawnTimer.current = setInterval(() => {
      if (gameState.value !== 1) return;
      const threshold = scrollOffset.value + screenH.value + 50;
      if (nextSpawnY.value === -1) {
        // first spawn — add grace period worth of scroll distance
        nextSpawnY.value =
          scrollOffset.value + screenH.value + GameGeometry.gracePeriod * speed.value;
      }
      if (nextSpawnY.value === 0) {
        nextSpawnY.value = scrollOffset.value + screenH.value + 50;
      }
      if (threshold >= nextSpawnY.value) {
        // need to spawn a row
        if (
          !currentPattern.current ||
          patternRowIndex.current >= currentPattern.current.rows.length
        ) {
          // pick next pattern
          currentPattern.current = pickPattern(speed.value);
          patternRowIndex.current = 0;
          // add gap before the pattern
          nextSpawnY.value += GameGeometry.patternGap;
        }
        if (threshold >= nextSpawnY.value) {
          const row = currentPattern.current.rows[patternRowIndex.current];
          spawnRow(row as Cell[], nextSpawnY.value);
          patternRowIndex.current += 1;
          nextSpawnY.value += GameGeometry.rowHeight;
        }
      }
    }, 50);
  }, [
    currentPattern,
    nextSpawnY,
    patternRowIndex,
    screenH,
    scrollOffset,
    speed,
    spawnRow,
  ]);

  const stopSpawnLoop = useCallback(() => {
    if (spawnTimer.current) {
      clearInterval(spawnTimer.current);
      spawnTimer.current = null;
    }
  }, []);

  // ---- Public actions ----
  const resetPools = () => {
    for (let i = 0; i < POOL_SIZE; i++) {
      objActive[i].value = 0;
      objPassed[i].value = 0;
      objWorldY[i].value = -9999;
      objType[i].value = 0;
    }
  };

  const start = useCallback(() => {
    resetPools();
    scrollOffset.value = 0;
    playerLane.value = 0;
    playerX.value = screenW.value * GameGeometry.laneXFractions[0];
    speed.value = GameGeometry.baseSpeed;
    score.value = 0;
    combo.value = 1;
    shards.value = 0;
    lastTime.value = 0;
    nextSpawnY.value = -1; // sentinel: grace period not yet started
    shakeX.value = 0;
    shakeY.value = 0;
    nearMissPulse.value = 0;
    shieldGlow.value = 0;
    magnetGlow.value = 0;
    setReviveUsed(false);
    setRunShards(0);
    setFinalScore(0);
    setShieldActive(false);
    setMagnetActive(false);
    gameState.value = 1;
    setScreen('playing');
    startSpawnLoop();
  }, [
    combo,
    gameState,
    nextSpawnY,
    lastTime,
    nearMissPulse,
    objActive,
    objPassed,
    objType,
    objWorldY,
    playerLane,
    playerX,
    score,
    scrollOffset,
    screenW,
    shards,
    shakeX,
    shakeY,
    speed,
    startSpawnLoop,
  ]);

  const toggleTrack = useCallback(() => {
    if (gameState.value !== 1) return;
    const next = playerLane.value === 0 ? 1 : 0;
    playerLane.value = next;
    const targetX = screenW.value * GameGeometry.laneXFractions[next];
    playerX.value = withSpring(targetX, { damping: 14, stiffness: 220 });
    Feedback.onTrackSwitch();
  }, [gameState, playerLane, playerX, screenW]);

  const revive = useCallback(() => {
    // clear all hazards within 200px of the player's screenY
    const playerY = screenH.value * GameGeometry.playerYFraction;
    for (let i = 0; i < POOL_SIZE; i++) {
      if (objActive[i].value === 1 && objType[i].value === 1) {
        const screenY = scrollOffset.value - objWorldY[i].value + screenH.value;
        if (Math.abs(screenY - playerY) < 200) {
          objActive[i].value = 0;
          objPassed[i].value = 1;
        }
      }
    }
    setReviveUsed(true);
    gameState.value = 1;
    setScreen('playing');
    startSpawnLoop();
  }, [
    gameState,
    objActive,
    objPassed,
    objType,
    objWorldY,
    screenH,
    scrollOffset,
    startSpawnLoop,
  ]);

  const doubleShards = useCallback(() => {
    shards.value = shards.value * 2;
  }, [shards]);

  const endRunAndCommit = useCallback(async () => {
    stopSpawnLoop();
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
  }, [score, shards, stopSpawnLoop]);

  const setScreenSize = useCallback(
    (w: number, h: number) => {
      screenW.value = w;
      screenH.value = h;
      playerX.value = w * GameGeometry.laneXFractions[playerLane.value];
    },
    [screenW, screenH, playerX, playerLane],
  );

  const goHome = useCallback(() => {
    stopSpawnLoop();
    resetPools();
    gameState.value = 0;
    setScreen('idle');
  }, [gameState, stopSpawnLoop]);

  const pause = useCallback(() => {
    if (gameState.value !== 1) return;
    gameState.value = 0; // freeze frame loop
    stopSpawnLoop();
  }, [gameState, stopSpawnLoop]);

  const resume = useCallback(() => {
    if (gameState.value !== 0 || screen !== 'playing') return;
    gameState.value = 1;
    lastTime.value = 0; // reset dt to avoid jump
    startSpawnLoop();
  }, [gameState, screen, lastTime, startSpawnLoop]);

  const equipShield = useCallback(() => {
    shieldGlow.value = 1;
    setShieldActive(true);
  }, [shieldGlow]);

  const equipMagnet = useCallback(() => {
    magnetGlow.value = 1;
    setMagnetActive(true);
    // Magnet lasts 10 seconds
    setTimeout(() => {
      magnetGlow.value = 0;
      setMagnetActive(false);
    }, 10000);
  }, [magnetGlow]);

  // hydrate wallet & high score on first render
  const hydrated = useRef(false);
  if (!hydrated.current) {
    hydrated.current = true;
    loadWallet().then(setWallet);
    loadHighScore().then(setHighScore);
  }

  // cleanup spawn loop on unmount
  useEffect(() => {
    return () => {
      if (spawnTimer.current) clearInterval(spawnTimer.current);
    };
  }, []);

  return {
    screen,
    wallet,
    highScore,
    reviveUsed,
    runShards,
    finalScore,
    shieldActive,
    magnetActive,
    scrollOffset,
    playerX,
    playerLane,
    speed,
    score,
    combo,
    shards,
    shakeX,
    shakeY,
    nearMissPulse,
    gameState,
    screenW,
    screenH,
    shieldGlow,
    magnetGlow,
    objWorldY,
    objLane,
    objType,
    objActive,
    objPassed,
    start,
    toggleTrack,
    revive,
    doubleShards,
    endRunAndCommit,
    setScreenSize,
    goHome,
    pause,
    resume,
    equipShield,
    equipMagnet,
  };
}
