/**
 * GameOverModal.tsx — Game Over glass card with monetization hooks.
 *
 * Hooks:
 *  - "🎬 Revive Run (1 Left)"  — watches a rewarded ad, clears hazards within
 *    180° of the player, resumes the run. Available once per run.
 *  - "💎 Double Shards (2x)"  — watches a rewarded ad, doubles the current
 *    run's shard count. Available once per run.
 *
 * The ad flow is delegated to `src/services/ads.ts`, which transparently mocks
 * in Expo Go and uses real AdMob rewarded video in native builds.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BannerAd } from './BannerAd';
import { GlassModal } from './GlassModal';
import { NeonButton } from './NeonButton';
import { Colors, Fonts, Spacing } from '../theme/theme';
import {
  detectAdMode,
  loadRewardedAd,
  setMockAdRenderer,
  showRewardedAd,
} from '../services/ads';

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
  const [mockVisible, setMockVisible] = useState(false);
  const [mockSeconds, setMockSeconds] = useState(2);
  const [busy, setBusy] = useState(false);

  // Register the mock ad renderer so ads.ts can drive our countdown overlay.
  useEffect(() => {
    setMockAdRenderer((vis, sec) => {
      setMockVisible(vis);
      setMockSeconds(sec);
    });
    return () => setMockAdRenderer(null);
  }, []);

  // Preload native ad when modal becomes visible.
  useEffect(() => {
    if (visible) detectAdMode().then(() => loadRewardedAd());
  }, [visible]);

  const isHigh = score >= highScore && score > 0;

  const handleRevive = () => {
    if (busy || reviveUsed) return;
    setBusy(true);
    showRewardedAd({
      onRewarded: () => {
        setBusy(false);
        onRevive();
      },
      onClosed: () => setBusy(false),
      onError: () => setBusy(false),
    });
  };

  const handleDoubleShards = () => {
    if (busy || doubleShardsUsed || shards <= 0) return;
    setBusy(true);
    showRewardedAd({
      onRewarded: () => {
        setBusy(false);
        onDoubleShards();
      },
      onClosed: () => setBusy(false),
      onError: () => setBusy(false),
    });
  };

  return (
    <>
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
            disabled={reviveUsed || busy}
            onPress={handleRevive}
            style={styles.full}
          />
          <NeonButton
            label={
              doubleShardsUsed
                ? 'Doubled'
                : shards <= 0
                ? '💎 Double Shards (2x)'
                : '💎 Double Shards (2x)'
            }
            variant="gold"
            disabled={doubleShardsUsed || shards <= 0 || busy}
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

      {mockVisible ? (
        <View style={styles.mockOverlay} pointerEvents="none">
          <View style={styles.mockCard}>
            <Text style={styles.mockTitle}>Simulating Rewarded Ad</Text>
            <Text style={styles.mockSeconds}>{mockSeconds}s</Text>
            <Text style={styles.mockSub}>Mock ad — Expo Go has no native binary</Text>
          </View>
        </View>
      ) : null}
    </>
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
  mockOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 9, 14, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  mockCard: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 18,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  mockTitle: {
    fontFamily: Fonts.OrbitronBold,
    fontSize: 18,
    color: Colors.playerCore,
    letterSpacing: 1,
  },
  mockSeconds: {
    fontFamily: Fonts.OrbitronBlack,
    fontSize: 40,
    color: Colors.shard,
    marginVertical: Spacing.sm,
  },
  mockSub: {
    fontFamily: Fonts.RajdhaniSemiBold,
    fontSize: 11,
    color: Colors.textMuted,
  },
});

export default GameOverModal;
