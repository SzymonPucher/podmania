import type { MapDefinition } from '../types';

export const MAP16_ACID_CALDERA: MapDefinition = {
  id: 'map16_acid_caldera',
  name: 'Sulfur Acid Caldera',
  subtitle: 'Hard • Caustic Ledge & Crumbling Span',
  description:
    'Boiling acid floor basins that force pods onto narrow outer stone ledges, crumbling ancient viaducts, quicksand silt, and a stalactite cavern.',
  playable: true,
  difficulty: 'hard',
  biome: 'badlands',
  medalsMs: {
    gold: 66000,
    silver: 78000,
    bronze: 95000,
  },
  stations: [
    // Sector 1: Half-Rock Canyon & First Acid Basin
    { pos: [0, 0, 20], canyonWidth: 28, wallHeight: 28, bankingDeg: 0, feature: 'normal' },
    { pos: [0, -4, -75], canyonWidth: 26, wallHeight: 30, bankingDeg: 0, feature: 'half_rock_left' },
    { pos: [-18, -8, -170], canyonWidth: 26, wallHeight: 32, bankingDeg: -8, feature: 'half_rock_right' },
    { pos: [-60, -10, -260], canyonWidth: 32, wallHeight: 34, bankingDeg: 0, feature: 'hazard_pit' },
    { pos: [-110, -12, -350], canyonWidth: 32, wallHeight: 34, bankingDeg: 0, feature: 'hazard_pit' },
    { pos: [-160, -12, -440], canyonWidth: 28, wallHeight: 34, bankingDeg: -8, feature: 'normal', checkpoint: true },

    // Sector 2: Stalactite Acid Cavern
    { pos: [-215, -14, -525], canyonWidth: 22, wallHeight: 34, bankingDeg: -12, feature: 'stalactite_corridor' },
    { pos: [-255, -16, -615], canyonWidth: 21, wallHeight: 34, bankingDeg: -14, feature: 'stalactite_corridor' },
    { pos: [-265, -18, -715], canyonWidth: 21, wallHeight: 34, bankingDeg: 10, feature: 'stalactite_corridor' },
    { pos: [-235, -18, -810], canyonWidth: 22, wallHeight: 34, bankingDeg: 14, feature: 'stalactite_corridor' },
    { pos: [-180, -18, -895], canyonWidth: 26, wallHeight: 34, bankingDeg: 6, feature: 'normal', checkpoint: true },

    // Sector 3: Crumbling Stone Bridge over Acid Gorge
    { pos: [-120, -20, -980], canyonWidth: 26, wallHeight: 16, bankingDeg: 0, feature: 'crumbling_bridge' },
    { pos: [-60, -22, -1065], canyonWidth: 26, wallHeight: 16, bankingDeg: 0, feature: 'crumbling_bridge' },
    { pos: [0, -24, -1150], canyonWidth: 26, wallHeight: 16, bankingDeg: 0, feature: 'crumbling_bridge' },
    { pos: [55, -24, -1240], canyonWidth: 28, wallHeight: 32, bankingDeg: 8, feature: 'normal', checkpoint: true },

    // Sector 4: Deep Silt Trench
    { pos: [110, -26, -1330], canyonWidth: 34, wallHeight: 34, bankingDeg: 0, feature: 'silt_trench' },
    { pos: [160, -28, -1420], canyonWidth: 34, wallHeight: 34, bankingDeg: 0, feature: 'silt_trench' },
    { pos: [195, -30, -1515], canyonWidth: 34, wallHeight: 34, bankingDeg: -8, feature: 'silt_trench' },
    { pos: [205, -30, -1615], canyonWidth: 26, wallHeight: 36, bankingDeg: -12, feature: 'normal', checkpoint: true },

    // Sector 5: Main Caldera Acid Pit & Narrow Squeeze
    { pos: [185, -32, -1715], canyonWidth: 32, wallHeight: 38, bankingDeg: 0, feature: 'hazard_pit' },
    { pos: [155, -34, -1815], canyonWidth: 32, wallHeight: 38, bankingDeg: 0, feature: 'hazard_pit' },
    { pos: [125, -36, -1915], canyonWidth: 32, wallHeight: 38, bankingDeg: 0, feature: 'hazard_pit' },
    { pos: [95, -38, -2015], canyonWidth: 20, wallHeight: 40, bankingDeg: 10, feature: 'half_rock_left' },
    { pos: [70, -40, -2115], canyonWidth: 24, wallHeight: 38, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 6: Steep Caldera Plunge to Finish
    { pos: [55, -54, -2215], canyonWidth: 26, wallHeight: 38, bankingDeg: 0, feature: 'normal' },
    { pos: [45, -68, -2315], canyonWidth: 26, wallHeight: 38, bankingDeg: 0, feature: 'normal' },
    { pos: [45, -74, -2415], canyonWidth: 28, wallHeight: 36, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [45, -74, -2515], canyonWidth: 30, wallHeight: 34, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
