/**
 * AdMob configuration for Orbit Rush.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * HOW TO ENABLE REAL ADS (when you have an AdMob account):
 *
 * 1. Go to https://admob.google.com and sign in with your Google account.
 * 2. Add your app:  Apps → Add App → enter "Orbit Rush".
 *    Note the App ID (format: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX).
 * 3. Create ad units for the formats you want:
 *    - Rewarded:  Ad units → Add ad unit → Rewarded → name it "Revive".
 *    - Banner:    Ad units → Add ad unit → Banner → name it "Bottom".
 *    Note each Ad Unit ID (format: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX).
 * 4. Update the values below:
 *    - Set USE_TEST_ADS = false
 *    - Replace ANDROID_APP_ID / IOS_APP_ID in app.json plugins
 *    - Replace ANDROID_REWARDED_ID / ANDROID_BANNER_ID below
 * 5. Rebuild a dev client (or EAS build) so the new app.json takes effect:
 *      npx expo run:android
 *      # or
 *      eas build --profile production --platform android
 * 6. For production, also add your device as a test device in AdMob to avoid
 *    policy violations during development.
 *
 * Until you do this, the app uses Google's official test ad unit IDs, which
 * serve sample ads and are safe for development.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Set to false once you have real AdMob IDs. */
export const USE_TEST_ADS = true;

// ── Google's official test ad unit IDs (safe for development) ──────────────
const TEST_ANDROID_REWARDED = 'ca-app-pub-3940256099942544/5224354917';
const TEST_IOS_REWARDED = 'ca-app-pub-3940256099942544/1715393225';
const TEST_ANDROID_BANNER = 'ca-app-pub-3940256099942544/6300978111';
const TEST_IOS_BANNER = 'ca-app-pub-3940256099942544/2934735716';

// ── Your real ad unit IDs (replace these when you have an AdMob account) ───
const REAL_ANDROID_REWARDED = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
const REAL_IOS_REWARDED = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
const REAL_ANDROID_BANNER = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
const REAL_IOS_BANNER = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';

/** Rewarded video ad unit ID for Android. */
export const REWARDED_AD_ID = USE_TEST_ADS
  ? TEST_ANDROID_REWARDED
  : REAL_ANDROID_REWARDED;

/** Banner ad unit ID for Android. */
export const BANNER_AD_ID = USE_TEST_ADS
  ? TEST_ANDROID_BANNER
  : REAL_ANDROID_BANNER;

/** iOS rewarded ad unit ID. */
export const REWARDED_AD_ID_IOS = USE_TEST_ADS
  ? TEST_IOS_REWARDED
  : REAL_IOS_REWARDED;

/** iOS banner ad unit ID. */
export const BANNER_AD_ID_IOS = USE_TEST_ADS
  ? TEST_IOS_BANNER
  : REAL_IOS_BANNER;
