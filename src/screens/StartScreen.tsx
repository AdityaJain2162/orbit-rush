/**
 * StartScreen.tsx — title / menu screen with neon branding, daily challenge,
 * streak, and menu buttons (Play, Leaderboard, Shop, Achievements, Settings).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BannerAd } from '../components/BannerAd';
import { NeonButton } from '../components/NeonButton';
import { Colors, Fonts, Spacing } from '../theme/theme';
import type { DailyState } from '../services/storage';

interface StartScreenProps {
  highScore: number;
  wallet: number;
  daily: DailyState | null;
  streak: number;
  onStart: () => void;
  onLeaderboard: () => void;
  onShop: () => void;
  onAchievements: () => void;
  onSettings: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  highScore,
  wallet,
  daily,
  streak,
  onStart,
  onLeaderboard,
  onShop,
  onAchievements,
  onSettings,
}) => {
  const challengeText = daily
    ? daily.challengeType === 'score'
      ? `Score ${daily.challengeTarget}`
      : `Collect ${daily.challengeTarget} shards`
    : '';
  const challengeProgress = daily
    ? daily.challengeType === 'score'
      ? daily.challengeScore
      : daily.challengeShards
    : 0;
  const challengeDone = daily ? challengeProgress >= daily.challengeTarget : false;

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Text style={styles.title}>ORBIT</Text>
        <Text style={styles.subtitle}>RUSH</Text>
        <Text style={styles.tag}>NEON SWITCH</Text>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>BEST</Text>
            <Text style={styles.metaValue}>{highScore}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>SHARDS</Text>
            <Text style={styles.shardValue}>{wallet}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>STREAK</Text>
            <Text style={[styles.metaValue, { color: Colors.nearMiss }]}>
              {streak > 0 ? `${streak}🔥` : '0'}
            </Text>
          </View>
        </View>

        {daily && (
          <View style={styles.challengeCard}>
            <Text style={styles.challengeTitle}>DAILY CHALLENGE</Text>
            <Text style={styles.challengeDesc}>
              {challengeText} {challengeDone ? '✓' : `(${challengeProgress}/${daily.challengeTarget})`}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <NeonButton label="▶ TAP TO PLAY" variant="primary" onPress={onStart} style={styles.play} />
        <View style={styles.menuRow}>
          <NeonButton label="🏆" variant="ghost" onPress={onLeaderboard} style={styles.menuBtn} />
          <NeonButton label="🎨" variant="ghost" onPress={onShop} style={styles.menuBtn} />
          <NeonButton label="🎖️" variant="ghost" onPress={onAchievements} style={styles.menuBtn} />
          <NeonButton label="⚙️" variant="ghost" onPress={onSettings} style={styles.menuBtn} />
        </View>
      </View>

      <BannerAd />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.void,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xxl * 1.5,
    paddingHorizontal: Spacing.lg,
  },
  brand: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.OrbitronBlack,
    fontSize: 56,
    color: Colors.playerCore,
    letterSpacing: 6,
    textShadowColor: Colors.playerGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  subtitle: {
    fontFamily: Fonts.OrbitronBlack,
    fontSize: 56,
    color: Colors.nearMiss,
    letterSpacing: 6,
    textShadowColor: Colors.nearMissGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  tag: {
    fontFamily: Fonts.RajdhaniBold,
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: 8,
    marginTop: Spacing.sm,
  },
  meta: {
    alignItems: 'center',
    width: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: Spacing.md,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontFamily: Fonts.RajdhaniSemiBold,
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.textMuted,
  },
  metaValue: {
    fontFamily: Fonts.OrbitronBlack,
    fontSize: 28,
    color: Colors.playerCore,
  },
  shardValue: {
    fontFamily: Fonts.OrbitronBold,
    fontSize: 28,
    color: Colors.shard,
  },
  challengeCard: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
    alignItems: 'center',
  },
  challengeTitle: {
    fontFamily: Fonts.RajdhaniBold,
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.nearMiss,
  },
  challengeDesc: {
    fontFamily: Fonts.RajdhaniSemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  actions: {
    alignItems: 'center',
    width: '100%',
  },
  play: {
    width: '100%',
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  menuBtn: {
    width: 56,
  },
});

export default StartScreen;
