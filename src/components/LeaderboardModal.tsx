/**
 * LeaderboardModal.tsx — top 10 local scores.
 */
import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { GlassModal } from './GlassModal';
import { NeonButton } from './NeonButton';
import { Colors, Fonts, Spacing } from '../theme/theme';
import type { LeaderboardEntry } from '../services/storage';

interface LeaderboardModalProps {
  visible: boolean;
  entries: LeaderboardEntry[];
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  visible,
  entries,
  onClose,
}) => {
  return (
    <GlassModal visible={visible} title="LEADERBOARD">
      <ScrollView style={styles.scroll}>
        {entries.length === 0 ? (
          <Text style={styles.empty}>No scores yet. Play a round!</Text>
        ) : (
          entries.map((entry, i) => (
            <View key={i} style={styles.row}>
              <Text style={[styles.rank, i < 3 && styles.rankTop]}>{i + 1}</Text>
              <Text style={styles.score}>{entry.score}</Text>
              <Text style={styles.shards}>💎 {entry.shards}</Text>
            </View>
          ))
        )}
      </ScrollView>
      <NeonButton label="← Back" variant="ghost" onPress={onClose} style={styles.full} />
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  scroll: { width: '100%', maxHeight: 400 },
  empty: {
    fontFamily: Fonts.RajdhaniSemiBold,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  rank: {
    fontFamily: Fonts.OrbitronBold,
    fontSize: 18,
    color: Colors.textMuted,
    width: 40,
  },
  rankTop: {
    color: Colors.shard,
  },
  score: {
    fontFamily: Fonts.OrbitronBlack,
    fontSize: 22,
    color: Colors.playerCore,
    flex: 1,
  },
  shards: {
    fontFamily: Fonts.RajdhaniBold,
    fontSize: 14,
    color: Colors.shard,
  },
  full: { width: '100%', marginTop: Spacing.md },
});

export default LeaderboardModal;
