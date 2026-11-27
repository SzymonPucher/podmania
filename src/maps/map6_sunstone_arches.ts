import type { MapDefinition } from '../types';

export const MAP6_SUNSTONE_ARCHES: MapDefinition = {
  id: 'map6_sunstone_arches',
  name: 'Sunstone Arches',
  subtitle: 'Easy • Sandstone Arch Valley',
  description:
    'Wide sunlit canyon spanned by natural sandstone arches, cooling river fords, a smooth half-pipe trough, and tabletop mesa ramps.',
  playable: true,
  difficulty: 'easy',
  biome: 'desert',
  medalsMs: {
    gold: 48000,
    silver: 57000,
    bronze: 70000,
  },
  stations: [
    // Sector 1: Archway Promenade
    { pos: [0, 0, 20], canyonWidth: 32, wallHeight: 22, bankingDeg: 0, feature: 'normal' },
    { pos: [0, 0, -70], canyonWidth: 32, wallHeight: 24, bankingDeg: 0, feature: 'rock_arch_sequence' },
    { pos: [10, -2, -165], canyonWidth: 30, wallHeight: 26, bankingDeg: 6, feature: 'rock_arch_sequence' },
    { pos: [42, -4, -255], canyonWidth: 30, wallHeight: 26, bankingDeg: 10, feature: 'rock_arch_sequence' },
    { pos: [95, -4, -340], canyonWidth: 30, wallHeight: 26, bankingDeg: 8, feature: 'normal', checkpoint: true },

    // Sector 2: Oasis Meltwater Ford
    { pos: [155, -6, -415], canyonWidth: 34, wallHeight: 22, bankingDeg: 0, feature: 'water_ford' },
    { pos: [215, -6, -495], canyonWidth: 34, wallHeight: 22, bankingDeg: 0, feature: 'water_ford' },
    { pos: [265, -6, -580], canyonWidth: 32, wallHeight: 24, bankingDeg: -8, feature: 'water_ford' },
    { pos: [290, -6, -675], canyonWidth: 30, wallHeight: 26, bankingDeg: -10, feature: 'normal', checkpoint: true },

    // Sector 3: Sandstone Half-Pipe
    { pos: [285, -8, -775], canyonWidth: 32, wallHeight: 28, bankingDeg: 0, feature: 'half_pipe' },
    { pos: [255, -10, -870], canyonWidth: 32, wallHeight: 28, bankingDeg: 8, feature: 'half_pipe' },
    { pos: [205, -12, -960], canyonWidth: 32, wallHeight: 28, bankingDeg: 10, feature: 'half_pipe' },
    { pos: [145, -12, -1045], canyonWidth: 32, wallHeight: 28, bankingDeg: 6, feature: 'half_pipe' },
    { pos: [85, -12, -1130], canyonWidth: 30, wallHeight: 26, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 4: Sunlit Tabletop Mesa
    { pos: [35, -12, -1220], canyonWidth: 30, wallHeight: 24, bankingDeg: 0, feature: 'tabletop_jump' },
    { pos: [-10, -12, -1315], canyonWidth: 30, wallHeight: 24, bankingDeg: 0, feature: 'tabletop_jump' },
    { pos: [-55, -12, -1410], canyonWidth: 30, wallHeight: 24, bankingDeg: 0, feature: 'tabletop_jump' },
    { pos: [-95, -14, -1505], canyonWidth: 30, wallHeight: 26, bankingDeg: -8, feature: 'normal', checkpoint: true },

    // Sector 5: Canyon Return & Arch Sprint
    { pos: [-115, -16, -1600], canyonWidth: 30, wallHeight: 28, bankingDeg: -12, feature: 'rock_arch_sequence' },
    { pos: [-105, -18, -1700], canyonWidth: 30, wallHeight: 28, bankingDeg: -8, feature: 'rock_arch_sequence' },
    { pos: [-75, -20, -1795], canyonWidth: 30, wallHeight: 26, bankingDeg: 8, feature: 'rock_arch_sequence' },
    { pos: [-40, -22, -1890], canyonWidth: 30, wallHeight: 26, bankingDeg: 6, feature: 'normal', checkpoint: true },

    // Sector 6: Wide Finish Basin
    { pos: [-15, -24, -1990], canyonWidth: 32, wallHeight: 24, bankingDeg: 0, feature: 'water_ford' },
    { pos: [-5, -24, -2090], canyonWidth: 32, wallHeight: 24, bankingDeg: 0, feature: 'normal' },
    { pos: [0, -24, -2190], canyonWidth: 32, wallHeight: 22, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [0, -24, -2290], canyonWidth: 34, wallHeight: 22, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
