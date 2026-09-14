/**
 * PauseButton.tsx — small pause button shown during gameplay.
 */
import React from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import { Colors, Spacing } from '../theme/theme';

interface PauseButtonProps {
  onPress: () => void;
}

export const PauseButton: React.FC<PauseButtonProps> = ({ onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      style={styles.btn}
      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
    >
      <Text style={styles.icon}>⏸</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  icon: {
    fontSize: 18,
    color: Colors.textPrimary,
  },
});

export default PauseButton;
