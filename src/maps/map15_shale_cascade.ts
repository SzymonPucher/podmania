import type { MapDefinition } from '../types';

export const MAP15_SHALE_CASCADE: MapDefinition = {
  id: 'map15_shale_cascade',
  name: 'Shattered Shale Run',
  subtitle: 'Medium • Off-Camber & Icicle Cavern',
  description:
    'Glacial meltwater gorge featuring reverse-banked off-camber shale curves, a low-clearance stalactite tunnel, rough scree, and stepped cascades.',
  playable: true,
  difficulty: 'medium',
  biome: 'glacier',
  medalsMs: {
    gold: 60000,
    silver: 71000,
    bronze: 86000,
  },
  stations: [
    // Sector 1: Glacial Scree & Meltwater Ford
    { pos: [0, 0, 20], canyonWidth: 28, wallHeight: 26, bankingDeg: 0, feature: 'normal' },
    { pos: [0, -4, -75], canyonWidth: 28, wallHeight: 28, bankingDeg: 0, feature: 'rough_scree' },
    { pos: [12, -8, -170], canyonWidth: 28, wallHeight: 28, bankingDeg: 6, feature: 'rough_scree' },
    { pos: [40, -10, -260], canyonWidth: 32, wallHeight: 26, bankingDeg: 0, feature: 'water_ford' },
    { pos: [80, -10, -350], canyonWidth: 28, wallHeight: 28, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 2: Off-Camber Shale Bends (banked away from turn apex)
    { pos: [135, -12, -430], canyonWidth: 26, wallHeight: 30, bankingDeg: -8, feature: 'off_camber' },
    { pos: [205, -14, -490], canyonWidth: 26, wallHeight: 32, bankingDeg: -10, feature: 'off_camber' },
    { pos: [275, -14, -555], canyonWidth: 26, wallHeight: 32, bankingDeg: 8, feature: 'off_camber' },
    { pos: [315, -16, -645], canyonWidth: 26, wallHeight: 32, bankingDeg: 10, feature: 'off_camber' },
    { pos: [320, -16, -745], canyonWidth: 26, wallHeight: 34, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 3: Low-Clearance Icicle Stalactite Corridor
    { pos: [295, -18, -840], canyonWidth: 23, wallHeight: 32, bankingDeg: -8, feature: 'stalactite_corridor' },
    { pos: [250, -20, -930], canyonWidth: 22, wallHeight: 32, bankingDeg: -12, feature: 'stalactite_corridor' },
    { pos: [190, -22, -1005], canyonWidth: 22, wallHeight: 32, bankingDeg: -12, feature: 'stalactite_corridor' },
    { pos: [120, -22, -1075], canyonWidth: 22, wallHeight: 32, bankingDeg: 8, feature: 'stalactite_corridor' },
    { pos: [65, -22, -1160], canyonWidth: 24, wallHeight: 34, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 4: Giant Four-Step Waterfall Cascade
    { pos: [25, -30, -1250], canyonWidth: 28, wallHeight: 36, bankingDeg: 0, feature: 'stepped_cascade' },
    { pos: [-15, -40, -1340], canyonWidth: 28, wallHeight: 38, bankingDeg: 0, feature: 'stepped_cascade' },
    { pos: [-55, -50, -1430], canyonWidth: 28, wallHeight: 38, bankingDeg: 0, feature: 'stepped_cascade' },
    { pos: [-95, -60, -1520], canyonWidth: 28, wallHeight: 38, bankingDeg: 0, feature: 'stepped_cascade' },
    { pos: [-130, -64, -1615], canyonWidth: 32, wallHeight: 34, bankingDeg: 0, feature: 'water_ford', checkpoint: true },

    // Sector 5: Technical Narrow Squeeze & Hairpin
    { pos: [-160, -66, -1710], canyonWidth: 21, wallHeight: 38, bankingDeg: -14, feature: 'normal' },
    { pos: [-155, -68, -1805], canyonWidth: 20, wallHeight: 38, bankingDeg: -16, feature: 'normal' },
    { pos: [-110, -70, -1890], canyonWidth: 21, wallHeight: 38, bankingDeg: 12, feature: 'rough_scree' },
    { pos: [-65, -72, -1980], canyonWidth: 24, wallHeight: 36, bankingDeg: 8, feature: 'normal', checkpoint: true },

    // Sector 6: Steep Downhill Finish
    { pos: [-45, -86, -2080], canyonWidth: 26, wallHeight: 36, bankingDeg: 0, feature: 'normal' },
    { pos: [-40, -100, -2180], canyonWidth: 26, wallHeight: 36, bankingDeg: 0, feature: 'normal' },
    { pos: [-40, -104, -2280], canyonWidth: 28, wallHeight: 34, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [-40, -104, -2380], canyonWidth: 30, wallHeight: 32, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
