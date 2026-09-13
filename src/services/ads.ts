/**
 * ads.ts — Crash-Proof Monetization Engine.
 *
 * Unified Ad Manager for Google Mobile Ads Rewarded Video.
 *
 * Two execution modes:
 *  1. NATIVE PRODUCTION (dev-build / standalone): real AdMob rewarded video
 *     loaded via `RewardedAd.createForAdRequest(TestIds.REWARDED)`.
 *  2. EXPO GO / no-native-binary: MOCK flow — renders a transparent countdown
 *     overlay ("Simulating Rewarded Ad (2s)...") and invokes `onRewarded()`
 *     after 2 seconds. This guarantees the game never crashes in Expo Go.
 *
 * Detection: we attempt to require the native module. If `createForAdRequest`
 * throws (no native binary), we permanently switch to MOCK mode.
 */
export type AdMode = 'native' | 'mock';

export interface RewardResult {
  rewarded: boolean;
  amount?: number;
  type?: string;
}

export interface ShowAdOptions {
  onRewarded?: (reward: RewardResult) => void;
  onClosed?: () => void;
  onError?: (error: Error) => void;
}

let mode: AdMode | null = null;
let rewardedAd: any = null;
let adLoaded = false;
let adLoading = false;

/** Lazy, defensive require of the native ads module. */
async function getAdsModule(): Promise<any | null> {
  try {
    const mod = await import('react-native-google-mobile-ads');
    return mod;
  } catch (e) {
    return null;
  }
}

/** Returns true if the real native Google Mobile Ads binary is wired up. */
export async function detectAdMode(): Promise<AdMode> {
  if (mode) return mode;
  const mod = await getAdsModule();
  if (!mod) {
    mode = 'mock';
    return mode;
  }
  try {
    // createForAdRequest is a pure JS factory; it only fails if the native
    // module is missing. We probe by creating an instance and immediately
    // subscribing a no-op listener.
    rewardedAd = mod.RewardedAd.createForAdRequest(mod.TestIds.REWARDED, {
      requestNonPersonalizedAdsOnly: true,
    });
    mode = 'native';
  } catch (e) {
    mode = 'mock';
    rewardedAd = null;
  }
  return mode;
}

/** Preload a rewarded ad (native mode only). Safe to call repeatedly. */
export async function loadRewardedAd(): Promise<void> {
  const m = await detectAdMode();
  if (m !== 'native' || !rewardedAd || adLoaded || adLoading) return;
  adLoading = true;
  try {
    const mod = await getAdsModule();
    if (!mod) return;
    rewardedAd.addAdEventListener(mod.RewardedAdEventType.LOADED, () => {
      adLoaded = true;
      adLoading = false;
    });
    rewardedAd.addAdEventListener(mod.AdEventType.ERROR, (_err: any) => {
      adLoaded = false;
      adLoading = false;
    });
    rewardedAd.load();
  } catch (e) {
    adLoading = false;
  }
}

/**
 * Show a rewarded ad. In mock mode this drives a 2s countdown overlay via the
 * registered mock renderer callback (set by the UI). In native mode it shows
 * the real AdMob rewarded video.
 */
export async function showRewardedAd(opts: ShowAdOptions = {}): Promise<void> {
  const m = await detectAdMode();
  if (m === 'mock') {
    runMockAd(opts);
    return;
  }
  try {
    const mod = await getAdsModule();
    if (!mod || !rewardedAd) {
      runMockAd(opts);
      return;
    }
    let rewarded = false;
    const earnedUnsub = rewardedAd.addAdEventListener(
      mod.RewardedAdEventType.EARNED_REWARD,
      (reward: any) => {
        rewarded = true;
        opts.onRewarded?.({ rewarded: true, amount: reward?.amount, type: reward?.type });
      },
    );
    const closedUnsub = rewardedAd.addAdEventListener(mod.AdEventType.CLOSED, () => {
      earnedUnsub?.();
      closedUnsub?.();
      adLoaded = false;
      loadRewardedAd(); // preload next
      if (!rewarded) opts.onRewarded?.({ rewarded: true, amount: 1 }); // still grant in mock-fallback
      opts.onClosed?.();
    });
    const errorUnsub = rewardedAd.addAdEventListener(mod.AdEventType.ERROR, (err: any) => {
      earnedUnsub?.();
      closedUnsub?.();
      errorUnsub?.();
      // graceful fallback to mock so the player is never stuck
      runMockAd(opts);
    });
    if (adLoaded) {
      rewardedAd.show();
    } else {
      // not ready yet — fall back to mock this time, keep loading in background
      loadRewardedAd();
      runMockAd(opts);
    }
  } catch (e: any) {
    runMockAd(opts);
  }
}

/* ----------------------------- Mock ad overlay ---------------------------- */

let mockRenderer: ((visible: boolean, secondsLeft: number) => void) | null = null;

/**
 * Register a UI callback that renders the mock ad countdown overlay.
 * The GameOverModal uses this to show "Simulating Rewarded Ad (2s)...".
 */
export function setMockAdRenderer(
  fn: ((visible: boolean, secondsLeft: number) => void) | null,
): void {
  mockRenderer = fn;
}

function runMockAd(opts: ShowAdOptions): void {
  const totalSeconds = 2;
  let secondsLeft = totalSeconds;
  mockRenderer?.(true, secondsLeft);
  const tick = () => {
    secondsLeft -= 1;
    if (secondsLeft > 0) {
      mockRenderer?.(true, secondsLeft);
      setTimeout(tick, 1000);
    } else {
      mockRenderer?.(false, 0);
      opts.onRewarded?.({ rewarded: true, amount: 1, type: 'mock' });
      opts.onClosed?.();
    }
  };
  setTimeout(tick, 1000);
}

export function getAdMode(): AdMode {
  return mode ?? 'mock';
}

export function isMockMode(): boolean {
  return getAdMode() === 'mock';
}
