/**
 * patterns.ts — Procedural pattern templates for the 2-lane runner.
 *
 * Each pattern is a grid of rows × lanes. Cell values:
 *   0 = empty
 *   1 = hazard
 *   2 = shard
 *
 * Patterns are designed so the player can ALWAYS dodge by toggling at the
 * right time — every row with a hazard has at least one safe lane.
 *
 * Patterns spawn at the top of the screen and scroll downward. The engine
 * picks the next pattern randomly, filtered by the current scroll speed so
 * that harder patterns only appear as the game speeds up.
 *
 * Difficulty tiers:
 *   - Tier 0 (easy):   available from speed 0.   Spacious, single hazards.
 *   - Tier 1 (medium): available from speed 300.  Tighter spacing, some shards.
 *   - Tier 2 (hard):   available from speed 420.  Dense, rapid toggling.
 *   - Tier 3 (expert): available from speed 540.  Very dense, no breathing room.
 */

export type Cell = 0 | 1 | 2;
export type Pattern = {
  name: string;
  /** rows top-to-bottom; each row is [leftLane, rightLane]. */
  rows: Cell[][];
  /** Minimum speed (px/s) at which this pattern can spawn. */
  minSpeed?: number;
};

export const PATTERNS: Pattern[] = [
  // ===== Tier 0: Easy (available from start) =====

  // Gentle: single hazard with lots of space
  {
    name: 'gentle',
    rows: [
      [1, 0],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 1],
      [0, 0],
      [0, 0],
    ],
  },

  // Free shards: no hazards, just collect
  {
    name: 'freeShards',
    rows: [
      [2, 0],
      [0, 2],
      [0, 0],
      [2, 0],
      [0, 2],
    ],
  },

  // Single toggle: one hazard, easy to dodge
  {
    name: 'singleToggle',
    rows: [
      [0, 0],
      [0, 0],
      [1, 0],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 1],
      [0, 0],
    ],
  },

  // ===== Tier 1: Medium (speed >= 300) =====

  // Zigzag: hazards alternate lanes, forcing rhythmic toggling
  {
    name: 'zigzag',
    rows: [
      [1, 0],
      [0, 0],
      [0, 1],
      [0, 0],
      [1, 0],
      [0, 0],
      [0, 1],
    ],
    minSpeed: 300,
  },

  // Alternating: single hazards with shard rows between
  {
    name: 'alternating',
    rows: [
      [1, 0],
      [2, 2],
      [0, 1],
      [0, 0],
      [1, 0],
      [2, 2],
      [0, 1],
    ],
    minSpeed: 300,
  },

  // Diamond: shard cluster with hazards on edges
  {
    name: 'diamond',
    rows: [
      [0, 2],
      [2, 0],
      [1, 1],
      [2, 0],
      [0, 2],
    ],
    minSpeed: 300,
  },

  // Corridor: long safe stretch with shards, then a hazard wall
  {
    name: 'corridor',
    rows: [
      [2, 2],
      [2, 2],
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    minSpeed: 300,
  },

  // ===== Tier 2: Hard (speed >= 420) =====

  // Wall gap: both lanes blocked except one gap
  {
    name: 'wallGap',
    rows: [
      [1, 1],
      [1, 0],
      [1, 1],
      [1, 1],
      [0, 1],
      [1, 1],
    ],
    minSpeed: 420,
  },

  // Tunnel: narrow safe path that shifts lanes
  {
    name: 'tunnel',
    rows: [
      [1, 0],
      [1, 0],
      [1, 0],
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    minSpeed: 420,
  },

  // Double hazard: both lanes blocked at different rows
  {
    name: 'doubleHazard',
    rows: [
      [1, 0],
      [0, 1],
      [0, 0],
      [1, 0],
      [0, 1],
    ],
    minSpeed: 420,
  },

  // ===== Tier 3: Expert (speed >= 540) =====

  // Pulse: rapid alternating hazards (hard)
  {
    name: 'pulse',
    rows: [
      [1, 0],
      [0, 1],
      [1, 0],
      [0, 1],
      [1, 0],
      [0, 1],
    ],
    minSpeed: 540,
  },
];

/**
 * Pick a random pattern appropriate for the current scroll speed.
 * Patterns with minSpeed > currentSpeed are filtered out.
 */
export function pickPattern(currentSpeed: number): Pattern {
  'worklet';
  const available = PATTERNS.filter(
    (p) => !p.minSpeed || currentSpeed >= p.minSpeed,
  );
  const pool = available.length > 0 ? available : PATTERNS;
  return pool[Math.floor(Math.random() * pool.length)];
}
