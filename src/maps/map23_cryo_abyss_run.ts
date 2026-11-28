import type { MapDefinition } from '../types';

export const MAP23_CRYO_ABYSS_RUN: MapDefinition = {
  id: 'map23_cryo_abyss_run',
  name: 'Subzero Crevasse',
  subtitle: 'Expert • Ice Bridges & Void Chasms',
  description:
    'Razor-thin crumbling ice bridges above bottomless crevasses, reverse-banked glacial shelves, low icicle ceilings, and a sheer cliff plunge.',
  playable: true,
  difficulty: 'expert',
  biome: 'glacier',
  medalsMs: {
    gold: 76000,
    silver: 89000,
    bronze: 109000,
  },
  stations: [
    // Sector 1: Crumbling Ice Causeway
    { pos: [0, 0, 20], canyonWidth: 26, wallHeight: 22, bankingDeg: 0, feature: 'normal' },
    { pos: [0, -8, -75], canyonWidth: 25, wallHeight: 14, bankingDeg: 0, feature: 'crumbling_bridge' },
    { pos: [0, -16, -170], canyonWidth: 25, wallHeight: 14, bankingDeg: 0, feature: 'crumbling_bridge' },
    { pos: [15, -20, -265], canyonWidth: 25, wallHeight: 14, bankingDeg: 6, feature: 'crumbling_bridge' },
    { pos: [50, -22, -355], canyonWidth: 26, wallHeight: 30, bankingDeg: 10, feature: 'normal', checkpoint: true },

    // Sector 2: Asymmetric Glacial Fork & Off-Camber Curves
    { pos: [105, -24, -440], canyonWidth: 46, wallHeight: 34, bankingDeg: 0, feature: 'asymmetric_fork' },
    { pos: [165, -26, -520], canyonWidth: 46, wallHeight: 34, bankingDeg: 0, feature: 'asymmetric_fork' },
    { pos: [225, -28, -600], canyonWidth: 46, wallHeight: 34, bankingDeg: 0, feature: 'asymmetric_fork' },
    { pos: [275, -30, -685], canyonWidth: 24, wallHeight: 34, bankingDeg: -10, feature: 'off_camber' },
    { pos: [300, -32, -780], canyonWidth: 24, wallHeight: 34, bankingDeg: -12, feature: 'off_camber' },
    { pos: [290, -32, -880], canyonWidth: 26, wallHeight: 34, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 3: Steep Ice Run-Up & Crevasse Void Jump
    { pos: [265, -46, -975], canyonWidth: 25, wallHeight: 34, bankingDeg: 0, feature: 'normal' },
    { pos: [240, -60, -1070], canyonWidth: 25, wallHeight: 34, bankingDeg: 0, feature: 'normal' },
    { pos: [220, -55, -1140], canyonWidth: 25, wallHeight: 28, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [205, -60, -1195], canyonWidth: 28, wallHeight: 14, bankingDeg: 0, feature: 'void_gap', voidGapLengthM: 88 },
    { pos: [190, -70, -1255], canyonWidth: 30, wallHeight: 34, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 4:Hanging Icicle Stalactite Corridor
    { pos: [160, -74, -1350], canyonWidth: 21, wallHeight: 34, bankingDeg: -12, feature: 'stalactite_corridor' },
    { pos: [110, -76, -1435], canyonWidth: 20, wallHeight: 34, bankingDeg: -16, feature: 'stalactite_corridor' },
    { pos: [40, -78, -1505], canyonWidth: 20, wallHeight: 34, bankingDeg: -14, feature: 'stalactite_corridor' },
    { pos: [-35, -78, -1565], canyonWidth: 21, wallHeight: 34, bankingDeg: 10, feature: 'stalactite_corridor' },
    { pos: [-100, -78, -1640], canyonWidth: 24, wallHeight: 36, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 5: Stepped Ice Cascade & Sheer Cliff Drop
    { pos: [-145, -86, -1730], canyonWidth: 28, wallHeight: 36, bankingDeg: 0, feature: 'stepped_cascade' },
    { pos: [-185, -96, -1820], canyonWidth: 28, wallHeight: 38, bankingDeg: 0, feature: 'stepped_cascade' },
    { pos: [-220, -106, -1910], canyonWidth: 28, wallHeight: 38, bankingDeg: 0, feature: 'stepped_cascade' },
    { pos: [-245, -106, -2005], canyonWidth: 24, wallHeight: 38, bankingDeg: 0, feature: 'cliff_drop' },
    { pos: [-265, -148, -2100], canyonWidth: 30, wallHeight: 58, bankingDeg: 0, feature: 'chasm_floor' },
    { pos: [-280, -138, -2195], canyonWidth: 30, wallHeight: 50, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 6: Subzero Crumbling Sprint
    { pos: [-290, -144, -2295], canyonWidth: 25, wallHeight: 16, bankingDeg: 0, feature: 'crumbling_bridge' },
    { pos: [-295, -152, -2395], canyonWidth: 25, wallHeight: 16, bankingDeg: 0, feature: 'crumbling_bridge' },
    { pos: [-295, -156, -2495], canyonWidth: 28, wallHeight: 34, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [-295, -156, -2595], canyonWidth: 30, wallHeight: 32, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
