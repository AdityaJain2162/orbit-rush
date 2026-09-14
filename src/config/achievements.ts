/**
 * achievements.ts — Achievement definitions for Orbit Rush.
 *
 * Achievements are permanent milestones that give players long-term goals.
 * They unlock based on lifetime stats (total runs, total shards, high score).
 * Each achievement grants a shard reward to the wallet.
 */
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Stat key to check */
  stat: 'highScore' | 'totalRuns' | 'totalShards' | 'singleRunShards' | 'singleRunScore';
  /** Threshold value to unlock */
  threshold: number;
  /** Shard reward granted on unlock */
  reward: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_run',
    name: 'First Launch',
    description: 'Complete your first run',
    icon: '🚀',
    stat: 'totalRuns',
    threshold: 1,
    reward: 10,
  },
  {
    id: 'score_200',
    name: 'Getting Started',
    description: 'Score 200 in a single run',
    icon: '⭐',
    stat: 'singleRunScore',
    threshold: 200,
    reward: 15,
  },
  {
    id: 'score_500',
    name: 'Orbit Cadet',
    description: 'Score 500 in a single run',
    icon: '🌟',
    stat: 'singleRunScore',
    threshold: 500,
    reward: 25,
  },
  {
    id: 'score_1000',
    name: 'Orbit Master',
    description: 'Score 1000 in a single run',
    icon: '💫',
    stat: 'singleRunScore',
    threshold: 1000,
    reward: 50,
  },
  {
    id: 'score_2000',
    name: 'Neon Legend',
    description: 'Score 2000 in a single run',
    icon: '👑',
    stat: 'singleRunScore',
    threshold: 2000,
    reward: 100,
  },
  {
    id: 'runs_10',
    name: 'Persistent',
    description: 'Complete 10 runs',
    icon: '🔄',
    stat: 'totalRuns',
    threshold: 10,
    reward: 20,
  },
  {
    id: 'runs_50',
    name: 'Dedicated',
    description: 'Complete 50 runs',
    icon: '⚡',
    stat: 'totalRuns',
    threshold: 50,
    reward: 50,
  },
  {
    id: 'runs_100',
    name: 'Orbit Addict',
    description: 'Complete 100 runs',
    icon: '🔥',
    stat: 'totalRuns',
    threshold: 100,
    reward: 100,
  },
  {
    id: 'shards_50',
    name: 'Collector',
    description: 'Collect 50 shards total',
    icon: '💎',
    stat: 'totalShards',
    threshold: 50,
    reward: 20,
  },
  {
    id: 'shards_200',
    name: 'Shard Hoarder',
    description: 'Collect 200 shards total',
    icon: '💰',
    stat: 'totalShards',
    threshold: 200,
    reward: 50,
  },
  {
    id: 'shards_500',
    name: 'Crystal Tycoon',
    description: 'Collect 500 shards total',
    icon: '🏆',
    stat: 'totalShards',
    threshold: 500,
    reward: 100,
  },
  {
    id: 'run_shards_25',
    name: 'Shard Magnet',
    description: 'Collect 25 shards in a single run',
    icon: '🧲',
    stat: 'singleRunShards',
    threshold: 25,
    reward: 30,
  },
];

/**
 * Check which achievements should be unlocked based on current stats.
 * Returns newly unlocked achievement IDs.
 */
export function checkAchievements(
  unlocked: string[],
  stats: {
    highScore: number;
    totalRuns: number;
    totalShards: number;
    singleRunShards: number;
    singleRunScore: number;
  },
): AchievementDef[] {
  const newlyUnlocked: AchievementDef[] = [];
  for (const ach of ACHIEVEMENTS) {
    if (unlocked.includes(ach.id)) continue;
    const value = stats[ach.stat];
    if (value >= ach.threshold) {
      newlyUnlocked.push(ach);
    }
  }
  return newlyUnlocked;
}
