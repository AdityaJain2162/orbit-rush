/**
 * OrbitCanvas.tsx — pure UI-thread renderer for Orbit Rush.
 *
 * Reads SharedValues from the engine and renders the track ring, hazards,
 * shards, player orb + ghost trail, and near-miss plasma pulse. All motion is
 * driven by `useAnimatedStyle` / `useAnimatedProps` — no JS state, no
 * setInterval. A full-screen tap layer toggles the player's track.
 */
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Colors, GameGeometry } from '../theme/theme';
import type { OrbitEngine } from './useOrbitEngine';

const ORB_SIZE = 26;
const HAZARD_SIZE = 22;
const SHARD_SIZE = 14;
const TRAIL_SIZES = [22, 19, 16];

export const OrbitCanvas: React.FC<{ engine: OrbitEngine }> = ({ engine }) => {
  const { width, height } = useWindowDimensions();
  const cx = width / 2;
  const cy = height / 2;

  useEffect(() => {
    engine.setCenter(cx, cy);
  }, [cx, cy, engine]);

  // ---- Player orb ----
  const playerStyle = useAnimatedStyle(() => {
    const r = engine.radius.value;
    const x = cx + r * Math.cos(engine.theta.value);
    const y = cy + r * Math.sin(engine.theta.value);
    return {
      transform: [
        { translateX: x - ORB_SIZE / 2 },
        { translateY: y - ORB_SIZE / 2 },
      ],
    };
  });

  // ---- Trail orbs (ghosts) ----
  const trailStyles = TRAIL_SIZES.map((_, i) =>
    useAnimatedStyle(() => {
      const offset = GameGeometry.trailOffsets[i];
      const t = engine.theta.value - offset;
      const r = engine.radius.value;
      const x = cx + r * Math.cos(t);
      const y = cy + r * Math.sin(t);
      return {
        transform: [
          { translateX: x - TRAIL_SIZES[i] / 2 },
          { translateY: y - TRAIL_SIZES[i] / 2 },
        ],
        opacity: GameGeometry.trailOpacities[i],
      };
    }),
  );

  // ---- Near-miss plasma pulse ----
  const pulseStyle = useAnimatedStyle(() => {
    const scale = 1 + engine.nearMissPulse.value * 1.5;
    return {
      transform: [{ scale }],
      opacity: engine.nearMissPulse.value * 0.6,
    };
  });

  // ---- Hazards ----
  const hazardStyles = Array.from({ length: engine.hazardAngle.length }, (_, i) =>
    useAnimatedStyle(() => {
      const active = engine.hazardActive[i].value;
      if (!active) return { opacity: 0, transform: [{ translateX: -9999 }] };
      const r =
        engine.hazardTrack[i].value === 0
          ? GameGeometry.insideRadius
          : GameGeometry.outsideRadius;
      const x = cx + r * Math.cos(engine.hazardAngle[i].value);
      const y = cy + r * Math.sin(engine.hazardAngle[i].value);
      const color = engine.hazardTrack[i].value === 0 ? Colors.hazardInside : Colors.hazardOutside;
      return {
        transform: [
          { translateX: x - HAZARD_SIZE / 2 },
          { translateY: y - HAZARD_SIZE / 2 },
        ],
        opacity: 1,
        backgroundColor: color,
        shadowColor: color,
      };
    }),
  );

  // ---- Shards ----
  const shardStyles = Array.from({ length: engine.shardAngle.length }, (_, i) =>
    useAnimatedStyle(() => {
      const active = engine.shardActive[i].value;
      if (!active) return { opacity: 0, transform: [{ translateX: -9999 }] };
      const r =
        engine.shardTrack[i].value === 0
          ? GameGeometry.insideRadius
          : GameGeometry.outsideRadius;
      const x = cx + r * Math.cos(engine.shardAngle[i].value);
      const y = cy + r * Math.sin(engine.shardAngle[i].value);
      return {
        transform: [
          { translateX: x - SHARD_SIZE / 2 },
          { translateY: y - SHARD_SIZE / 2 },
        ],
        opacity: 1,
      };
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
      {/* Track ring (static SVG-like via nested views) */}
      <View
        style={[
          styles.ringBase,
          {
            width: GameGeometry.outsideRadius * 2,
            height: GameGeometry.outsideRadius * 2,
            borderRadius: GameGeometry.outsideRadius,
            left: cx - GameGeometry.outsideRadius,
            top: cy - GameGeometry.outsideRadius,
          },
        ]}
      />
      <View
        style={[
          styles.ringInner,
          {
            width: GameGeometry.insideRadius * 2,
            height: GameGeometry.insideRadius * 2,
            borderRadius: GameGeometry.insideRadius,
            left: cx - GameGeometry.insideRadius,
            top: cy - GameGeometry.insideRadius,
          },
        ]}
      />
      <View
        style={[
          styles.ringMid,
          {
            width: GameGeometry.baseRadius * 2,
            height: GameGeometry.baseRadius * 2,
            borderRadius: GameGeometry.baseRadius,
            left: cx - GameGeometry.baseRadius,
            top: cy - GameGeometry.baseRadius,
          },
        ]}
      />

      {/* Near-miss plasma pulse */}
      <Animated.View
        style={[
          styles.pulse,
          {
            width: GameGeometry.baseRadius * 2,
            height: GameGeometry.baseRadius * 2,
            borderRadius: GameGeometry.baseRadius,
            left: cx - GameGeometry.baseRadius,
            top: cy - GameGeometry.baseRadius,
          },
          pulseStyle,
        ]}
      />

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

      {/* Hazards */}
      {hazardStyles.map((s, i) => (
        <Animated.View
          key={`haz-${i}`}
          style={[
            styles.hazard,
            { width: HAZARD_SIZE, height: HAZARD_SIZE, borderRadius: HAZARD_SIZE / 2 },
            s,
          ]}
        />
      ))}

      {/* Shards */}
      {shardStyles.map((s, i) => (
        <Animated.View
          key={`shard-${i}`}
          style={[
            styles.shard,
            { width: SHARD_SIZE, height: SHARD_SIZE, borderRadius: SHARD_SIZE / 2 },
            s,
          ]}
        />
      ))}

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
  ringBase: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: Colors.trackRing,
    backgroundColor: 'transparent',
  },
  ringMid: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(22, 25, 38, 0.8)',
    backgroundColor: 'transparent',
  },
  ringInner: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: Colors.trackRing,
    backgroundColor: 'transparent',
  },
  pulse: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.nearMiss,
    backgroundColor: 'transparent',
    shadowColor: Colors.nearMiss,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    shadowOpacity: 0.8,
  },
  orb: {
    position: 'absolute',
    backgroundColor: Colors.playerCore,
    shadowColor: Colors.playerGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    shadowOpacity: 0.9,
    elevation: 6,
  },
  trail: {
    backgroundColor: Colors.playerCore,
    shadowRadius: 10,
    shadowOpacity: 0.5,
  },
  hazard: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    shadowOpacity: 0.9,
    elevation: 5,
  },
  shard: {
    position: 'absolute',
    backgroundColor: Colors.shard,
    shadowColor: Colors.shardGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.9,
    elevation: 4,
  },
});

export default OrbitCanvas;
