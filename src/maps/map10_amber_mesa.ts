import type { MapDefinition } from '../types';

export const MAP10_AMBER_MESA: MapDefinition = {
  id: 'map10_amber_mesa',
  name: 'Amber Mesa Fork',
  subtitle: 'Easy • Split-Channel Redrock',
  description:
    'Introduces route selection with an asymmetric fast/wide canyon fork, rhythmic washboard whoops, rough boulder scree, and a ridge split.',
  playable: true,
  difficulty: 'easy',
  biome: 'desert',
  medalsMs: {
    gold: 53000,
    silver: 63000,
    bronze: 77000,
  },
  stations: [
    // Sector 1: Redrock Opening & Dunes
    { pos: [0, 0, 20], canyonWidth: 30, wallHeight: 24, bankingDeg: 0, feature: 'normal' },
    { pos: [0, -2, -70], canyonWidth: 30, wallHeight: 26, bankingDeg: 0, feature: 'sand_dunes' },
    { pos: [-18, -4, -165], canyonWidth: 30, wallHeight: 28, bankingDeg: -8, feature: 'sand_dunes' },
    { pos: [-55, -6, -255], canyonWidth: 30, wallHeight: 28, bankingDeg: -10, feature: 'normal' },
    { pos: [-105, -6, -345], canyonWidth: 32, wallHeight: 30, bankingDeg: -6, feature: 'normal', checkpoint: true },

    // Sector 2: Asymmetric Canyon Fork (left narrow fast deck vs right wide canyon)
    { pos: [-155, -6, -435], canyonWidth: 46, wallHeight: 32, bankingDeg: 0, feature: 'asymmetric_fork' },
    { pos: [-200, -8, -525], canyonWidth: 46, wallHeight: 34, bankingDeg: 0, feature: 'asymmetric_fork' },
    { pos: [-240, -10, -615], canyonWidth: 46, wallHeight: 34, bankingDeg: 0, feature: 'asymmetric_fork' },
    { pos: [-270, -10, -710], canyonWidth: 46, wallHeight: 34, bankingDeg: 0, feature: 'asymmetric_fork' },
    { pos: [-280, -10, -805], canyonWidth: 30, wallHeight: 32, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 3: Washboard Whoops Straight
    { pos: [-270, -12, -900], canyonWidth: 28, wallHeight: 30, bankingDeg: 6, feature: 'whoops_section' },
    { pos: [-240, -14, -995], canyonWidth: 28, wallHeight: 30, bankingDeg: 8, feature: 'whoops_section' },
    { pos: [-195, -14, -1085], canyonWidth: 28, wallHeight: 30, bankingDeg: 10, feature: 'whoops_section' },
    { pos: [-140, -14, -1170], canyonWidth: 28, wallHeight: 30, bankingDeg: 6, feature: 'normal', checkpoint: true },

    // Sector 4: Rough Scree Wash & Twin Ridge
    { pos: [-80, -16, -1255], canyonWidth: 30, wallHeight: 32, bankingDeg: 0, feature: 'rough_scree' },
    { pos: [-20, -18, -1340], canyonWidth: 30, wallHeight: 32, bankingDeg: 0, feature: 'rough_scree' },
    { pos: [35, -18, -1430], canyonWidth: 34, wallHeight: 34, bankingDeg: 0, feature: 'ridge_split' },
    { pos: [85, -18, -1520], canyonWidth: 34, wallHeight: 34, bankingDeg: 0, feature: 'ridge_split' },
    { pos: [120, -18, -1615], canyonWidth: 28, wallHeight: 32, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 5: Mesa Step Jump
    { pos: [140, -14, -1710], canyonWidth: 26, wallHeight: 30, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [155, -36, -1805], canyonWidth: 30, wallHeight: 46, bankingDeg: 0, feature: 'chasm_floor' },
    { pos: [165, -28, -1900], canyonWidth: 30, wallHeight: 40, bankingDeg: 0, feature: 'landing_slope' },
    { pos: [165, -32, -1995], canyonWidth: 28, wallHeight: 36, bankingDeg: -8, feature: 'normal', checkpoint: true },

    // Sector 6: Amber Finish Basin
    { pos: [145, -38, -2095], canyonWidth: 28, wallHeight: 34, bankingDeg: -8, feature: 'normal' },
    { pos: [125, -44, -2195], canyonWidth: 28, wallHeight: 34, bankingDeg: 0, feature: 'normal' },
    { pos: [115, -46, -2295], canyonWidth: 30, wallHeight: 32, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [115, -46, -2395], canyonWidth: 32, wallHeight: 30, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
