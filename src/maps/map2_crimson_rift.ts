import type { MapDefinition } from '../types';

export const MAP2_CRIMSON_RIFT: MapDefinition = {
  id: 'map2_crimson_rift',
  name: 'Crimson Rift',
  subtitle: 'Sector 02 • Basalt Spire Trench',
  description:
    'Volcanic basalt canyon with twin-ledge ridge splits, thermal magma updrafts, and a glowing lava-tube cavern.',
  playable: true,
  biome: 'volcanic',
  medalsMs: {
    gold: 54000,
    silver: 64000,
    bronze: 78000,
  },
  stations: [
    // Sector 1: Obsidian Launch (0 - 380m) — straight & sweeping turn with half-track rock barriers
    { pos: [0, 0, 20], canyonWidth: 28, wallHeight: 26, bankingDeg: 0, feature: 'normal' },
    { pos: [0, 0, -65], canyonWidth: 28, wallHeight: 28, bankingDeg: 0, feature: 'half_rock_left' },
    { pos: [-18, 2, -165], canyonWidth: 26, wallHeight: 30, bankingDeg: -8, feature: 'half_rock_right' },
    { pos: [-68, 4, -260], canyonWidth: 26, wallHeight: 34, bankingDeg: -12, feature: 'half_rock_left' },
    { pos: [-135, 6, -345], canyonWidth: 30, wallHeight: 36, bankingDeg: -10, feature: 'normal', checkpoint: true },

    // Sector 2: Twin-Ledge Basalt Split (380 - 860m) — raised center spine divides left/right channels
    { pos: [-215, 6, -420], canyonWidth: 34, wallHeight: 38, bankingDeg: 0, feature: 'ridge_split' },
    { pos: [-295, 5, -495], canyonWidth: 36, wallHeight: 40, bankingDeg: 0, feature: 'ridge_split' },
    { pos: [-355, 4, -585], canyonWidth: 34, wallHeight: 40, bankingDeg: 6, feature: 'ridge_split' },
    { pos: [-385, 2, -690], canyonWidth: 32, wallHeight: 38, bankingDeg: 8, feature: 'ridge_split' },
    { pos: [-370, 0, -795], canyonWidth: 26, wallHeight: 38, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 3: Magma Thermal Chasm (860 - 1340m) — updraft vents launch pod across molten rift
    { pos: [-325, -2, -895], canyonWidth: 24, wallHeight: 40, bankingDeg: 0, feature: 'magma_vent' },
    { pos: [-265, 2, -985], canyonWidth: 24, wallHeight: 38, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [-200, -24, -1065], canyonWidth: 30, wallHeight: 52, bankingDeg: 0, feature: 'magma_vent' },
    { pos: [-130, -14, -1145], canyonWidth: 30, wallHeight: 44, bankingDeg: 0, feature: 'landing_slope' },
    { pos: [-55, -18, -1230], canyonWidth: 26, wallHeight: 42, bankingDeg: 10, feature: 'landing_slope', checkpoint: true },

    // Sector 4: Lava Tube Cavern (1230 - 1720m)
    { pos: [25, -20, -1310], canyonWidth: 22, wallHeight: 34, bankingDeg: 12, feature: 'cave' },
    { pos: [110, -22, -1385], canyonWidth: 22, wallHeight: 32, bankingDeg: 14, feature: 'cave' },
    { pos: [195, -22, -1465], canyonWidth: 22, wallHeight: 32, bankingDeg: -10, feature: 'cave' },
    { pos: [245, -20, -1560], canyonWidth: 22, wallHeight: 34, bankingDeg: -14, feature: 'cave' },
    { pos: [240, -18, -1660], canyonWidth: 24, wallHeight: 36, bankingDeg: -8, feature: 'cave', checkpoint: true },

    // Sector 5: Caldera Ridge & Cliff Plunge (1720 - 2240m)
    { pos: [200, -14, -1760], canyonWidth: 32, wallHeight: 40, bankingDeg: 0, feature: 'ridge_split' },
    { pos: [150, -10, -1860], canyonWidth: 32, wallHeight: 40, bankingDeg: 0, feature: 'ridge_split' },
    { pos: [105, -6, -1955], canyonWidth: 24, wallHeight: 38, bankingDeg: 0, feature: 'magma_vent' },
    { pos: [65, -4, -2045], canyonWidth: 24, wallHeight: 36, bankingDeg: 0, feature: 'cliff_drop' },
    { pos: [30, -46, -2135], canyonWidth: 30, wallHeight: 62, bankingDeg: 0, feature: 'chasm_floor' },
    { pos: [5, -36, -2225], canyonWidth: 28, wallHeight: 52, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 6: Basalt Sprint to Finish (2225 - 2600m)
    { pos: [-10, -38, -2325], canyonWidth: 26, wallHeight: 50, bankingDeg: -8, feature: 'normal' },
    { pos: [-5, -38, -2425], canyonWidth: 26, wallHeight: 50, bankingDeg: 8, feature: 'magma_vent' },
    { pos: [10, -38, -2525], canyonWidth: 28, wallHeight: 48, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [15, -38, -2620], canyonWidth: 30, wallHeight: 46, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
