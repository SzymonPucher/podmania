import type { MapDefinition } from '../types';

export const MAP13_OVERPASS_CANYON: MapDefinition = {
  id: 'map13_overpass_canyon',
  name: 'Twin-Span Viaduct',
  subtitle: 'Medium • Multi-Deck Geode Gorge',
  description:
    'Multi-tier route playground combining stacked double-decker viaducts, an asymmetric canyon fork, a 56m split terrace, and a geode cavern.',
  playable: true,
  difficulty: 'medium',
  biome: 'desert_geode',
  medalsMs: {
    gold: 58000,
    silver: 68000,
    bronze: 84000,
  },
  stations: [
    // Sector 1: Stone Arch Entry & Double-Decker #1
    { pos: [0, 0, 20], canyonWidth: 30, wallHeight: 26, bankingDeg: 0, feature: 'rock_arch_sequence' },
    { pos: [0, -2, -75], canyonWidth: 32, wallHeight: 28, bankingDeg: 0, feature: 'double_decker' },
    { pos: [0, -4, -175], canyonWidth: 32, wallHeight: 28, bankingDeg: 0, feature: 'double_decker' },
    { pos: [0, -6, -275], canyonWidth: 32, wallHeight: 28, bankingDeg: 0, feature: 'double_decker' },
    { pos: [15, -8, -375], canyonWidth: 30, wallHeight: 30, bankingDeg: 8, feature: 'landing_slope', checkpoint: true },

    // Sector 2: Asymmetric Fork & River Crossing
    { pos: [60, -10, -465], canyonWidth: 46, wallHeight: 32, bankingDeg: 6, feature: 'asymmetric_fork' },
    { pos: [120, -12, -550], canyonWidth: 46, wallHeight: 34, bankingDeg: 0, feature: 'asymmetric_fork' },
    { pos: [185, -14, -630], canyonWidth: 46, wallHeight: 34, bankingDeg: 0, feature: 'asymmetric_fork' },
    { pos: [245, -14, -715], canyonWidth: 34, wallHeight: 28, bankingDeg: 0, feature: 'water_ford' },
    { pos: [290, -14, -805], canyonWidth: 30, wallHeight: 30, bankingDeg: -8, feature: 'normal', checkpoint: true },

    // Sector 3: Geode Hairpin Cavern
    { pos: [315, -16, -900], canyonWidth: 24, wallHeight: 34, bankingDeg: -12, feature: 'cave' },
    { pos: [305, -18, -995], canyonWidth: 22, wallHeight: 34, bankingDeg: -16, feature: 'cave' },
    { pos: [255, -18, -1080], canyonWidth: 22, wallHeight: 34, bankingDeg: -16, feature: 'cave' },
    { pos: [185, -16, -1145], canyonWidth: 24, wallHeight: 34, bankingDeg: -8, feature: 'cave', checkpoint: true },

    // Sector 4: 56m Split Terrace
    { pos: [110, -16, -1210], canyonWidth: 56, wallHeight: 30, bankingDeg: 0, feature: 'split_terrace' },
    { pos: [35, -16, -1280], canyonWidth: 56, wallHeight: 30, bankingDeg: 0, feature: 'split_terrace' },
    { pos: [-35, -16, -1355], canyonWidth: 56, wallHeight: 30, bankingDeg: 0, feature: 'split_terrace' },
    { pos: [-95, -18, -1435], canyonWidth: 34, wallHeight: 30, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 5: Second Double-Decker Span
    { pos: [-140, -20, -1525], canyonWidth: 32, wallHeight: 32, bankingDeg: 0, feature: 'double_decker' },
    { pos: [-175, -22, -1620], canyonWidth: 32, wallHeight: 32, bankingDeg: 0, feature: 'double_decker' },
    { pos: [-200, -24, -1720], canyonWidth: 32, wallHeight: 32, bankingDeg: 0, feature: 'double_decker' },
    { pos: [-210, -26, -1820], canyonWidth: 30, wallHeight: 32, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 6: Steep Finish Chute
    { pos: [-210, -38, -1920], canyonWidth: 28, wallHeight: 34, bankingDeg: 0, feature: 'rock_arch_sequence' },
    { pos: [-210, -52, -2020], canyonWidth: 28, wallHeight: 34, bankingDeg: 0, feature: 'normal' },
    { pos: [-210, -56, -2120], canyonWidth: 30, wallHeight: 32, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [-210, -56, -2220], canyonWidth: 32, wallHeight: 30, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
