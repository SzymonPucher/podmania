import type { MapDefinition } from '../types';

export const MAP12_COPPERHEAD_WHOOPS: MapDefinition = {
  id: 'map12_copperhead_whoops',
  name: 'Copperhead Badlands',
  subtitle: 'Medium • Silt Trench & Wreckage Wash',
  description:
    'Washboard whoops ripples, high-drag quicksand silt trenches with a weaving firm ribbon, podracer debris fields, and a tight bottleneck funnel.',
  playable: true,
  difficulty: 'medium',
  biome: 'badlands',
  medalsMs: {
    gold: 57000,
    silver: 67000,
    bronze: 82000,
  },
  stations: [
    // Sector 1: Badlands Washboard Launch
    { pos: [0, 0, 20], canyonWidth: 28, wallHeight: 24, bankingDeg: 0, feature: 'normal' },
    { pos: [0, -4, -75], canyonWidth: 28, wallHeight: 26, bankingDeg: 0, feature: 'whoops_section' },
    { pos: [15, -6, -170], canyonWidth: 28, wallHeight: 28, bankingDeg: 8, feature: 'whoops_section' },
    { pos: [55, -8, -260], canyonWidth: 28, wallHeight: 30, bankingDeg: 12, feature: 'whoops_section' },
    { pos: [115, -8, -340], canyonWidth: 28, wallHeight: 30, bankingDeg: 8, feature: 'normal', checkpoint: true },

    // Sector 2: Quicksand Silt Trench
    { pos: [185, -10, -410], canyonWidth: 34, wallHeight: 30, bankingDeg: 0, feature: 'silt_trench' },
    { pos: [255, -12, -485], canyonWidth: 34, wallHeight: 32, bankingDeg: 0, feature: 'silt_trench' },
    { pos: [315, -14, -565], canyonWidth: 34, wallHeight: 32, bankingDeg: -6, feature: 'silt_trench' },
    { pos: [350, -14, -655], canyonWidth: 34, wallHeight: 32, bankingDeg: -10, feature: 'silt_trench' },
    { pos: [355, -14, -755], canyonWidth: 28, wallHeight: 32, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 3: Wreckage Debris Field
    { pos: [335, -16, -850], canyonWidth: 34, wallHeight: 34, bankingDeg: -8, feature: 'debris_field' },
    { pos: [290, -18, -940], canyonWidth: 36, wallHeight: 34, bankingDeg: -10, feature: 'debris_field' },
    { pos: [230, -20, -1025], canyonWidth: 36, wallHeight: 34, bankingDeg: 8, feature: 'debris_field' },
    { pos: [175, -20, -1115], canyonWidth: 34, wallHeight: 34, bankingDeg: 10, feature: 'debris_field' },
    { pos: [135, -20, -1210], canyonWidth: 28, wallHeight: 32, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 4: Tabletop Mesa & S-Bend
    { pos: [110, -20, -1305], canyonWidth: 28, wallHeight: 30, bankingDeg: 0, feature: 'tabletop_jump' },
    { pos: [85, -20, -1405], canyonWidth: 28, wallHeight: 30, bankingDeg: 0, feature: 'tabletop_jump' },
    { pos: [45, -22, -1500], canyonWidth: 26, wallHeight: 32, bankingDeg: -12, feature: 'normal' },
    { pos: [-15, -24, -1585], canyonWidth: 26, wallHeight: 32, bankingDeg: 14, feature: 'normal' },
    { pos: [-60, -24, -1680], canyonWidth: 28, wallHeight: 32, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 5: Funnel Bottleneck Squeeze
    { pos: [-85, -26, -1775], canyonWidth: 56, wallHeight: 34, bankingDeg: 0, feature: 'funnel_squeeze' },
    { pos: [-105, -28, -1870], canyonWidth: 40, wallHeight: 34, bankingDeg: 0, feature: 'funnel_squeeze' },
    { pos: [-120, -30, -1965], canyonWidth: 26, wallHeight: 36, bankingDeg: 0, feature: 'funnel_squeeze' },
    { pos: [-130, -32, -2060], canyonWidth: 20, wallHeight: 38, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 6: Whoops & Steep Finish Chute
    { pos: [-135, -42, -2160], canyonWidth: 26, wallHeight: 36, bankingDeg: 0, feature: 'whoops_section' },
    { pos: [-135, -54, -2260], canyonWidth: 26, wallHeight: 36, bankingDeg: 0, feature: 'normal' },
    { pos: [-135, -58, -2360], canyonWidth: 28, wallHeight: 34, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [-135, -58, -2460], canyonWidth: 30, wallHeight: 32, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
