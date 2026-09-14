/**
 * storage.ts — thin async wrapper around AsyncStorage for all persistent
 * game data: shard wallet, high score, leaderboard, achievements, daily
 * challenge/streak, skins, power-ups, and settings.
 *
 * All calls are try/catch wrapped so a corrupted store never crashes the game.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_WALLET = 'orbit_rush.wallet';
const KEY_HIGH_SCORE = 'orbit_rush.high_score';
const KEY_LEADERBOARD = 'orbit_rush.leaderboard';
const KEY_ACHIEVEMENTS = 'orbit_rush.achievements';
const KEY_DAILY = 'orbit_rush.daily';
const KEY_SKINS = 'orbit_rush.skins';
const KEY_EQUIPPED_SKIN = 'orbit_rush.equipped_skin';
const KEY_POWERUPS = 'orbit_rush.powerups';
const KEY_SETTINGS = 'orbit_rush.settings';
const KEY_TOTAL_RUNS = 'orbit_rush.total_runs';
const KEY_TOTAL_SHARDS = 'orbit_rush.total_shards';

// ── Wallet ──────────────────────────────────────────────────────────────────

export async function loadWallet(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(KEY_WALLET);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function saveWallet(value: number): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_WALLET, String(Math.max(0, Math.floor(value))));
  } catch {
    /* ignore */
  }
}

export async function addToWallet(delta: number): Promise<number> {
  const current = await loadWallet();
  const next = Math.max(0, current + Math.floor(delta));
  await saveWallet(next);
  return next;
}

export async function spendFromWallet(amount: number): Promise<boolean> {
  const current = await loadWallet();
  if (current < amount) return false;
  await saveWallet(current - amount);
  return true;
}

// ── High Score ──────────────────────────────────────────────────────────────

export async function loadHighScore(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(KEY_HIGH_SCORE);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function saveHighScore(value: number): Promise<boolean> {
  try {
    const prev = await loadHighScore();
    if (value > prev) {
      await AsyncStorage.setItem(KEY_HIGH_SCORE, String(Math.floor(value)));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── Leaderboard (top 10) ────────────────────────────────────────────────────

export interface LeaderboardEntry {
  score: number;
  shards: number;
  date: number; // timestamp
}

export async function loadLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const v = await AsyncStorage.getItem(KEY_LEADERBOARD);
    return v ? (JSON.parse(v) as LeaderboardEntry[]) : [];
  } catch {
    return [];
  }
}

export async function addToLeaderboard(entry: LeaderboardEntry): Promise<LeaderboardEntry[]> {
  const board = await loadLeaderboard();
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  const top = board.slice(0, 10);
  try {
    await AsyncStorage.setItem(KEY_LEADERBOARD, JSON.stringify(top));
  } catch {
    /* ignore */
  }
  return top;
}

// ── Achievements ────────────────────────────────────────────────────────────

export interface AchievementState {
  unlocked: string[]; // achievement IDs
}

export async function loadAchievements(): Promise<AchievementState> {
  try {
    const v = await AsyncStorage.getItem(KEY_ACHIEVEMENTS);
    return v ? (JSON.parse(v) as AchievementState) : { unlocked: [] };
  } catch {
    return { unlocked: [] };
  }
}

export async function saveAchievements(state: AchievementState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_ACHIEVEMENTS, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

// ── Daily Challenge + Streak ────────────────────────────────────────────────

export interface DailyState {
  lastPlayDate: string; // YYYY-MM-DD
  streak: number;
  challengeScore: number;
  challengeShards: number;
  challengeTarget: number;
  challengeType: 'score' | 'shards';
  claimed: boolean;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export async function loadDailyState(): Promise<DailyState> {
  try {
    const v = await AsyncStorage.getItem(KEY_DAILY);
    if (!v) return freshDailyState();
    const state = JSON.parse(v) as DailyState;
    const today = todayStr();
    if (state.lastPlayDate !== today) {
      // New day — check streak continuity
      const gap = daysBetween(state.lastPlayDate, today);
      const newStreak = gap === 1 ? state.streak : 0;
      return {
        lastPlayDate: today,
        streak: newStreak,
        challengeScore: 0,
        challengeShards: 0,
        challengeTarget: pickDailyTarget(),
        challengeType: Math.random() > 0.5 ? 'score' : 'shards',
        claimed: false,
      };
    }
    return state;
  } catch {
    return freshDailyState();
  }
}

function freshDailyState(): DailyState {
  return {
    lastPlayDate: todayStr(),
    streak: 0,
    challengeScore: 0,
    challengeShards: 0,
    challengeTarget: pickDailyTarget(),
    challengeType: Math.random() > 0.5 ? 'score' : 'shards',
    claimed: false,
  };
}

function pickDailyTarget(): number {
  const targets = [200, 350, 500, 750, 1000];
  return targets[Math.floor(Math.random() * targets.length)];
}

export async function saveDailyState(state: DailyState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_DAILY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export async function recordDailyRun(score: number, shards: number): Promise<DailyState> {
  const state = await loadDailyState();
  state.challengeScore = Math.max(state.challengeScore, score);
  state.challengeShards += shards;
  // Increment streak on first run of the day
  if (state.lastPlayDate === todayStr() && state.streak === 0) {
    state.streak = 1;
  }
  await saveDailyState(state);
  return state;
}

// ── Skins ───────────────────────────────────────────────────────────────────

export async function loadUnlockedSkins(): Promise<string[]> {
  try {
    const v = await AsyncStorage.getItem(KEY_SKINS);
    return v ? (JSON.parse(v) as string[]) : ['cyan'];
  } catch {
    return ['cyan'];
  }
}

export async function unlockSkin(skinId: string): Promise<void> {
  const skins = await loadUnlockedSkins();
  if (!skins.includes(skinId)) {
    skins.push(skinId);
    try {
      await AsyncStorage.setItem(KEY_SKINS, JSON.stringify(skins));
    } catch {
      /* ignore */
    }
  }
}

export async function loadEquippedSkin(): Promise<string> {
  try {
    const v = await AsyncStorage.getItem(KEY_EQUIPPED_SKIN);
    return v || 'cyan';
  } catch {
    return 'cyan';
  }
}

export async function saveEquippedSkin(skinId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_EQUIPPED_SKIN, skinId);
  } catch {
    /* ignore */
  }
}

// ── Power-ups ────────────────────────────────────────────────────────────────

export interface PowerUpState {
  shields: number;
  magnets: number;
}

export async function loadPowerUps(): Promise<PowerUpState> {
  try {
    const v = await AsyncStorage.getItem(KEY_POWERUPS);
    return v ? (JSON.parse(v) as PowerUpState) : { shields: 0, magnets: 0 };
  } catch {
    return { shields: 0, magnets: 0 };
  }
}

export async function savePowerUps(state: PowerUpState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_POWERUPS, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

// ── Settings ─────────────────────────────────────────────────────────────────

export interface Settings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export async function loadSettings(): Promise<Settings> {
  try {
    const v = await AsyncStorage.getItem(KEY_SETTINGS);
    return v
      ? (JSON.parse(v) as Settings)
      : { soundEnabled: true, vibrationEnabled: true };
  } catch {
    return { soundEnabled: true, vibrationEnabled: true };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

// ── Lifetime Stats ──────────────────────────────────────────────────────────

export async function loadTotalRuns(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(KEY_TOTAL_RUNS);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function incrementTotalRuns(): Promise<number> {
  const current = await loadTotalRuns();
  const next = current + 1;
  try {
    await AsyncStorage.setItem(KEY_TOTAL_RUNS, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

export async function loadTotalShards(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(KEY_TOTAL_SHARDS);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function addTotalShards(amount: number): Promise<number> {
  const current = await loadTotalShards();
  const next = current + amount;
  try {
    await AsyncStorage.setItem(KEY_TOTAL_SHARDS, String(next));
  } catch {
    /* ignore */
  }
  return next;
}
