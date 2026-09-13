/**
 * Native AdMob ads service (iOS / Android).
 *
 * Metro picks this file on native platforms. It attempts to require the
 * native `react-native-google-mobile-ads` module. If the require fails
 * (module not installed) OR the native module isn't linked at runtime
 * (e.g. Expo Go without a dev client), `Ads` is null and useRewardedAd
 * falls back to mock mode.
 *
 * The key safety measure: we check whether the native module's JS binding
 * actually has the expected exports (RewardedAd, etc.) before exposing it.
 * In Expo Go, `react-native-google-mobile-ads` may be requireable from JS
 * but its native module isn't linked, so calling any method throws —
 * which would crash the app. By returning null here, useRewardedAd knows
 * to use mock mode.
 */
let Ads: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('react-native-google-mobile-ads');
  // Verify the module has the expected exports. If the native side isn't
  // linked, these may be undefined or throw on access.
  if (mod && typeof mod.RewardedAd === 'function' && mod.RewardedAdEventType) {
    Ads = mod;
  } else {
    Ads = null;
  }
} catch {
  Ads = null;
}

export { Ads };
