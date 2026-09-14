/**
 * PowerUpBar.tsx — in-game power-up indicator + pre-game equip bar.
 * Shows shield/magnet icons during gameplay with active state.
 */
import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Colors, Fonts, Spacing } from '../theme/theme';

interface PowerUpBarProps {
  shields: number;
  magnets: number;
  shieldActive: boolean;
  magnetActive: boolean;
  onUseShield: () => void;
  onUseMagnet: () => void;
}

export const PowerUpBar: React.FC<PowerUpBarProps> = ({
  shields,
  magnets,
  shieldActive,
  magnetActive,
  onUseShield,
  onUseMagnet,
}) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <Pressable
        onPress={onUseShield}
        disabled={shields === 0 || shieldActive}
        style={[styles.btn, (shields === 0 || shieldActive) && styles.disabled]}
      >
        <Text style={styles.icon}>🛡️</Text>
        <Text style={styles.count}>{shieldActive ? 'ON' : `x${shields}`}</Text>
      </Pressable>
      <Pressable
        onPress={onUseMagnet}
        disabled={magnets === 0 || magnetActive}
        style={[styles.btn, (magnets === 0 || magnetActive) && styles.disabled]}
      >
        <Text style={styles.icon}>🧲</Text>
        <Text style={styles.count}>{magnetActive ? 'ON' : `x${magnets}`}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    zIndex: 10,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
  },
  disabled: { opacity: 0.3 },
  icon: { fontSize: 18, marginRight: 4 },
  count: {
    fontFamily: Fonts.OrbitronBold,
    fontSize: 12,
    color: Colors.textPrimary,
  },
});

export default PowerUpBar;
