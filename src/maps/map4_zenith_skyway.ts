import type { MapDefinition } from '../types';

export const MAP4_ZENITH_SKYWAY: MapDefinition = {
  id: 'map4_zenith_skyway',
  name: 'Zenith Skyway',
  subtitle: 'Sector 04 • Cloud-Piercing Causeway',
  description:
    'Suspended high-altitude skyway decks with ion catapults, twin-lane causeway splits, and multi-tier tower drops.',
  playable: true,
  biome: 'skyway',
  medalsMs: {
    gold: 50000,
    silver: 60000,
    bronze: 74000,
  },
  stations: [
    // Sector 1: Skyway Launch Deck (0 - 380m)
    { pos: [0, 0, 20], canyonWidth: 26, wallHeight: 10, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [0, 0, -65], canyonWidth: 26, wallHeight: 10, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [0, 0, -165], canyonWidth: 24, wallHeight: 10, bankingDeg: 0, feature: 'boost_pad' },
    { pos: [0, 8, -260], canyonWidth: 24, wallHeight: 12, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [0, -16, -355], canyonWidth: 28, wallHeight: 20, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 2: Sweeping Cloud Turn (355 - 840m)
    { pos: [18, -20, -455], canyonWidth: 26, wallHeight: 12, bankingDeg: 10, feature: 'bridge_deck' },
    { pos: [65, -20, -550], canyonWidth: 26, wallHeight: 12, bankingDeg: 14, feature: 'bridge_deck' },
    { pos: [135, -20, -630], canyonWidth: 26, wallHeight: 12, bankingDeg: 14, feature: 'bridge_deck' },
    { pos: [215, -20, -700], canyonWidth: 26, wallHeight: 12, bankingDeg: 10, feature: 'bridge_deck' },
    { pos: [295, -20, -770], canyonWidth: 30, wallHeight: 18, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 3: Twin Skyway Split (770 - 1240m)
    { pos: [365, -20, -845], canyonWidth: 34, wallHeight: 24, bankingDeg: 0, feature: 'ridge_split' },
    { pos: [415, -20, -935], canyonWidth: 34, wallHeight: 24, bankingDeg: 0, feature: 'ridge_split' },
    { pos: [435, -20, -1035], canyonWidth: 34, wallHeight: 24, bankingDeg: 0, feature: 'ridge_split' },
    { pos: [425, -20, -1140], canyonWidth: 26, wallHeight: 12, bankingDeg: 0, feature: 'bridge_deck', checkpoint: true },

    // Sector 4: Ion Catapult & Spire Drop (1140 - 1680m)
    { pos: [395, -20, -1240], canyonWidth: 24, wallHeight: 12, bankingDeg: 0, feature: 'boost_pad' },
    { pos: [355, -10, -1335], canyonWidth: 24, wallHeight: 14, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [315, -42, -1435], canyonWidth: 30, wallHeight: 36, bankingDeg: 0, feature: 'chasm_floor' },
    { pos: [275, -32, -1535], canyonWidth: 30, wallHeight: 30, bankingDeg: 0, feature: 'landing_slope' },
    { pos: [235, -38, -1635], canyonWidth: 26, wallHeight: 16, bankingDeg: -8, feature: 'bridge_deck', checkpoint: true },

    // Sector 5: S-Bend Causeway (1635 - 2160m)
    { pos: [175, -38, -1730], canyonWidth: 26, wallHeight: 14, bankingDeg: -14, feature: 'bridge_deck' },
    { pos: [95, -38, -1805], canyonWidth: 26, wallHeight: 14, bankingDeg: -14, feature: 'bridge_deck' },
    { pos: [25, -38, -1885], canyonWidth: 26, wallHeight: 14, bankingDeg: 14, feature: 'bridge_deck' },
    { pos: [-15, -38, -1980], canyonWidth: 26, wallHeight: 14, bankingDeg: 12, feature: 'bridge_deck' },
    { pos: [-25, -38, -2085], canyonWidth: 26, wallHeight: 14, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 6: Zenith Sprint (2085 - 2480m)
    { pos: [-25, -38, -2190], canyonWidth: 24, wallHeight: 14, bankingDeg: 0, feature: 'boost_pad' },
    { pos: [-25, -38, -2295], canyonWidth: 24, wallHeight: 14, bankingDeg: 0, feature: 'boost_pad' },
    { pos: [-25, -38, -2395], canyonWidth: 28, wallHeight: 22, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [-25, -38, -2495], canyonWidth: 30, wallHeight: 24, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
