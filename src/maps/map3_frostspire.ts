import type { MapDefinition } from '../types';

export const MAP3_FROSTSPIRE: MapDefinition = {
  id: 'map3_frostspire',
  name: 'Frostspire Glacier',
  subtitle: 'Sector 03 • Cryo Rift Valley',
  description:
    'Mirror-smooth glacial ice sheets for long high-speed drifts, cryo-magnetic boost rails, and a crystalline ice cavern.',
  playable: true,
  biome: 'glacier',
  medalsMs: {
    gold: 53000,
    silver: 63000,
    bronze: 77000,
  },
  stations: [
    // Sector 1: Glacial Chute (0 - 380m)
    { pos: [0, 0, 20], canyonWidth: 28, wallHeight: 24, bankingDeg: 0, feature: 'normal' },
    { pos: [0, -2, -65], canyonWidth: 28, wallHeight: 26, bankingDeg: 0, feature: 'boost_pad' },
    { pos: [12, -5, -165], canyonWidth: 28, wallHeight: 28, bankingDeg: 6, feature: 'ice_sheet' },
    { pos: [55, -8, -260], canyonWidth: 28, wallHeight: 30, bankingDeg: 14, feature: 'ice_sheet' },
    { pos: [125, -10, -345], canyonWidth: 26, wallHeight: 32, bankingDeg: 16, feature: 'ice_sheet', checkpoint: true },

    // Sector 2: Sweeping Drift Hairpins (345 - 860m)
    { pos: [210, -10, -410], canyonWidth: 26, wallHeight: 34, bankingDeg: 16, feature: 'ice_sheet' },
    { pos: [295, -10, -485], canyonWidth: 26, wallHeight: 34, bankingDeg: -14, feature: 'ice_sheet' },
    { pos: [350, -10, -580], canyonWidth: 26, wallHeight: 36, bankingDeg: -16, feature: 'ice_sheet' },
    { pos: [365, -10, -685], canyonWidth: 26, wallHeight: 36, bankingDeg: -14, feature: 'ice_sheet' },
    { pos: [325, -10, -785], canyonWidth: 26, wallHeight: 36, bankingDeg: 10, feature: 'ice_sheet', checkpoint: true },

    // Sector 3: Cryo Accelerator & Shelf Drop (785 - 1280m)
    { pos: [275, -10, -885], canyonWidth: 24, wallHeight: 36, bankingDeg: 0, feature: 'boost_pad' },
    { pos: [230, -8, -980], canyonWidth: 24, wallHeight: 34, bankingDeg: 0, feature: 'boost_pad' },
    { pos: [190, -2, -1070], canyonWidth: 24, wallHeight: 32, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [145, -34, -1165], canyonWidth: 30, wallHeight: 54, bankingDeg: 0, feature: 'chasm_floor' },
    { pos: [100, -24, -1255], canyonWidth: 30, wallHeight: 46, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 4: Ice Prism Cavern (1255 - 1740m)
    { pos: [55, -28, -1350], canyonWidth: 24, wallHeight: 36, bankingDeg: -8, feature: 'cave' },
    { pos: [0, -30, -1440], canyonWidth: 22, wallHeight: 34, bankingDeg: -14, feature: 'cave' },
    { pos: [-75, -32, -1515], canyonWidth: 22, wallHeight: 34, bankingDeg: -16, feature: 'cave' },
    { pos: [-155, -32, -1580], canyonWidth: 22, wallHeight: 34, bankingDeg: 10, feature: 'cave' },
    { pos: [-225, -30, -1655], canyonWidth: 24, wallHeight: 36, bankingDeg: 8, feature: 'cave', checkpoint: true },

    // Sector 5: Frozen Basin Slalom (1655 - 2200m)
    { pos: [-275, -28, -1750], canyonWidth: 28, wallHeight: 38, bankingDeg: 12, feature: 'ice_sheet' },
    { pos: [-290, -28, -1855], canyonWidth: 28, wallHeight: 38, bankingDeg: 14, feature: 'ice_sheet' },
    { pos: [-255, -28, -1960], canyonWidth: 28, wallHeight: 38, bankingDeg: -12, feature: 'ice_sheet' },
    { pos: [-200, -28, -2055], canyonWidth: 26, wallHeight: 38, bankingDeg: -10, feature: 'ice_sheet' },
    { pos: [-165, -28, -2155], canyonWidth: 26, wallHeight: 38, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 6: Ion Rail Finish Sprint (2155 - 2560m)
    { pos: [-155, -28, -2260], canyonWidth: 24, wallHeight: 38, bankingDeg: 0, feature: 'boost_pad' },
    { pos: [-155, -28, -2365], canyonWidth: 24, wallHeight: 38, bankingDeg: 0, feature: 'boost_pad' },
    { pos: [-155, -28, -2465], canyonWidth: 28, wallHeight: 38, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [-155, -28, -2565], canyonWidth: 30, wallHeight: 36, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
