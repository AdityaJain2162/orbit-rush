import React from 'react';
import { StyleSheet, Text, View, TextInput } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { Colors, Fonts, Spacing } from '../theme/theme';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface ScoreHUDProps {
  score: SharedValue<number>;
  combo: SharedValue<number>;
  shards: SharedValue<number>;
  wallet: number;
}

/**
 * ScoreHUD — floating top-of-screen HUD using Orbitron font.
 *
 * The score accrues continuously on the UI thread (Reanimated SharedValue), so
 * it is rendered via `useAnimatedProps` on a TextInput — the canonical way to
 * display a SharedValue as text without bridging to the JS thread. Combo and
 * shards are also SharedValues for consistency. No React state updates occur
 * during the game loop.
 */
export const ScoreHUD: React.FC<ScoreHUDProps> = ({ score, combo, shards, wallet }) => {
  const comboStyle = useAnimatedStyle(() => ({
    opacity: combo.value > 1 ? 1 : 0.4,
    transform: [{ scale: combo.value > 1 ? 1.08 : 1 }],
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.row}>
        <View style={styles.block}>
          <Text style={styles.label}>SCORE</Text>
          <AnimatedNumber shared={score} style={styles.scoreValue} />
        </View>

        <Animated.View style={[styles.block, comboStyle]}>
          <Text style={styles.label}>COMBO</Text>
          <AnimatedNumber shared={combo} prefix="x" style={styles.comboValue} />
        </Animated.View>

        <View style={styles.block}>
          <Text style={styles.label}>SHARDS</Text>
          <AnimatedNumber shared={shards} style={styles.shardValue} />
          <Text style={styles.wallet}>BANK {wallet}</Text>
        </View>
      </View>
    </View>
  );
};

/**
 * AnimatedNumber — renders a SharedValue<number> as text on the UI thread using
 * a TextInput + useAnimatedProps(`text`). This avoids any JS-thread bridging
 * for continuously updating numbers.
 */
const AnimatedNumber: React.FC<{
  shared: SharedValue<number>;
  prefix?: string;
  style?: any;
}> = ({ shared, prefix = '', style }) => {
  const animatedProps = useAnimatedProps(() => {
    return { text: `${prefix}${Math.floor(shared.value)}` } as any;
  });
  return (
    <AnimatedTextInput
      editable={false}
      animatedProps={animatedProps}
      value={`${prefix}0`}
      style={[styles.hiddenInput, style]}
      pointerEvents="none"
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  block: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontFamily: Fonts.RajdhaniSemiBold,
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  scoreValue: {
    color: Colors.playerCore,
  },
  comboValue: {
    color: Colors.nearMiss,
  },
  shardValue: {
    color: Colors.shard,
  },
  wallet: {
    fontFamily: Fonts.RajdhaniSemiBold,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  hiddenInput: {
    fontFamily: Fonts.OrbitronBlack,
    fontSize: 30,
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    textAlign: 'center',
    includeFontPadding: false,
  },
});

export default ScoreHUD;
