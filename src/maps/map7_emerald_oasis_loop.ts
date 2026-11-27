import type { MapDefinition } from '../types';

export const MAP7_EMERALD_OASIS_LOOP: MapDefinition = {
  id: 'map7_emerald_oasis_loop',
  name: 'Oasis Mirage Circuit',
  subtitle: 'Easy • 3-Lap Desert Oasis Loop',
  description:
    'Flowing 3-lap desert-geode circuit featuring a wide double-apex sweeper, cooling oasis river ford, half-pipe trough, and rolling dunes.',
  playable: true,
  difficulty: 'easy',
  biome: 'desert_geode',
  isLoop: true,
  laps: 3,
  medalsMs: {
    gold: 108000,
    silver: 126000,
    bronze: 152000,
  },
  stations: [
    // Start/Finish Straight (heading -Z around x=0)
    { pos: [0, 0, 0], canyonWidth: 32, wallHeight: 24, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [0, 0, -95], canyonWidth: 32, wallHeight: 24, bankingDeg: 0, feature: 'normal' },
    { pos: [15, -2, -190], canyonWidth: 32, wallHeight: 26, bankingDeg: 8, feature: 'double_apex' },
    { pos: [65, -4, -275], canyonWidth: 32, wallHeight: 28, bankingDeg: 14, feature: 'double_apex' },
    { pos: [140, -4, -330], canyonWidth: 32, wallHeight: 28, bankingDeg: 10, feature: 'double_apex', checkpoint: true },

    // Second Apex & Oasis Water Ford
    { pos: [230, -4, -350], canyonWidth: 32, wallHeight: 28, bankingDeg: 14, feature: 'double_apex' },
    { pos: [315, -4, -315], canyonWidth: 34, wallHeight: 24, bankingDeg: 10, feature: 'water_ford' },
    { pos: [380, -4, -245], canyonWidth: 34, wallHeight: 24, bankingDeg: 6, feature: 'water_ford' },
    { pos: [415, -2, -155], canyonWidth: 32, wallHeight: 26, bankingDeg: 8, feature: 'normal' },
    { pos: [425, 0, -55], canyonWidth: 32, wallHeight: 26, bankingDeg: 6, feature: 'tabletop_jump', checkpoint: true },

    // Backstretch Tabletop & Half-Pipe
    { pos: [420, 0, 45], canyonWidth: 32, wallHeight: 26, bankingDeg: 0, feature: 'tabletop_jump' },
    { pos: [395, 0, 140], canyonWidth: 32, wallHeight: 28, bankingDeg: 8, feature: 'half_pipe' },
    { pos: [345, 2, 225], canyonWidth: 32, wallHeight: 28, bankingDeg: 12, feature: 'half_pipe' },
    { pos: [270, 2, 290], canyonWidth: 32, wallHeight: 28, bankingDeg: 12, feature: 'half_pipe' },
    { pos: [180, 2, 320], canyonWidth: 30, wallHeight: 26, bankingDeg: 8, feature: 'normal', checkpoint: true },

    // Final Dune Sweeper back to Start/Finish
    { pos: [90, 2, 305], canyonWidth: 32, wallHeight: 24, bankingDeg: 10, feature: 'sand_dunes' },
    { pos: [25, 1, 250], canyonWidth: 32, wallHeight: 24, bankingDeg: 12, feature: 'sand_dunes' },
    { pos: [-5, 0, 175], canyonWidth: 32, wallHeight: 24, bankingDeg: 6, feature: 'normal' },
    { pos: [0, 0, 90], canyonWidth: 32, wallHeight: 24, bankingDeg: 0, feature: 'finish_basin', checkpoint: true },
  ],
};
