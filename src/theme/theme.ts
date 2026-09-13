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

  hazardLeft: '#FF0055',
  hazardRight: '#FF3366',
  hazardGlow: 'rgba(255, 0, 85, 0.7)',

  shard: '#FFE600',
  shardGlow: 'rgba(255, 230, 0, 0.8)',

  nearMiss: '#A855F7',
  nearMissGlow: 'rgba(168, 85, 247, 0.7)',

  laneLine: 'rgba(22, 25, 38, 0.6)',
  laneLineGlow: 'rgba(0, 240, 255, 0.08)',

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

/**
 * Game geometry constants for the 2-lane vertical runner.
 * The world scrolls downward toward the player; hazards/shards have fixed
 * worldY positions and are rendered at screenY = worldY - scrollOffset.
 */
export const GameGeometry = {
  /** Number of lanes (left=0, right=1). */
  laneCount: 2,
  /** Lane X positions as fractions of screen width. */
  laneXFractions: [0.33, 0.67],
  /** Player Y as fraction of screen height (fixed near bottom). */
  playerYFraction: 0.75,
  /** Vertical spacing between pattern rows in world-space pixels. */
  rowHeight: 120,
  /** Collision hitbox: |screenY - playerY| threshold in px. */
  collisionHitY: 28,
  /** Near-miss hitbox: |screenY - playerY| threshold in px. */
  nearMissHitY: 48,
  /** Shard pickup hitbox: |screenY - playerY| threshold in px. */
  shardHitY: 35,
  /** Starting scroll speed in px/s. */
  baseSpeed: 200,
  /** Maximum scroll speed in px/s. */
  maxSpeed: 680,
  /** Speed increase per 10s of survival (fractional). */
  speedStep: 0.05,
  /** Grace period (seconds) before first hazard spawns. */
  gracePeriod: 2.5,
  /** Gap between patterns in world-space px. */
  patternGap: 140,
  /** Trail orb Y offsets behind player in px. */
  trailOffsets: [20, 40, 60],
  /** Trail orb opacities matching trailOffsets. */
  trailOpacities: [0.5, 0.3, 0.15],
  /** Screen-shake magnitude (px). */
  shake: 6,
} as const;

export type Lane = 0 | 1;

export const Neon = {
  cyan: Colors.playerCore,
  crimson: Colors.hazardLeft,
  magenta: Colors.hazardRight,
  amber: Colors.shard,
  purple: Colors.nearMiss,
} as const;
