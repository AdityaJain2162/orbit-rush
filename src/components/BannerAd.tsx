/**
 * BannerAd — bottom-of-screen banner ad with a safe placeholder fallback.
 *
 * On native standalone builds (dev client / APK), renders a real AdMob
 * banner using Google's test ad unit ID. In Expo Go / web / environments
 * without the native module, renders a styled placeholder box so the
 * layout is preserved and you can see where the ad will appear.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { loadBannerModule, isMockMode } from '../services/ads';

export function BannerAd() {
  const [module, setModule] = useState<Awaited<
    ReturnType<typeof loadBannerModule>
  > >(null);

  useEffect(() => {
    if (isMockMode()) return; // Expo Go → placeholder, skip load
    let cancelled = false;
    loadBannerModule().then((mod) => {
      if (!cancelled) setModule(mod);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Expo Go / mock mode or module not loaded yet → placeholder.
  if (!module) {
    return (
      <View style={styles.placeholder} pointerEvents="none">
        <Text style={styles.placeholderText}>Ad Banner Placeholder</Text>
      </View>
    );
  }

  // Native standalone → real AdMob banner.
  const { BannerAd, BannerAdSize, TestIds } = module;
  try {
    return (
      <View style={styles.container}>
        <BannerAd
          unitId={TestIds.BANNER}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{}}
        />
      </View>
    );
  } catch {
    return (
      <View style={styles.placeholder} pointerEvents="none">
        <Text style={styles.placeholderText}>Ad Banner Placeholder</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  placeholder: {
    width: 320,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 25, 38, 0.85)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: 'rgba(0, 240, 255, 0.7)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: 'Rajdhani_600SemiBold',
  },
});
