import type { MapDefinition } from '../types';

export const MAP17_REACTOR_GATES_LOOP: MapDefinition = {
  id: 'map17_reactor_gates_loop',
  name: 'Ion Conduit Ring',
  subtitle: 'Hard • 3-Lap Plasma Chicane Circuit',
  description:
    'Twilight starlight 3-lap circuit demanding high-speed threading through alternating energy gate chicanes, a double-decker straight, and neon half-pipes.',
  playable: true,
  difficulty: 'hard',
  biome: 'starlight',
  isLoop: true,
  laps: 3,
  medalsMs: {
    gold: 138000,
    silver: 162000,
    bronze: 195000,
  },
  stations: [
    // Start/Finish Straight (heading -Z at y=0)
    { pos: [0, 0, 0], canyonWidth: 30, wallHeight: 26, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [0, 0, -100], canyonWidth: 28, wallHeight: 26, bankingDeg: 0, feature: 'energy_gates' },
    { pos: [0, 0, -200], canyonWidth: 28, wallHeight: 26, bankingDeg: 0, feature: 'energy_gates' },
    { pos: [20, 2, -295], canyonWidth: 32, wallHeight: 30, bankingDeg: 20, feature: 'wallride_bowl' },
    { pos: [90, 4, -370], canyonWidth: 34, wallHeight: 32, bankingDeg: 28, feature: 'wallride_bowl' },
    { pos: [185, 6, -405], canyonWidth: 34, wallHeight: 32, bankingDeg: 24, feature: 'wallride_bowl', checkpoint: true },

    // East Double-Decker Viaduct
    { pos: [285, 6, -390], canyonWidth: 32, wallHeight: 28, bankingDeg: 8, feature: 'double_decker' },
    { pos: [375, 6, -335], canyonWidth: 32, wallHeight: 28, bankingDeg: 0, feature: 'double_decker' },
    { pos: [445, 6, -255], canyonWidth: 32, wallHeight: 28, bankingDeg: 0, feature: 'double_decker' },
    { pos: [485, 4, -160], canyonWidth: 32, wallHeight: 28, bankingDeg: 0, feature: 'double_decker' },
    { pos: [500, 2, -60], canyonWidth: 30, wallHeight: 26, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Funnel Bottleneck into S-Bend Half-Pipe
    { pos: [495, 2, 40], canyonWidth: 54, wallHeight: 28, bankingDeg: 0, feature: 'funnel_squeeze' },
    { pos: [475, 2, 135], canyonWidth: 36, wallHeight: 28, bankingDeg: 0, feature: 'funnel_squeeze' },
    { pos: [435, 2, 225], canyonWidth: 24, wallHeight: 30, bankingDeg: 14, feature: 'half_pipe' },
    { pos: [365, 2, 300], canyonWidth: 30, wallHeight: 30, bankingDeg: 16, feature: 'half_pipe' },
    { pos: [275, 2, 345], canyonWidth: 30, wallHeight: 30, bankingDeg: -12, feature: 'half_pipe' },
    { pos: [185, 2, 370], canyonWidth: 30, wallHeight: 30, bankingDeg: 16, feature: 'half_pipe', checkpoint: true },

    // Final Energy Gate Corridor back to Start/Finish
    { pos: [95, 2, 345], canyonWidth: 28, wallHeight: 28, bankingDeg: 16, feature: 'normal' },
    { pos: [25, 1, 280], canyonWidth: 28, wallHeight: 26, bankingDeg: 12, feature: 'energy_gates' },
    { pos: [0, 0, 190], canyonWidth: 28, wallHeight: 26, bankingDeg: 0, feature: 'energy_gates' },
    { pos: [0, 0, 95], canyonWidth: 30, wallHeight: 26, bankingDeg: 0, feature: 'finish_basin', checkpoint: true },
  ],
};
