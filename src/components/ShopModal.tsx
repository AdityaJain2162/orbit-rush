/**
 * ShopModal.tsx — spend shards to unlock skins and buy power-ups.
 */
import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { GlassModal } from './GlassModal';
import { NeonButton } from './NeonButton';
import { Colors, Fonts, Spacing } from '../theme/theme';
import { SKINS } from '../config/skins';

interface ShopModalProps {
  visible: boolean;
  wallet: number;
  unlockedSkins: string[];
  equippedSkin: string;
  shields: number;
  magnets: number;
  onUnlockSkin: (skinId: string, cost: number) => void;
  onEquipSkin: (skinId: string) => void;
  onBuyShield: () => void;
  onBuyMagnet: () => void;
  onClose: () => void;
}

const SHIELD_COST = 30;
const MAGNET_COST = 40;

export const ShopModal: React.FC<ShopModalProps> = ({
  visible,
  wallet,
  unlockedSkins,
  equippedSkin,
  shields,
  magnets,
  onUnlockSkin,
  onEquipSkin,
  onBuyShield,
  onBuyMagnet,
  onClose,
}) => {
  return (
    <GlassModal visible={visible} title="SHOP">
      <Text style={styles.walletText}>💎 {wallet} shards</Text>

      <ScrollView style={styles.scroll}>
        <Text style={styles.sectionTitle}>SKINS</Text>
        {SKINS.map((skin) => {
          const unlocked = unlockedSkins.includes(skin.id);
          const equipped = equippedSkin === skin.id;
          return (
            <View key={skin.id} style={styles.skinRow}>
              <View
                style={[
                  styles.skinPreview,
                  { backgroundColor: skin.core, shadowColor: skin.glow },
                ]}
              />
              <Text style={styles.skinName}>{skin.name}</Text>
              {equipped ? (
                <Text style={styles.equippedText}>EQUIPPED</Text>
              ) : unlocked ? (
                <Pressable onPress={() => onEquipSkin(skin.id)}>
                  <Text style={styles.equipBtn}>EQUIP</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => onUnlockSkin(skin.id, skin.cost)}
                  disabled={wallet < skin.cost}
                >
                  <Text
                    style={[
                      styles.buyBtn,
                      wallet < skin.cost && styles.buyDisabled,
                    ]}
                  >
                    💎 {skin.cost}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>POWER-UPS</Text>
        <View style={styles.powerRow}>
          <View style={styles.powerItem}>
            <Text style={styles.powerIcon}>🛡️</Text>
            <Text style={styles.powerName}>Shield</Text>
            <Text style={styles.powerCount}>x{shields}</Text>
            <Pressable onPress={onBuyShield} disabled={wallet < SHIELD_COST}>
              <Text
                style={[
                  styles.buyBtn,
                  wallet < SHIELD_COST && styles.buyDisabled,
                ]}
              >
                💎 {SHIELD_COST}
              </Text>
            </Pressable>
          </View>
          <View style={styles.powerItem}>
            <Text style={styles.powerIcon}>🧲</Text>
            <Text style={styles.powerName}>Magnet</Text>
            <Text style={styles.powerCount}>x{magnets}</Text>
            <Pressable onPress={onBuyMagnet} disabled={wallet < MAGNET_COST}>
              <Text
                style={[
                  styles.buyBtn,
                  wallet < MAGNET_COST && styles.buyDisabled,
                ]}
              >
                💎 {MAGNET_COST}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <NeonButton label="← Back" variant="ghost" onPress={onClose} style={styles.full} />
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  walletText: {
    fontFamily: Fonts.OrbitronBold,
    fontSize: 18,
    color: Colors.shard,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  scroll: { width: '100%', maxHeight: 400 },
  sectionTitle: {
    fontFamily: Fonts.RajdhaniBold,
    fontSize: 12,
    letterSpacing: 2,
    color: Colors.nearMiss,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  skinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  skinPreview: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: Spacing.md,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.8,
  },
  skinName: {
    fontFamily: Fonts.RajdhaniSemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  equippedText: {
    fontFamily: Fonts.RajdhaniBold,
    fontSize: 11,
    color: Colors.playerCore,
    letterSpacing: 1,
  },
  equipBtn: {
    fontFamily: Fonts.RajdhaniBold,
    fontSize: 12,
    color: Colors.playerCore,
    letterSpacing: 1,
  },
  buyBtn: {
    fontFamily: Fonts.OrbitronBold,
    fontSize: 13,
    color: Colors.shard,
  },
  buyDisabled: {
    color: Colors.textMuted,
    opacity: 0.5,
  },
  powerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  powerItem: {
    alignItems: 'center',
    padding: Spacing.sm,
  },
  powerIcon: { fontSize: 28 },
  powerName: {
    fontFamily: Fonts.RajdhaniSemiBold,
    fontSize: 12,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  powerCount: {
    fontFamily: Fonts.OrbitronBold,
    fontSize: 14,
    color: Colors.textMuted,
    marginVertical: 4,
  },
  full: { width: '100%', marginTop: Spacing.md },
});

export default ShopModal;
