/**
 * storage.ts — thin async wrapper around AsyncStorage for the shard wallet
 * and high score. All calls are try/catch wrapped so a corrupted store never
 * crashes the game.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_WALLET = 'orbit_rush.wallet';
const KEY_HIGH_SCORE = 'orbit_rush.high_score';

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
