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
 * picks the next pattern randomly (weighted by difficulty).
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
  // ---- Zigzag: hazards alternate lanes, forcing rhythmic toggling ----
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
  },

  // ---- Wall gap: both lanes blocked except one gap ----
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
    minSpeed: 380,
  },

  // ---- Alternating: single hazards with shard rows between ----
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
  },

  // ---- Tunnel: narrow safe path that shifts lanes ----
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
    minSpeed: 400,
  },

  // ---- Diamond: shard cluster with hazards on edges ----
  {
    name: 'diamond',
    rows: [
      [0, 2],
      [2, 0],
      [1, 1],
      [2, 0],
      [0, 2],
    ],
  },

  // ---- Double hazard: both lanes blocked at different rows ----
  {
    name: 'doubleHazard',
    rows: [
      [1, 0],
      [0, 1],
      [0, 0],
      [1, 0],
      [0, 1],
    ],
    minSpeed: 360,
  },

  // ---- Corridor: long safe stretch with shards, then a hazard wall ----
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
  },

  // ---- Pulse: rapid alternating hazards (hard) ----
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
    minSpeed: 450,
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
