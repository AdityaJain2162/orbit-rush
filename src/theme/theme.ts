/**
 * Orbit Rush — Global Theme
 * High-Contrast Cyberpunk Neon palette + open-source font tokens.
 *
 * Fonts:
 *  - Orbitron (SIL Open Font License) — headers & numeric displays
 *  - Rajdhani  (SIL Open Font License) — HUD & secondary text
 *
 * NOTE: Keep this file free of runtime side-effects. It is imported by both
 * the game engine (UI thread) and React components (JS thread).
 */

export const Colors = {
  void: '#08090E',
  trackRing: '#161926',
  trackRingGlow: 'rgba(22, 25, 38, 0.6)',

  playerCore: '#00F0FF',
  playerGlow: 'rgba(0, 240, 255, 0.8)',
  playerTrail: 'rgba(0, 240, 255, 0.5)',

  hazardInside: '#FF0055',
  hazardOutside: '#FF3366',
  hazardGlow: 'rgba(255, 0, 85, 0.7)',

  shard: '#FFE600',
  shardGlow: 'rgba(255, 230, 0, 0.8)',

  nearMiss: '#A855F7',
  nearMissGlow: 'rgba(168, 85, 247, 0.7)',

  glass: 'rgba(22, 25, 38, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  textPrimary: '#F5F7FF',
  textMuted: 'rgba(245, 247, 255, 0.6)',
} as const;

export const Fonts = {
  OrbitronBold: 'Orbitron_700Bold',
  OrbitronBlack: 'Orbitron_900Black',
  RajdhaniSemiBold: 'Rajdhani_600SemiBold',
  RajdhaniBold: 'Rajdhani_700Bold',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

/** Game geometry constants — kept in theme so UI & engine stay in sync. */
export const GameGeometry = {
  baseRadius: 115,
  trackOffset: 26,
  get insideRadius() {
    return this.baseRadius - this.trackOffset;
  },
  get outsideRadius() {
    return this.baseRadius + this.trackOffset;
  },
  /** Angular hitbox for collision (radians). 8° */
  collisionHit: (8 * Math.PI) / 180,
  /** Angular hitbox for near-miss (radians). 14° */
  nearMissHit: (14 * Math.PI) / 180,
  /** Minimum angular gap between hazards (radians). 60° */
  minHazardGap: (60 * Math.PI) / 180,
  /** Starting angular velocity (rad/s). */
  baseOmega: 2.4,
  /** Maximum angular velocity (rad/s). */
  maxOmega: 4.5,
  /** Fractional omega increase per 10s of survival. */
  omegaStep: 0.05,
  /** Trail orb angular offsets (radians) behind the player. */
  trailOffsets: [
    (5 * Math.PI) / 180,
    (10 * Math.PI) / 180,
    (15 * Math.PI) / 180,
  ],
  /** Trail orb opacities matching trailOffsets. */
  trailOpacities: [0.5, 0.3, 0.15],
  /** Screen-shake magnitude (px). */
  shake: 6,
} as const;

export type Track = 'inside' | 'outside';

export const Neon = {
  cyan: Colors.playerCore,
  crimson: Colors.hazardInside,
  magenta: Colors.hazardOutside,
  amber: Colors.shard,
  purple: Colors.nearMiss,
} as const;
