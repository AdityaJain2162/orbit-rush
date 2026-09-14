/**
 * OrbitCanvas.tsx — pure UI-thread renderer for the 2-lane vertical runner.
 *
 * Reads SharedValues from the engine and renders: lane lines, scrolling
 * road, hazards, shards, player orb + ghost trail, and near-miss pulse.
 * All motion is driven by `useAnimatedStyle` — no JS state, no setInterval.
 * A full-screen tap layer toggles the player's lane.
 */
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Colors, GameGeometry, PlayerSkin } from '../theme/theme';
import type { OrbitEngine } from './useOrbitEngine';

const ORB_SIZE = 28;
const HAZARD_W = 52;
const HAZARD_H = 44;
const SHARD_SIZE = 22;
const TRAIL_SIZES = [24, 21, 18];

export const OrbitCanvas: React.FC<{ engine: OrbitEngine }> = ({ engine }) => {
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    engine.setScreenSize(width, height);
  }, [width, height, engine]);

  const playerY = height * GameGeometry.playerYFraction;
  const lane0X = width * GameGeometry.laneXFractions[0];
  const lane1X = width * GameGeometry.laneXFractions[1];

  // ---- Player orb ----
  const playerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: engine.playerX.value - ORB_SIZE / 2 },
      { translateY: playerY - ORB_SIZE / 2 },
    ],
  }));

  // ---- Trail orbs (ghosts behind player) ----
  const trailStyles = TRAIL_SIZES.map((_, i) =>
    useAnimatedStyle(() => ({
      transform: [
        { translateX: engine.playerX.value - TRAIL_SIZES[i] / 2 },
        { translateY: playerY - TRAIL_SIZES[i] / 2 + GameGeometry.trailOffsets[i] },
      ],
      opacity: GameGeometry.trailOpacities[i],
    })),
  );

  // ---- Shield ring (visible when shield is active) ----
  const shieldStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: engine.playerX.value - 24 },
      { translateY: playerY - 24 },
      { scale: 1 + engine.shieldGlow.value * 0.1 },
    ],
    opacity: engine.shieldGlow.value,
  }));

  // ---- Magnet aura (visible when magnet is active) ----
  const magnetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: engine.playerX.value - 40 },
      { translateY: playerY - 40 },
    ],
    opacity: engine.magnetGlow.value * 0.3,
  }));

  // ---- Lane line scroll (decorative, moves down with world) ----
  const laneLineStyle = useAnimatedStyle(() => {
    const offset = engine.scrollOffset.value % 80;
    return { transform: [{ translateY: offset }] };
  });

  // ---- Hazards & shards (unified style, type read in worklet) ----
  // Hazards: neon barrier blocks (rounded rect with border)
  // Shards: diamond crystals (rotated 45° square)
  const objStyles = Array.from({ length: engine.objWorldY.length }, (_, i) =>
    useAnimatedStyle(() => {
      const active = engine.objActive[i].value;
      if (!active) return { opacity: 0, transform: [{ translateX: -9999 }, { translateY: 0 }], backgroundColor: 'transparent', width: 0, height: 0, borderRadius: 0 } as any;
      const screenY = engine.scrollOffset.value - engine.objWorldY[i].value + height;
      const lane = engine.objLane[i].value;
      const x = lane === 0 ? lane0X : lane1X;
      const type = engine.objType[i].value;
      if (type === 1) {
        // Hazard: neon barrier block
        return {
          transform: [{ translateX: x - HAZARD_W / 2 }, { translateY: screenY - HAZARD_H / 2 }],
          opacity: 1,
          width: HAZARD_W,
          height: HAZARD_H,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: Colors.hazardLeft,
          backgroundColor: 'rgba(255, 0, 85, 0.15)',
          shadowColor: Colors.hazardGlow,
        } as any;
      }
      // Shard: diamond crystal (rotated 45°)
      return {
        transform: [
          { translateX: x - SHARD_SIZE / 2 },
          { translateY: screenY - SHARD_SIZE / 2 },
          { rotate: '45deg' },
        ],
        opacity: 1,
        width: SHARD_SIZE,
        height: SHARD_SIZE,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: Colors.shard,
        backgroundColor: 'rgba(255, 230, 0, 0.25)',
        shadowColor: Colors.shardGlow,
      } as any;
    }),
  );

  // ---- Tap layer ----
  const handleTap = useCallback(() => {
    engine.toggleTrack();
  }, [engine]);

  return (
    <View
      style={StyleSheet.absoluteFill}
      onStartShouldSetResponder={() => true}
      onResponderGrant={handleTap}
    >
      {/* Lane background */}
      <View style={[styles.laneBg, { left: 0, width: width * 0.5 }]} />
      <View style={[styles.laneBg, { left: width * 0.5, width: width * 0.5 }]} />

      {/* Scrolling lane divider lines */}
      <Animated.View style={[styles.laneDivider, { left: width * 0.5 - 1 }, laneLineStyle]} />

      {/* Lane edge lines */}
      <View style={[styles.edgeLine, { left: width * 0.16 }]} />
      <View style={[styles.edgeLine, { left: width * 0.84 }]} />

      {/* Trail */}
      {TRAIL_SIZES.map((size, i) => (
        <Animated.View
          key={`trail-${i}`}
          style={[
            styles.orb,
            styles.trail,
            { width: size, height: size, borderRadius: size / 2 },
            trailStyles[i],
          ]}
        />
      ))}

      {/* Magnet aura */}
      <Animated.View
        style={[
          styles.magnetAura,
          { width: 80, height: 80, borderRadius: 40 },
          magnetStyle,
        ]}
      />

      {/* Hazards & shards (style determined in worklet) */}
      {objStyles.map((s, i) => (
        <Animated.View key={`obj-${i}`} style={[styles.objBase, s]} />
      ))}

      {/* Shield ring */}
      <Animated.View
        style={[
          styles.shieldRing,
          { width: 48, height: 48, borderRadius: 24 },
          shieldStyle,
        ]}
      />

      {/* Player */}
      <Animated.View
        style={[
          styles.orb,
          { width: ORB_SIZE, height: ORB_SIZE, borderRadius: ORB_SIZE / 2 },
          playerStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  laneBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(22, 25, 38, 0.3)',
  },
  laneDivider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: Colors.laneLine,
  },
  edgeLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: PlayerSkin.glow,
    opacity: 0.15,
  },
  orb: {
    position: 'absolute',
    backgroundColor: PlayerSkin.core,
    shadowColor: PlayerSkin.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    shadowOpacity: 0.9,
    elevation: 6,
  },
  trail: {
    backgroundColor: PlayerSkin.core,
    shadowRadius: 10,
    shadowOpacity: 0.5,
  },
  objBase: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    shadowOpacity: 0.9,
    elevation: 5,
  },
  shieldRing: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#00FFAA',
    backgroundColor: 'transparent',
    shadowColor: '#00FFAA',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    shadowOpacity: 0.9,
  },
  magnetAura: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#FFEE00',
    backgroundColor: 'rgba(255, 238, 0, 0.08)',
    shadowColor: '#FFEE00',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    shadowOpacity: 0.6,
  },
});

export default OrbitCanvas;
