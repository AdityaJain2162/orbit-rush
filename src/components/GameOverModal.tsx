/**
 * GameOverModal.tsx — Game Over glass card with monetization hooks.
 *
 * Hooks:
 *  - "🎬 Revive Run (1 Left)"  — watches a rewarded ad, clears hazards near
 *    the player, resumes the run. Available once per run.
 *  - "💎 Double Shards (2x)"  — watches a rewarded ad, doubles the current
 *    run's shard count. Available once per run.
 *
 * The ad flow is delegated to `useRewardedAd`, which transparently mocks
 * in Expo Go and uses real AdMob rewarded video in native builds.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlassModal } from './GlassModal';
import { NeonButton } from './NeonButton';
import { BannerAd } from './BannerAd';
import { Colors, Fonts, Spacing } from '../theme/theme';
import { useRewardedAd } from '../hooks/useRewardedAd';

interface GameOverModalProps {
  visible: boolean;
  score: number;
  shards: number;
  wallet: number;
  highScore: number;
  reviveUsed: boolean;
  doubleShardsUsed: boolean;
  onRevive: () => void;
  onDoubleShards: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  visible,
  score,
  shards,
  wallet,
  highScore,
  reviveUsed,
  doubleShardsUsed,
  onRevive,
  onDoubleShards,
  onRestart,
  onHome,
}) => {
  const { isLoaded: adLoaded, showAd } = useRewardedAd();

  const isHigh = score >= highScore && score > 0;

  const handleRevive = () => {
    if (reviveUsed || !adLoaded) return;
    showAd(() => {
      onRevive();
    });
  };

  const handleDoubleShards = () => {
    if (doubleShardsUsed || shards <= 0 || !adLoaded) return;
    showAd(() => {
      onDoubleShards();
    });
  };

  return (
    <GlassModal visible={visible} title="GAME OVER">
      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>SCORE</Text>
          <Text style={styles.scoreValue}>{score}</Text>
          {isHigh ? <Text style={styles.highBadge}>NEW BEST</Text> : null}
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>SHARDS</Text>
          <Text style={styles.shardValue}>{shards}</Text>
          <Text style={styles.wallet}>BANK {wallet}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <NeonButton
          label={reviveUsed ? 'Revive Used' : '🎬 Revive Run (1 Left)'}
          variant="primary"
          disabled={reviveUsed || !adLoaded}
          onPress={handleRevive}
          style={styles.full}
        />
        <NeonButton
          label={doubleShardsUsed ? 'Doubled' : '💎 Double Shards (2x)'}
          variant="gold"
          disabled={doubleShardsUsed || shards <= 0 || !adLoaded}
          onPress={handleDoubleShards}
          style={styles.full}
        />
        <NeonButton label="↻ Retry" variant="danger" onPress={onRestart} style={styles.full} />
        <NeonButton label="⌂ Home" variant="ghost" onPress={onHome} style={styles.full} />
      </View>

      <View style={styles.bannerWrap}>
        <BannerAd />
      </View>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: Spacing.md,
  },
  statBlock: {
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: Fonts.RajdhaniSemiBold,
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.textMuted,
  },
  scoreValue: {
    fontFamily: Fonts.OrbitronBlack,
    fontSize: 32,
    color: Colors.playerCore,
  },
  shardValue: {
    fontFamily: Fonts.OrbitronBold,
    fontSize: 28,
    color: Colors.shard,
  },
  wallet: {
    fontFamily: Fonts.RajdhaniSemiBold,
    fontSize: 10,
    color: Colors.textMuted,
  },
  highBadge: {
    fontFamily: Fonts.RajdhaniBold,
    fontSize: 10,
    color: Colors.nearMiss,
    letterSpacing: 1,
    marginTop: 2,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  full: {
    width: '100%',
  },
  bannerWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
});

export default GameOverModal;
