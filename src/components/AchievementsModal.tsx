/**
 * AchievementsModal.tsx — displays all achievements with unlock status.
 */
import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { GlassModal } from './GlassModal';
import { NeonButton } from './NeonButton';
import { Colors, Fonts, Spacing } from '../theme/theme';
import { ACHIEVEMENTS } from '../config/achievements';

interface AchievementsModalProps {
  visible: boolean;
  unlocked: string[];
  stats: {
    highScore: number;
    totalRuns: number;
    totalShards: number;
  };
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  visible,
  unlocked,
  stats,
  onClose,
}) => {
  return (
    <GlassModal visible={visible} title="ACHIEVEMENTS">
      <Text style={styles.summary}>
        {unlocked.length} / {ACHIEVEMENTS.length} unlocked
      </Text>
      <ScrollView style={styles.scroll}>
        {ACHIEVEMENTS.map((ach) => {
          const isUnlocked = unlocked.includes(ach.id);
          return (
            <View
              key={ach.id}
              style={[styles.row, !isUnlocked && styles.locked]}
            >
              <Text style={styles.icon}>{isUnlocked ? ach.icon : '🔒'}</Text>
              <View style={styles.info}>
                <Text style={styles.name}>{ach.name}</Text>
                <Text style={styles.desc}>{ach.description}</Text>
                <Text style={styles.reward}>Reward: 💎 {ach.reward}</Text>
              </View>
              {isUnlocked && <Text style={styles.check}>✓</Text>}
            </View>
          );
        })}
      </ScrollView>
      <NeonButton label="← Back" variant="ghost" onPress={onClose} style={styles.full} />
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  summary: {
    fontFamily: Fonts.RajdhaniBold,
    fontSize: 13,
    color: Colors.nearMiss,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  scroll: { width: '100%', maxHeight: 400 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  locked: { opacity: 0.5 },
  icon: { fontSize: 28, marginRight: Spacing.md },
  info: { flex: 1 },
  name: {
    fontFamily: Fonts.RajdhaniBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  desc: {
    fontFamily: Fonts.RajdhaniSemiBold,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  reward: {
    fontFamily: Fonts.RajdhaniSemiBold,
    fontSize: 11,
    color: Colors.shard,
    marginTop: 2,
  },
  check: {
    fontFamily: Fonts.OrbitronBold,
    fontSize: 18,
    color: Colors.playerCore,
  },
  full: { width: '100%', marginTop: Spacing.md },
});

export default AchievementsModal;
