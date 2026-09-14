/**
 * SettingsModal.tsx — sound and vibration toggles.
 */
import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { GlassModal } from './GlassModal';
import { NeonButton } from './NeonButton';
import { Colors, Fonts, Spacing } from '../theme/theme';
import type { Settings } from '../services/storage';

interface SettingsModalProps {
  visible: boolean;
  settings: Settings;
  onToggleSound: () => void;
  onToggleVibration: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  settings,
  onToggleSound,
  onToggleVibration,
  onClose,
}) => {
  return (
    <GlassModal visible={visible} title="SETTINGS">
      <View style={styles.row}>
        <Text style={styles.label}>🔊 Sound</Text>
        <Pressable onPress={onToggleSound} style={styles.toggle}>
          <Text style={styles.toggleText}>
            {settings.soundEnabled ? 'ON' : 'OFF'}
          </Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>📳 Vibration</Text>
        <Pressable onPress={onToggleVibration} style={styles.toggle}>
          <Text style={styles.toggleText}>
            {settings.vibrationEnabled ? 'ON' : 'OFF'}
          </Text>
        </Pressable>
      </View>
      <NeonButton label="← Back" variant="ghost" onPress={onClose} style={styles.full} />
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
    width: '100%',
  },
  label: {
    fontFamily: Fonts.RajdhaniSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  toggle: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.playerCore,
    backgroundColor: Colors.glass,
  },
  toggleText: {
    fontFamily: Fonts.OrbitronBold,
    fontSize: 14,
    color: Colors.playerCore,
  },
  full: { width: '100%', marginTop: Spacing.xl },
});

export default SettingsModal;
