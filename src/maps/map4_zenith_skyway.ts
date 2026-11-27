import type { MapDefinition } from '../types';

export const MAP4_ZENITH_SKYWAY: MapDefinition = {
  id: 'map4_zenith_skyway',
  name: 'Zenith Skyway',
  subtitle: 'Sector 04 • Cloud-Piercing Causeway',
  description:
    'Suspended high-altitude skyway decks with steep gravity drops, twin-lane causeway splits, and multi-tier tower plunges.',
  playable: true,
  biome: 'skyway',
  medalsMs: {
    gold: 50000,
    silver: 60000,
    bronze: 74000,
  },
  stations: [
    // Sector 1: Skyway Downhill Launch (0 - 380m) — steep downhill deck into launch lip
    { pos: [0, 0, 20], canyonWidth: 26, wallHeight: 10, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [0, -12, -65], canyonWidth: 26, wallHeight: 10, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [0, -26, -165], canyonWidth: 24, wallHeight: 10, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [0, -20, -260], canyonWidth: 24, wallHeight: 12, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [0, -44, -355], canyonWidth: 28, wallHeight: 20, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 2: Sweeping Cloud Turn (355 - 840m)
    { pos: [18, -48, -455], canyonWidth: 26, wallHeight: 12, bankingDeg: 10, feature: 'bridge_deck' },
    { pos: [65, -48, -550], canyonWidth: 26, wallHeight: 12, bankingDeg: 14, feature: 'bridge_deck' },
    { pos: [135, -48, -630], canyonWidth: 26, wallHeight: 12, bankingDeg: 14, feature: 'bridge_deck' },
    { pos: [215, -48, -700], canyonWidth: 26, wallHeight: 12, bankingDeg: 10, feature: 'bridge_deck' },
    { pos: [295, -48, -770], canyonWidth: 30, wallHeight: 18, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 3: Twin-Tier Skyway Terrace (770 - 1170m) — 56m wide split; left terrace climbs smoothly up to +24m and ends in a drop
    { pos: [355, -48, -835], canyonWidth: 56, wallHeight: 24, bankingDeg: 0, feature: 'split_terrace' },
    { pos: [400, -48, -920], canyonWidth: 56, wallHeight: 24, bankingDeg: 0, feature: 'split_terrace' },
    { pos: [425, -48, -1005], canyonWidth: 56, wallHeight: 24, bankingDeg: 0, feature: 'split_terrace' },
    { pos: [435, -48, -1090], canyonWidth: 56, wallHeight: 24, bankingDeg: 0, feature: 'split_terrace' },
    { pos: [425, -50, -1170], canyonWidth: 34, wallHeight: 16, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 4: Steep Gravity Dive & Spire Drop (1170 - 1680m)
    { pos: [395, -64, -1240], canyonWidth: 24, wallHeight: 12, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [355, -78, -1335], canyonWidth: 24, wallHeight: 14, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [315, -72, -1435], canyonWidth: 24, wallHeight: 14, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [275, -104, -1535], canyonWidth: 30, wallHeight: 36, bankingDeg: 0, feature: 'chasm_floor' },
    { pos: [235, -94, -1635], canyonWidth: 28, wallHeight: 26, bankingDeg: -8, feature: 'landing_slope', checkpoint: true },

    // Sector 5: S-Bend Causeway (1635 - 2160m)
    { pos: [175, -100, -1730], canyonWidth: 26, wallHeight: 14, bankingDeg: -14, feature: 'bridge_deck' },
    { pos: [95, -100, -1805], canyonWidth: 26, wallHeight: 14, bankingDeg: -14, feature: 'bridge_deck' },
    { pos: [25, -100, -1885], canyonWidth: 26, wallHeight: 14, bankingDeg: 14, feature: 'bridge_deck' },
    { pos: [-15, -100, -1980], canyonWidth: 26, wallHeight: 14, bankingDeg: 12, feature: 'bridge_deck' },
    { pos: [-25, -100, -2085], canyonWidth: 26, wallHeight: 14, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 6: Zenith Steep Downhill Sprint (2085 - 2480m)
    { pos: [-25, -116, -2190], canyonWidth: 24, wallHeight: 14, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [-25, -132, -2295], canyonWidth: 24, wallHeight: 14, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [-25, -138, -2395], canyonWidth: 28, wallHeight: 22, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [-25, -138, -2495], canyonWidth: 30, wallHeight: 24, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
