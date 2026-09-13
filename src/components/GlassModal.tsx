import React from 'react';
import { Modal, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors, Fonts, Radius, Spacing } from '../theme/theme';

interface GlassModalProps {
  visible: boolean;
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  onClose?: () => void;
}

/**
 * GlassModal — blurred overlay card used for Game Over & Revive prompts.
 * The card uses a glassmorphic surface (semi-transparent dark + hairline border).
 */
export const GlassModal: React.FC<GlassModalProps> = ({
  visible,
  title,
  children,
  style,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, style]}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 9, 14, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.glass,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontFamily: Fonts.OrbitronBlack,
    fontSize: 26,
    color: Colors.playerCore,
    letterSpacing: 2,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
});

export default GlassModal;
