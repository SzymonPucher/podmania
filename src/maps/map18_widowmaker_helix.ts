import type { MapDefinition } from '../types';

export const MAP18_WIDOWMAKER_HELIX: MapDefinition = {
  id: 'map18_widowmaker_helix',
  name: 'Widowmaker Spire',
  subtitle: 'Hard • Volcanic Helix & Void Leap',
  description:
    'Corkscrews down an obsidian spire into reverse-camber basalt shelves, molten lava pits, a 42m cliff plunge, and a true void gap jump.',
  playable: true,
  difficulty: 'hard',
  biome: 'volcanic',
  medalsMs: {
    gold: 70000,
    silver: 83000,
    bronze: 102000,
  },
  stations: [
    // Sector 1: Steep Volcanic Chute & Void Gap #1
    { pos: [0, 0, 20], canyonWidth: 28, wallHeight: 28, bankingDeg: 0, feature: 'normal' },
    { pos: [0, -14, -75], canyonWidth: 26, wallHeight: 30, bankingDeg: 0, feature: 'normal' },
    { pos: [0, -28, -170], canyonWidth: 26, wallHeight: 30, bankingDeg: 0, feature: 'normal' },
    { pos: [0, -23, -245], canyonWidth: 26, wallHeight: 26, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [0, -28, -300], canyonWidth: 28, wallHeight: 16, bankingDeg: 0, feature: 'void_gap' },
    { pos: [0, -38, -360], canyonWidth: 30, wallHeight: 32, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 2: 360° Obsidian Helix Descent
    { pos: [35, -44, -445], canyonWidth: 26, wallHeight: 16, bankingDeg: 16, feature: 'spiral_helix' },
    { pos: [120, -52, -485], canyonWidth: 26, wallHeight: 16, bankingDeg: 18, feature: 'spiral_helix' },
    { pos: [205, -60, -445], canyonWidth: 26, wallHeight: 16, bankingDeg: 18, feature: 'spiral_helix' },
    { pos: [240, -68, -360], canyonWidth: 26, wallHeight: 16, bankingDeg: 18, feature: 'spiral_helix' },
    { pos: [200, -76, -275], canyonWidth: 26, wallHeight: 16, bankingDeg: 18, feature: 'spiral_helix' },
    { pos: [115, -84, -260], canyonWidth: 26, wallHeight: 16, bankingDeg: 16, feature: 'spiral_helix' },
    { pos: [45, -90, -325], canyonWidth: 26, wallHeight: 16, bankingDeg: 12, feature: 'spiral_helix' },
    { pos: [30, -94, -420], canyonWidth: 28, wallHeight: 32, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 3: Off-Camber Basalt Shelves
    { pos: [25, -96, -520], canyonWidth: 25, wallHeight: 36, bankingDeg: 8, feature: 'off_camber' },
    { pos: [-15, -98, -610], canyonWidth: 24, wallHeight: 36, bankingDeg: 10, feature: 'off_camber' },
    { pos: [-80, -100, -685], canyonWidth: 24, wallHeight: 36, bankingDeg: -10, feature: 'off_camber' },
    { pos: [-155, -102, -750], canyonWidth: 24, wallHeight: 38, bankingDeg: -10, feature: 'off_camber' },
    { pos: [-215, -102, -830], canyonWidth: 26, wallHeight: 38, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 4: Molten Hazard Pit Basin
    { pos: [-255, -104, -920], canyonWidth: 32, wallHeight: 40, bankingDeg: 0, feature: 'hazard_pit' },
    { pos: [-285, -106, -1015], canyonWidth: 32, wallHeight: 40, bankingDeg: 0, feature: 'hazard_pit' },
    { pos: [-305, -108, -1110], canyonWidth: 32, wallHeight: 40, bankingDeg: 0, feature: 'hazard_pit' },
    { pos: [-305, -108, -1210], canyonWidth: 26, wallHeight: 40, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 5: Sheer Cliff Plunge & Hairpin
    { pos: [-295, -108, -1305], canyonWidth: 24, wallHeight: 38, bankingDeg: 0, feature: 'cliff_drop' },
    { pos: [-285, -150, -1400], canyonWidth: 30, wallHeight: 60, bankingDeg: 0, feature: 'chasm_floor' },
    { pos: [-275, -140, -1495], canyonWidth: 30, wallHeight: 52, bankingDeg: 0, feature: 'landing_slope' },
    { pos: [-250, -144, -1590], canyonWidth: 22, wallHeight: 46, bankingDeg: 16, feature: 'normal' },
    { pos: [-190, -146, -1665], canyonWidth: 22, wallHeight: 46, bankingDeg: 16, feature: 'normal', checkpoint: true },

    // Sector 6: Steep Finish Chute
    { pos: [-115, -158, -1730], canyonWidth: 26, wallHeight: 44, bankingDeg: 0, feature: 'normal' },
    { pos: [-40, -172, -1795], canyonWidth: 26, wallHeight: 44, bankingDeg: 0, feature: 'normal' },
    { pos: [35, -178, -1860], canyonWidth: 28, wallHeight: 42, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [110, -178, -1925], canyonWidth: 30, wallHeight: 40, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
