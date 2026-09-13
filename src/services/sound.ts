/**
 * sound.ts — Crash-proof audio + haptic service.
 *
 * Design goals:
 *  - NEVER throw or show a red screen in Expo Go / dev client / production.
 *  - Lazily load expo-audio only if the native binary is present.
 *  - If anything fails (module missing, file missing, native type mismatch),
 *    fail silently and continue the game.
 *  - Haptics are also best-effort (expo-haptics is JS-only on most platforms).
 *
 * Uses expo-audio (SDK 57 replacement for expo-av). expo-audio's native module
 * `ExpoAudio` IS included in the Expo Go binary, so it works without a dev
 * build. The dynamic import + try/catch wrapper still guards against any
 * future environment where the native binary is absent.
 */
import * as Haptics from 'expo-haptics';
import { Asset } from 'expo-asset';

import type { AudioPlayer } from 'expo-audio';

let audioMod: typeof import('expo-audio') | null = null;
let avAvailable = true; // becomes false after first failed require

async function ensureAudio(): Promise<typeof import('expo-audio') | null> {
  if (!avAvailable) return null;
  if (audioMod) return audioMod;
  try {
    const mod = await import('expo-audio');
    audioMod = mod;
    return audioMod;
  } catch (e) {
    avAvailable = false;
    console.warn('[audio] expo-audio unavailable, sound playback disabled.');
    return null;
  }
}

type SoundName = 'switch' | 'shard' | 'nearmiss' | 'crash';

const SOUND_FILES: Record<SoundName, any> = {
  switch: require('../../assets/sounds/switch.wav'),
  shard: require('../../assets/sounds/shard.wav'),
  nearmiss: require('../../assets/sounds/nearmiss.wav'),
  crash: require('../../assets/sounds/crash.wav'),
};

const playerCache: Partial<Record<SoundName, AudioPlayer>> = {};
const loading: Partial<Record<SoundName, Promise<AudioPlayer | null>>> = {};

async function loadSound(name: SoundName): Promise<AudioPlayer | null> {
  if (playerCache[name]) return playerCache[name] ?? null;
  if (loading[name]) return loading[name] ?? null;

  loading[name] = (async () => {
    const mod = await ensureAudio();
    if (!mod) return null;
    try {
      // Resolve the asset URI via expo-asset so Metro caches the file.
      const [asset] = await Asset.loadAsync(SOUND_FILES[name]);
      const uri = asset.localUri ?? asset.uri;
      const player = mod.createAudioPlayer({ uri });
      playerCache[name] = player;
      return player;
    } catch (e: any) {
      console.warn(`[audio] failed to create player for "${name}":`, e?.message ?? e);
      return null;
    }
  })();

  return loading[name] ?? null;
}

/** Pre-load all sounds. Safe to call multiple times. */
export async function preloadSounds(): Promise<void> {
  await Promise.all(
    (['switch', 'shard', 'nearmiss', 'crash'] as SoundName[]).map((n) => loadSound(n)),
  );
}

async function play(name: SoundName, volume = 0.8): Promise<void> {
  try {
    const player = await loadSound(name);
    if (!player) return;
    try {
      player.volume = volume;
    } catch {
      /* ignore volume errors */
    }
    try {
      // expo-audio has no replayAsync; seek to start then play.
      player.seekTo(0);
      player.play();
    } catch {
      /* swallow */
    }
  } catch (e) {
    /* never surface */
  }
}

export const Sound = {
  switch: () => play('switch', 0.6),
  shard: () => play('shard', 0.8),
  nearMiss: () => play('nearmiss', 0.7),
  crash: () => play('crash', 1.0),
};

/** Haptics — best effort, never throw. */
export const Haptic = {
  light: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {
      /* ignore */
    }
  },
  medium: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {
      /* ignore */
    }
  },
  heavy: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    } catch {
      /* ignore */
    }
  },
  error: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } catch {
      /* ignore */
    }
  },
};

/** Combined feedback helpers used by the game engine. */
export const Feedback = {
  onTrackSwitch() {
    Sound.switch();
    Haptic.light();
  },
  onShard() {
    Sound.shard();
    Haptic.medium();
  },
  onNearMiss() {
    Sound.nearMiss();
    Haptic.heavy();
  },
  onCrash() {
    Sound.crash();
    Haptic.error();
  },
};
