/**
 * StartScreen.tsx — title / menu screen with neon branding and start button.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BannerAd } from '../components/BannerAd';
import { NeonButton } from '../components/NeonButton';
import { Colors, Fonts, Spacing } from '../theme/theme';

interface StartScreenProps {
  highScore: number;
  wallet: number;
  onStart: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ highScore, wallet, onStart }) => {
  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Text style={styles.title}>ORBIT</Text>
        <Text style={styles.subtitle}>RUSH</Text>
        <Text style={styles.tag}>NEON SWITCH</Text>
      </View>

      <View style={styles.meta}>
        <Text style={styles.metaLabel}>BEST</Text>
        <Text style={styles.metaValue}>{highScore}</Text>
        <Text style={[styles.metaLabel, styles.walletLabel]}>SHARD BANK</Text>
        <Text style={styles.shardValue}>{wallet}</Text>
      </View>

      <View style={styles.actions}>
        <NeonButton label="▶ TAP TO PLAY" variant="primary" onPress={onStart} style={styles.play} />
        <Text style={styles.hint}>Tap anywhere to switch between inside / outside track</Text>
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
    paddingVertical: Spacing.xxl * 2,
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
  },
  metaLabel: {
    fontFamily: Fonts.RajdhaniSemiBold,
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.textMuted,
  },
  walletLabel: {
    marginTop: Spacing.md,
  },
  metaValue: {
    fontFamily: Fonts.OrbitronBlack,
    fontSize: 36,
    color: Colors.playerCore,
  },
  shardValue: {
    fontFamily: Fonts.OrbitronBold,
    fontSize: 28,
    color: Colors.shard,
  },
  actions: {
    alignItems: 'center',
    width: '100%',
  },
  play: {
    width: '100%',
  },
  hint: {
    fontFamily: Fonts.RajdhaniSemiBold,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});

export default StartScreen;
