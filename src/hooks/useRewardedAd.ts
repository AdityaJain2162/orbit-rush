/**
 * useRewardedAd — Google AdMob Rewarded Video with a safe mock fallback.
 *
 * Preloads a rewarded ad using the ad unit ID from `src/config/ads.ts`
 * (Google test IDs by default; swap in real IDs when you have an AdMob
 * account) and exposes `{ isLoaded, showAd }`. When an ad closes
 * (rewarded or dismissed) the next one is automatically reloaded.
 *
 * Safe fallback: in Expo Go or any environment where the native
 * react-native-google-mobile-ads module is unavailable, the hook switches
 * to "mock mode" — `isLoaded` becomes true and `showAd` simulates an ad:
 * a 2-second loading timer fires, then the reward callback is invoked so
 * the revive flow is fully testable without a dev-client build. The app
 * never crashes.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { Ads } from '../services/ads';
import { REWARDED_AD_ID, REWARDED_AD_ID_IOS } from '../config/ads';

export interface UseRewardedAdResult {
  /** True when an ad is ready to show (or in mock mode). */
  isLoaded: boolean;
  /**
   * Show the rewarded ad. `onReward` is called once the user earns the reward.
   * In mock mode this simulates a 2-second ad then fires the callback.
   */
  showAd: (onReward: () => void) => void;
}

export function useRewardedAd(): UseRewardedAdResult {
  const [isLoaded, setIsLoaded] = useState(false);
  const adRef = useRef<any>(null);
  const rewardCbRef = useRef<(() => void) | null>(null);
  const mockRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let unsubs: Array<() => void> = [];

    // No native module available -> mock mode (Expo Go / local / web).
    if (!Ads) {
      mockRef.current = true;
      setIsLoaded(true);
      return;
    }

    const { RewardedAd, RewardedAdEventType, AdEventType } = Ads;
    let ad: any;
    try {
      ad = RewardedAd.createForAdRequest(
        Platform.OS === 'ios' ? REWARDED_AD_ID_IOS : REWARDED_AD_ID,
      );
    } catch {
      // Native module present in JS but not linked at runtime -> mock mode.
      mockRef.current = true;
      setIsLoaded(true);
      return;
    }
    adRef.current = ad;

    const load = () => {
      try {
        ad.load();
      } catch {
        mockRef.current = true;
        if (mounted) setIsLoaded(true);
      }
    };

    try {
      unsubs.push(
        ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
          if (mounted) setIsLoaded(true);
        }),
      );
      unsubs.push(
        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          const cb = rewardCbRef.current;
          rewardCbRef.current = null;
          if (cb) cb();
        }),
      );
      unsubs.push(
        ad.addAdEventListener(AdEventType.CLOSED, () => {
          // Ad dismissed — reload the next one and mark not-ready meanwhile.
          if (mounted) setIsLoaded(false);
          load();
        }),
      );
      unsubs.push(
        ad.addAdEventListener(AdEventType.ERROR, () => {
          if (mounted) setIsLoaded(false);
          // Retry after a short delay on error.
          setTimeout(load, 2000);
        }),
      );
    } catch {
      mockRef.current = true;
      if (mounted) setIsLoaded(true);
      return;
    }

    load();

    return () => {
      mounted = false;
      unsubs.forEach((u) => {
        try {
          u();
        } catch {
          /* no-op */
        }
      });
      unsubs = [];
    };
  }, []);

  const showAd = useCallback((onReward: () => void) => {
    rewardCbRef.current = onReward;

    if (mockRef.current) {
      // Mock mode: simulate a 2-second rewarded ad, then fire the reward.
      if (Platform.OS !== 'web') {
        Alert.alert('Simulating Rewarded Ad', 'Reward will be granted in 2 seconds...');
      }
      setTimeout(() => {
        const cb = rewardCbRef.current;
        rewardCbRef.current = null;
        if (cb) cb();
      }, 2000);
      return;
    }

    const ad = adRef.current;
    if (!ad) return;
    try {
      ad.show();
    } catch {
      // Not actually loaded — fall back to mock so the flow still works.
      if (Platform.OS !== 'web') {
        Alert.alert('Simulating Rewarded Ad', 'Reward will be granted in 2 seconds...');
      }
      setTimeout(() => {
        const cb = rewardCbRef.current;
        rewardCbRef.current = null;
        if (cb) cb();
      }, 2000);
    }
  }, []);

  return { isLoaded, showAd };
}
