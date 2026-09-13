/**
 * Ad config validation test.
 *
 * Verifies that the ad unit IDs in src/config/ads.ts match Google's
 * official test ad unit IDs when USE_TEST_ADS is true. This catches
 * accidental misconfiguration before a build is shipped.
 *
 * Run: npx tsx --tsconfig tsconfig.json src/config/ads.test.ts
 */
import {
  USE_TEST_ADS,
  REWARDED_AD_ID,
  BANNER_AD_ID,
  REWARDED_AD_ID_IOS,
  BANNER_AD_ID_IOS,
} from './ads';

// Google's official test ad unit IDs — sourced from the AdMob docs:
// https://developers.google.com/admob/android/test-ads
const EXPECTED = {
  ANDROID_REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  IOS_REWARDED: 'ca-app-pub-3940256099942544/1715393225',
  ANDROID_BANNER: 'ca-app-pub-3940256099942544/6300978111',
  IOS_BANNER: 'ca-app-pub-3940256099942544/2934735716',
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

console.log('=== Ad Config Validation ===\n');

// 1. USE_TEST_ADS must be true in development/CI.
assert(USE_TEST_ADS === true, 'USE_TEST_ADS should be true (using Google test IDs)');

// 2. Android rewarded ID matches Google's official test ID.
assert(
  REWARDED_AD_ID === EXPECTED.ANDROID_REWARDED,
  `Android rewarded ID should be ${EXPECTED.ANDROID_REWARDED}, got ${REWARDED_AD_ID}`,
);

// 3. Android banner ID matches Google's official test ID.
assert(
  BANNER_AD_ID === EXPECTED.ANDROID_BANNER,
  `Android banner ID should be ${EXPECTED.ANDROID_BANNER}, got ${BANNER_AD_ID}`,
);

// 4. iOS rewarded ID matches Google's official test ID.
assert(
  REWARDED_AD_ID_IOS === EXPECTED.IOS_REWARDED,
  `iOS rewarded ID should be ${EXPECTED.IOS_REWARDED}, got ${REWARDED_AD_ID_IOS}`,
);

// 5. iOS banner ID matches Google's official test ID.
assert(
  BANNER_AD_ID_IOS === EXPECTED.IOS_BANNER,
  `iOS banner ID should be ${EXPECTED.IOS_BANNER}, got ${BANNER_AD_ID_IOS}`,
);

// 6. All IDs follow the AdMob format: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
const ADMOB_RE = /^ca-app-pub-\d{16}\/\d{10}$/;
assert(
  ADMOB_RE.test(REWARDED_AD_ID),
  `Android rewarded ID format invalid: ${REWARDED_AD_ID}`,
);
assert(
  ADMOB_RE.test(BANNER_AD_ID),
  `Android banner ID format invalid: ${BANNER_AD_ID}`,
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
