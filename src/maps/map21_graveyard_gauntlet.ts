import type { MapDefinition } from '../types';

export const MAP21_GRAVEYARD_GAUNTLET: MapDefinition = {
  id: 'map21_graveyard_gauntlet',
  name: 'Pod Graveyard Gauntlet',
  subtitle: 'Expert • Wreckage, Silt & Off-Camber',
  description:
    'Relentless technical badlands littered with wrecked turbines, deep quicksand silt, reverse-banked shale hairpins, and a razor-thin bottleneck squeeze.',
  playable: true,
  difficulty: 'expert',
  biome: 'badlands',
  medalsMs: {
    gold: 75000,
    silver: 89000,
    bronze: 108000,
  },
  stations: [
    // Sector 1: Turbine Wreckage Alley
    { pos: [0, 0, 20], canyonWidth: 30, wallHeight: 28, bankingDeg: 0, feature: 'normal' },
    { pos: [0, -4, -75], canyonWidth: 32, wallHeight: 30, bankingDeg: 0, feature: 'debris_field' },
    { pos: [-20, -8, -170], canyonWidth: 32, wallHeight: 32, bankingDeg: -8, feature: 'debris_field' },
    { pos: [-65, -10, -260], canyonWidth: 32, wallHeight: 32, bankingDeg: -12, feature: 'debris_field' },
    { pos: [-125, -12, -340], canyonWidth: 32, wallHeight: 32, bankingDeg: -10, feature: 'debris_field' },
    { pos: [-185, -12, -420], canyonWidth: 26, wallHeight: 34, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 2: Reverse-Camber Shale Serpentine
    { pos: [-240, -14, -505], canyonWidth: 24, wallHeight: 34, bankingDeg: 10, feature: 'off_camber' },
    { pos: [-275, -16, -595], canyonWidth: 23, wallHeight: 36, bankingDeg: 12, feature: 'off_camber' },
    { pos: [-270, -18, -695], canyonWidth: 23, wallHeight: 36, bankingDeg: -10, feature: 'off_camber' },
    { pos: [-225, -20, -785], canyonWidth: 24, wallHeight: 36, bankingDeg: -12, feature: 'off_camber' },
    { pos: [-165, -20, -865], canyonWidth: 26, wallHeight: 36, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 3: Quicksand Silt & Whoops Wash
    { pos: [-100, -22, -945], canyonWidth: 34, wallHeight: 34, bankingDeg: 0, feature: 'silt_trench' },
    { pos: [-35, -24, -1025], canyonWidth: 34, wallHeight: 34, bankingDeg: 0, feature: 'silt_trench' },
    { pos: [30, -26, -1105], canyonWidth: 34, wallHeight: 34, bankingDeg: 0, feature: 'silt_trench' },
    { pos: [90, -28, -1190], canyonWidth: 26, wallHeight: 34, bankingDeg: 8, feature: 'whoops_section' },
    { pos: [145, -30, -1280], canyonWidth: 26, wallHeight: 34, bankingDeg: 10, feature: 'whoops_section' },
    { pos: [185, -30, -1375], canyonWidth: 26, wallHeight: 36, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 4: Stalactite Overhang Hairpin
    { pos: [205, -32, -1470], canyonWidth: 21, wallHeight: 34, bankingDeg: -12, feature: 'stalactite_corridor' },
    { pos: [195, -34, -1565], canyonWidth: 20, wallHeight: 34, bankingDeg: -16, feature: 'stalactite_corridor' },
    { pos: [145, -36, -1650], canyonWidth: 20, wallHeight: 34, bankingDeg: -16, feature: 'stalactite_corridor' },
    { pos: [75, -36, -1715], canyonWidth: 22, wallHeight: 34, bankingDeg: -8, feature: 'stalactite_corridor' },
    { pos: [5, -36, -1780], canyonWidth: 26, wallHeight: 36, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 5: Funnel Bottleneck into Second Debris Field
    { pos: [-60, -38, -1855], canyonWidth: 58, wallHeight: 36, bankingDeg: 0, feature: 'funnel_squeeze' },
    { pos: [-120, -40, -1935], canyonWidth: 38, wallHeight: 36, bankingDeg: 0, feature: 'funnel_squeeze' },
    { pos: [-175, -42, -2020], canyonWidth: 19, wallHeight: 38, bankingDeg: 0, feature: 'rough_scree' },
    { pos: [-220, -44, -2110], canyonWidth: 32, wallHeight: 36, bankingDeg: 0, feature: 'debris_field' },
    { pos: [-255, -46, -2205], canyonWidth: 32, wallHeight: 36, bankingDeg: 0, feature: 'debris_field', checkpoint: true },

    // Sector 6: Steep Badlands Finish Dive
    { pos: [-280, -60, -2305], canyonWidth: 26, wallHeight: 38, bankingDeg: 0, feature: 'normal' },
    { pos: [-295, -74, -2405], canyonWidth: 26, wallHeight: 38, bankingDeg: 0, feature: 'normal' },
    { pos: [-300, -80, -2505], canyonWidth: 28, wallHeight: 36, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [-300, -80, -2605], canyonWidth: 30, wallHeight: 34, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
