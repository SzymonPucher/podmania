import type { MapDefinition } from '../types';

export const MAP5_DUNE_LABYRINTH: MapDefinition = {
  id: 'map5_dune_labyrinth',
  name: 'Sunscorch Labyrinth',
  subtitle: 'Sector 05 • Shifting Dune & Geode Basin',
  description:
    'Rolling sand-dune waves, jagged boulder scree washes, a bioluminescent geode cavern, and oasis boost rails.',
  playable: true,
  biome: 'desert_geode',
  medalsMs: {
    gold: 56000,
    silver: 66000,
    bronze: 82000,
  },
  stations: [
    // Sector 1: Rolling Dune Sea (0 - 400m)
    { pos: [0, 0, 20], canyonWidth: 30, wallHeight: 22, bankingDeg: 0, feature: 'sand_dunes' },
    { pos: [0, 0, -65], canyonWidth: 30, wallHeight: 24, bankingDeg: 0, feature: 'sand_dunes' },
    { pos: [-25, 2, -165], canyonWidth: 28, wallHeight: 26, bankingDeg: -8, feature: 'sand_dunes' },
    { pos: [-80, 4, -260], canyonWidth: 28, wallHeight: 28, bankingDeg: -12, feature: 'sand_dunes' },
    { pos: [-155, 4, -345], canyonWidth: 28, wallHeight: 30, bankingDeg: -8, feature: 'sand_dunes', checkpoint: true },

    // Sector 2: 200m Monolith Slalom Arena (345 - 860m) — 200m wide obstacle field with optional jump ramps
    { pos: [-230, 2, -425], canyonWidth: 200, wallHeight: 34, bankingDeg: 0, feature: 'pillar_slalom' },
    { pos: [-285, 0, -515], canyonWidth: 200, wallHeight: 36, bankingDeg: 0, feature: 'pillar_slalom' },
    { pos: [-305, -2, -615], canyonWidth: 200, wallHeight: 38, bankingDeg: 0, feature: 'pillar_slalom' },
    { pos: [-275, -4, -715], canyonWidth: 200, wallHeight: 38, bankingDeg: 0, feature: 'pillar_slalom' },
    { pos: [-220, -4, -810], canyonWidth: 26, wallHeight: 36, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 3: Oasis Boost & Sunscorch Drop (810 - 1300m)
    { pos: [-165, -4, -900], canyonWidth: 24, wallHeight: 34, bankingDeg: 0, feature: 'boost_pad' },
    { pos: [-115, 4, -990], canyonWidth: 24, wallHeight: 32, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [-65, -24, -1080], canyonWidth: 30, wallHeight: 50, bankingDeg: 0, feature: 'chasm_floor' },
    { pos: [-15, -14, -1170], canyonWidth: 30, wallHeight: 44, bankingDeg: 0, feature: 'landing_slope' },
    { pos: [35, -18, -1260], canyonWidth: 26, wallHeight: 40, bankingDeg: 8, feature: 'landing_slope', checkpoint: true },

    // Sector 4: Bioluminescent Geode Cavern (1260 - 1780m)
    { pos: [95, -22, -1350], canyonWidth: 22, wallHeight: 34, bankingDeg: 12, feature: 'cave' },
    { pos: [165, -24, -1435], canyonWidth: 22, wallHeight: 34, bankingDeg: 14, feature: 'cave' },
    { pos: [215, -24, -1530], canyonWidth: 22, wallHeight: 34, bankingDeg: -14, feature: 'cave' },
    { pos: [205, -22, -1635], canyonWidth: 22, wallHeight: 34, bankingDeg: -16, feature: 'cave' },
    { pos: [145, -20, -1725], canyonWidth: 24, wallHeight: 36, bankingDeg: -8, feature: 'cave', checkpoint: true },

    // Sector 5: Dune Waves & Thermal Geyser (1725 - 2280m)
    { pos: [70, -18, -1805], canyonWidth: 30, wallHeight: 38, bankingDeg: 6, feature: 'sand_dunes' },
    { pos: [0, -16, -1890], canyonWidth: 30, wallHeight: 38, bankingDeg: -6, feature: 'sand_dunes' },
    { pos: [-55, -16, -1985], canyonWidth: 26, wallHeight: 40, bankingDeg: 0, feature: 'magma_vent' },
    { pos: [-90, -12, -2080], canyonWidth: 24, wallHeight: 38, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [-120, -34, -2175], canyonWidth: 30, wallHeight: 50, bankingDeg: 0, feature: 'landing_slope' },
    { pos: [-135, -36, -2275], canyonWidth: 28, wallHeight: 46, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 6: Geode Oasis Sprint (2275 - 2680m)
    { pos: [-140, -36, -2375], canyonWidth: 26, wallHeight: 44, bankingDeg: 0, feature: 'boost_pad' },
    { pos: [-140, -36, -2480], canyonWidth: 26, wallHeight: 44, bankingDeg: 0, feature: 'boost_pad' },
    { pos: [-140, -36, -2580], canyonWidth: 28, wallHeight: 42, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [-140, -36, -2680], canyonWidth: 30, wallHeight: 40, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
