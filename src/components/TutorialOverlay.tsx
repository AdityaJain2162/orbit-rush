/**
 * TutorialOverlay.tsx — brief first-play tutorial hint.
 *
 * Shows a pulsing "TAP TO SWITCH LANES" hint over the player on the first
 * run only. Disappears after the player taps once or after 4 seconds.
 * Persisted in AsyncStorage so it never shows again after the first time.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Spacing } from '../theme/theme';

const STORAGE_KEY = 'orbit_rush.tutorial_seen';

interface TutorialOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ visible, onDismiss }) => {
  const [show, setShow] = useState(false);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(STORAGE_KEY);
        if (!seen && !cancelled) {
          setShow(true);
          pulse.value = withRepeat(
            withSequence(
              withTiming(1.15, { duration: 600 }),
              withTiming(1, { duration: 600 }),
            ),
            -1,
            true,
          );
          // auto-dismiss after 5 seconds
          setTimeout(() => {
            if (!cancelled) dismiss();
          }, 5000);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const dismiss = () => {
    setShow(false);
    AsyncStorage.setItem(STORAGE_KEY, '1').catch(() => {});
    onDismiss();
  };

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: withDelay(0, withTiming(1, { duration: 300 })),
  }));

  if (!show) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.card, pulseStyle]}>
        <Text style={styles.title}>TAP TO SWITCH</Text>
        <Text style={styles.sub}>Tap anywhere to change lanes</Text>
        <Text style={styles.sub}>Dodge red · Collect gold</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  card: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 18,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    shadowColor: Colors.playerGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    shadowOpacity: 0.6,
    elevation: 8,
  },
  title: {
    fontFamily: Fonts.OrbitronBlack,
    fontSize: 22,
    color: Colors.playerCore,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  sub: {
    fontFamily: Fonts.RajdhaniSemiBold,
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },
});

export default TutorialOverlay;
