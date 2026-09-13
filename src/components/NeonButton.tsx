import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Radius, Spacing } from '../theme/theme';

type Variant = 'primary' | 'ghost' | 'danger' | 'gold';

interface NeonButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
}

const VARIANT_COLORS: Record<Variant, { border: string; glow: string; text: string }> = {
  primary: { border: Colors.playerCore, glow: Colors.playerGlow, text: Colors.playerCore },
  ghost: { border: Colors.glassBorder, glow: 'transparent', text: Colors.textPrimary },
  danger: { border: Colors.hazardLeft, glow: Colors.hazardGlow, text: Colors.hazardLeft },
  gold: { border: Colors.shard, glow: Colors.shardGlow, text: Colors.shard },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const NeonButton: React.FC<NeonButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}) => {
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    pressed.value = withSpring(1, { damping: 14, stiffness: 320 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [pressed]);

  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(0, { damping: 14, stiffness: 320 });
  }, [pressed]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    onPress();
  }, [disabled, onPress]);

  const animStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, 0.94]);
    const glowOpacity = interpolate(pressed.value, [0, 1], [0.35, 0.85]);
    return {
      transform: [{ scale }],
      shadowOpacity: glowOpacity,
    };
  });

  const palette = VARIANT_COLORS[variant];

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.base,
        {
          borderColor: palette.border,
          shadowColor: palette.glow,
        },
        animStyle,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 4,
    backgroundColor: Colors.glass,
  },
  label: {
    fontFamily: Fonts.RajdhaniBold,
    fontSize: 18,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  disabled: {
    opacity: 0.4,
  },
});

export default NeonButton;
