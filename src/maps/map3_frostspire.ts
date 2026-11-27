import type { MapDefinition } from '../types';

export const MAP3_FROSTSPIRE: MapDefinition = {
  id: 'map3_frostspire',
  name: 'Frostspire Glacier',
  subtitle: 'Sector 03 • Cryo Rift Valley',
  description:
    'Steep glacial downhill chutes for building raw speed, sweeping banked hairpins, and a crystalline ice cavern.',
  playable: true,
  difficulty: 'medium',
  biome: 'glacier',
  medalsMs: {
    gold: 53000,
    silver: 63000,
    bronze: 77000,
  },
  stations: [
    // Sector 1: Glacial Downhill Chute (0 - 380m) — steep long drop to build opening speed
    { pos: [0, 0, 20], canyonWidth: 28, wallHeight: 24, bankingDeg: 0, feature: 'normal' },
    { pos: [0, -12, -65], canyonWidth: 28, wallHeight: 26, bankingDeg: 0, feature: 'normal' },
    { pos: [12, -24, -165], canyonWidth: 28, wallHeight: 28, bankingDeg: 6, feature: 'normal' },
    { pos: [55, -28, -260], canyonWidth: 28, wallHeight: 30, bankingDeg: 14, feature: 'normal' },
    { pos: [125, -28, -345], canyonWidth: 26, wallHeight: 32, bankingDeg: 16, feature: 'normal', checkpoint: true },

    // Sector 2: Sweeping Drift Hairpins (345 - 860m)
    { pos: [210, -28, -410], canyonWidth: 26, wallHeight: 34, bankingDeg: 16, feature: 'normal' },
    { pos: [295, -28, -485], canyonWidth: 26, wallHeight: 34, bankingDeg: -14, feature: 'normal' },
    { pos: [350, -28, -580], canyonWidth: 26, wallHeight: 36, bankingDeg: -16, feature: 'normal' },
    { pos: [365, -28, -685], canyonWidth: 26, wallHeight: 36, bankingDeg: -14, feature: 'normal' },
    { pos: [325, -28, -785], canyonWidth: 26, wallHeight: 36, bankingDeg: 10, feature: 'normal', checkpoint: true },

    // Sector 3: Steep Glacial Run-Up & Shelf Drop (785 - 1280m)
    { pos: [275, -42, -885], canyonWidth: 24, wallHeight: 36, bankingDeg: 0, feature: 'normal' },
    { pos: [230, -56, -980], canyonWidth: 24, wallHeight: 34, bankingDeg: 0, feature: 'normal' },
    { pos: [190, -50, -1070], canyonWidth: 24, wallHeight: 32, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [145, -82, -1165], canyonWidth: 30, wallHeight: 54, bankingDeg: 0, feature: 'chasm_floor' },
    { pos: [100, -72, -1255], canyonWidth: 30, wallHeight: 46, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 4: Ice Prism Cavern (1255 - 1740m)
    { pos: [55, -76, -1350], canyonWidth: 24, wallHeight: 36, bankingDeg: -8, feature: 'cave' },
    { pos: [0, -78, -1440], canyonWidth: 22, wallHeight: 34, bankingDeg: -14, feature: 'cave' },
    { pos: [-75, -80, -1515], canyonWidth: 22, wallHeight: 34, bankingDeg: -16, feature: 'cave' },
    { pos: [-155, -80, -1580], canyonWidth: 22, wallHeight: 34, bankingDeg: 10, feature: 'cave' },
    { pos: [-225, -78, -1655], canyonWidth: 24, wallHeight: 36, bankingDeg: 8, feature: 'cave', checkpoint: true },

    // Sector 5: Frozen Basin Slalom (1655 - 2200m)
    { pos: [-275, -76, -1750], canyonWidth: 28, wallHeight: 38, bankingDeg: 12, feature: 'normal' },
    { pos: [-290, -76, -1855], canyonWidth: 28, wallHeight: 38, bankingDeg: 14, feature: 'normal' },
    { pos: [-255, -76, -1960], canyonWidth: 28, wallHeight: 38, bankingDeg: -12, feature: 'normal' },
    { pos: [-200, -76, -2055], canyonWidth: 26, wallHeight: 38, bankingDeg: -10, feature: 'normal' },
    { pos: [-165, -76, -2155], canyonWidth: 26, wallHeight: 38, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 6: Steep Downhill Finish Sprint (2155 - 2560m)
    { pos: [-155, -90, -2260], canyonWidth: 24, wallHeight: 38, bankingDeg: 0, feature: 'normal' },
    { pos: [-155, -106, -2365], canyonWidth: 24, wallHeight: 38, bankingDeg: 0, feature: 'normal' },
    { pos: [-155, -112, -2465], canyonWidth: 28, wallHeight: 38, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [-155, -112, -2565], canyonWidth: 30, wallHeight: 36, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
