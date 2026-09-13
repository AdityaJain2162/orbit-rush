/**
 * Web / Expo Go fallback for the AdMob ads service.
 *
 * Metro picks this file on web (over ads.native.ts) so the native-only
 * `react-native-google-mobile-ads` module is never bundled for web. `Ads`
 * is null, which makes useRewardedAd fall back to mock mode.
 *
 * On native platforms (iOS/Android), Metro picks `ads.native.ts` instead,
 * which attempts to require the native module and exports `Ads` as the
 * module (or null if the native binary isn't linked, e.g. Expo Go).
 */
export const Ads: any = null;
