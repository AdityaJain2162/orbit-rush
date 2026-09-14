/**
 * PauseModal.tsx — pause overlay with resume/quit options.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlassModal } from './GlassModal';
import { NeonButton } from './NeonButton';
import { Colors, Fonts, Spacing } from '../theme/theme';

interface PauseModalProps {
  visible: boolean;
  onResume: () => void;
  onQuit: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  visible,
  onResume,
  onQuit,
}) => {
  return (
    <GlassModal visible={visible} title="PAUSED">
      <Text style={styles.hint}>Take a breath. The orbit waits.</Text>
      <View style={styles.actions}>
        <NeonButton label="▶ RESUME" variant="primary" onPress={onResume} style={styles.full} />
        <NeonButton label="⌂ QUIT" variant="danger" onPress={onQuit} style={styles.full} />
      </View>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  hint: {
    fontFamily: Fonts.RajdhaniSemiBold,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  actions: { width: '100%', gap: Spacing.sm },
  full: { width: '100%' },
});

export default PauseModal;
