/**
 * sound.ts — Crash-proof audio + haptic service.
 *
 * Design goals:
 *  - NEVER throw or show a red screen in Expo Go / dev client / production.
 *  - Lazily load expo-av only if the native binary is present.
 *  - If anything fails (module missing, file missing, native type mismatch),
 *    fail silently and continue the game.
 *  - Haptics are also best-effort (expo-haptics is JS-only on most platforms).
 */
import * as Haptics from 'expo-haptics';
import { Asset } from 'expo-asset';
import type { Audio } from 'expo-av';

type AudioModule = typeof Audio;
type SoundInstance = InstanceType<AudioModule['Sound']>;

let audioMod: AudioModule | null = null;
let avAvailable = true; // becomes false after first failed require

async function ensureAudio(): Promise<AudioModule | null> {
  if (!avAvailable) return null;
  if (audioMod) return audioMod;
  try {
    // expo-av is deprecated but its Audio.Sound API is the most stable across
    // Expo Go versions. Dynamic require isolates us from native absence.
    const mod = (await import('expo-av')).Audio;
    audioMod = mod;
    return audioMod;
  } catch (e) {
    avAvailable = false;
    console.warn('[audio] expo-av unavailable, sound playback disabled.');
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

const soundCache: Partial<Record<SoundName, SoundInstance>> = {};
const loading: Partial<Record<SoundName, Promise<SoundInstance | null>>> = {};

async function loadSound(name: SoundName): Promise<SoundInstance | null> {
  if (soundCache[name]) return soundCache[name] ?? null;
  if (loading[name]) return loading[name] ?? null;

  loading[name] = (async () => {
    const mod = await ensureAudio();
    if (!mod) return null;
    try {
      // Make sure the asset is downloaded/cached by Metro.
      const [asset] = await Asset.loadAsync(SOUND_FILES[name]);
      const uri = asset.localUri ?? asset.uri;
      const { sound } = await mod.Sound.createAsync(
        { uri },
        { shouldPlay: false, isLooping: false, volume: 0.8 },
      );
      soundCache[name] = sound;
      return sound;
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
    const sound = await loadSound(name);
    if (!sound) return;
    try {
      await sound.setVolumeAsync(volume);
    } catch {
      /* ignore volume errors */
    }
    try {
      await sound.replayAsync();
    } catch {
      try {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } catch {
        /* swallow */
      }
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
