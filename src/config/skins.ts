/**
 * skins.ts — Player orb skin definitions for Orbit Rush.
 *
 * Skins are cosmetic color themes unlocked with shards. They give players
 * a visual progression goal and a way to spend accumulated shards.
 * The default 'cyan' skin is always available.
 */
export interface SkinDef {
  id: string;
  name: string;
  /** Core color (the orb body) */
  core: string;
  /** Glow color (shadow) */
  glow: string;
  /** Trail color */
  trail: string;
  /** Cost in shards to unlock (0 = free/default) */
  cost: number;
}

export const SKINS: SkinDef[] = [
  {
    id: 'cyan',
    name: 'Neon Cyan',
    core: '#00F0FF',
    glow: 'rgba(0, 240, 255, 0.8)',
    trail: 'rgba(0, 240, 255, 0.5)',
    cost: 0,
  },
  {
    id: 'magenta',
    name: 'Hot Magenta',
    core: '#FF00AA',
    glow: 'rgba(255, 0, 170, 0.8)',
    trail: 'rgba(255, 0, 170, 0.5)',
    cost: 50,
  },
  {
    id: 'lime',
    name: 'Toxic Lime',
    core: '#39FF14',
    glow: 'rgba(57, 255, 20, 0.8)',
    trail: 'rgba(57, 255, 20, 0.5)',
    cost: 100,
  },
  {
    id: 'gold',
    name: 'Solar Gold',
    core: '#FFD700',
    glow: 'rgba(255, 215, 0, 0.8)',
    trail: 'rgba(255, 215, 0, 0.5)',
    cost: 150,
  },
  {
    id: 'violet',
    name: 'Plasma Violet',
    core: '#A855F7',
    glow: 'rgba(168, 85, 247, 0.8)',
    trail: 'rgba(168, 85, 247, 0.5)',
    cost: 200,
  },
  {
    id: 'crimson',
    name: 'Crimson Pulse',
    core: '#FF3838',
    glow: 'rgba(255, 56, 56, 0.8)',
    trail: 'rgba(255, 56, 56, 0.5)',
    cost: 300,
  },
  {
    id: 'rainbow',
    name: 'Spectrum',
    core: '#FFFFFF',
    glow: 'rgba(255, 255, 255, 0.9)',
    trail: 'rgba(255, 255, 255, 0.5)',
    cost: 500,
  },
];

export function getSkinById(id: string): SkinDef {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}
