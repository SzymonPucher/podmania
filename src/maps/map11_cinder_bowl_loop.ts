import type { MapDefinition } from '../types';

export const MAP11_CINDER_BOWL_LOOP: MapDefinition = {
  id: 'map11_cinder_bowl_loop',
  name: 'Cinder Velodrome',
  subtitle: 'Medium • 3-Lap Volcanic Wallride Loop',
  description:
    'High-speed 3-lap basalt stadium circuit built around two towering wallride bowls, a central ridge split, rough volcanic scree, and a four-step cascade.',
  playable: true,
  difficulty: 'medium',
  biome: 'volcanic',
  isLoop: true,
  laps: 3,
  medalsMs: {
    gold: 128000,
    silver: 149000,
    bronze: 180000,
  },
  stations: [
    // Start/Finish Straight (heading -Z at y=0)
    { pos: [0, 0, 0], canyonWidth: 30, wallHeight: 30, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [0, 0, -100], canyonWidth: 30, wallHeight: 30, bankingDeg: 0, feature: 'normal' },
    { pos: [18, 2, -200], canyonWidth: 32, wallHeight: 34, bankingDeg: 18, feature: 'wallride_bowl' },
    { pos: [85, 6, -285], canyonWidth: 34, wallHeight: 36, bankingDeg: 28, feature: 'wallride_bowl' },
    { pos: [180, 10, -330], canyonWidth: 34, wallHeight: 36, bankingDeg: 28, feature: 'wallride_bowl' },
    { pos: [280, 12, -315], canyonWidth: 32, wallHeight: 34, bankingDeg: 18, feature: 'wallride_bowl', checkpoint: true },

    // Backstretch Ridge Split & Scree
    { pos: [365, 14, -250], canyonWidth: 34, wallHeight: 36, bankingDeg: 8, feature: 'ridge_split' },
    { pos: [425, 16, -160], canyonWidth: 36, wallHeight: 38, bankingDeg: 0, feature: 'ridge_split' },
    { pos: [455, 18, -60], canyonWidth: 36, wallHeight: 38, bankingDeg: 0, feature: 'ridge_split' },
    { pos: [460, 18, 45], canyonWidth: 30, wallHeight: 36, bankingDeg: 0, feature: 'rough_scree' },
    { pos: [445, 18, 145], canyonWidth: 30, wallHeight: 36, bankingDeg: 6, feature: 'rough_scree', checkpoint: true },

    // South Wallride Bowl & Climb
    { pos: [400, 18, 240], canyonWidth: 34, wallHeight: 38, bankingDeg: 24, feature: 'wallride_bowl' },
    { pos: [320, 18, 310], canyonWidth: 34, wallHeight: 38, bankingDeg: 30, feature: 'wallride_bowl' },
    { pos: [220, 18, 340], canyonWidth: 34, wallHeight: 38, bankingDeg: 26, feature: 'wallride_bowl' },
    { pos: [125, 16, 320], canyonWidth: 30, wallHeight: 36, bankingDeg: 14, feature: 'double_apex', checkpoint: true },

    // Stepped Lava-Rock Cascade back down to y=0 Start/Finish
    { pos: [50, 14, 265], canyonWidth: 28, wallHeight: 34, bankingDeg: 12, feature: 'double_apex' },
    { pos: [10, 12, 195], canyonWidth: 28, wallHeight: 32, bankingDeg: 4, feature: 'stepped_cascade' },
    { pos: [0, 6, 130], canyonWidth: 28, wallHeight: 30, bankingDeg: 0, feature: 'stepped_cascade' },
    { pos: [0, 2, 65], canyonWidth: 30, wallHeight: 30, bankingDeg: 0, feature: 'stepped_cascade', checkpoint: true },
  ],
};
