import type { MapDefinition } from '../types';

export const MAP14_ZEPHYR_RIDGE: MapDefinition = {
  id: 'map14_zephyr_ridge',
  name: 'Gale-Force Spire',
  subtitle: 'Medium • Crosswind & Helix Tower',
  description:
    'Exposed skyway causeways buffeted by lateral crosswind gusts, a full 360° descending helical tower ramp, and a steep wallride bowl.',
  playable: true,
  difficulty: 'medium',
  biome: 'skyway',
  medalsMs: {
    gold: 56000,
    silver: 66000,
    bronze: 81000,
  },
  stations: [
    // Sector 1: Exposed Crosswind Causeway #1
    { pos: [0, 0, 20], canyonWidth: 28, wallHeight: 12, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [0, -6, -75], canyonWidth: 28, wallHeight: 12, bankingDeg: 0, feature: 'crosswind_zone' },
    { pos: [0, -12, -170], canyonWidth: 28, wallHeight: 12, bankingDeg: 0, feature: 'crosswind_zone' },
    { pos: [10, -14, -265], canyonWidth: 28, wallHeight: 12, bankingDeg: 6, feature: 'crosswind_zone' },
    { pos: [35, -14, -360], canyonWidth: 28, wallHeight: 14, bankingDeg: 10, feature: 'bridge_deck', checkpoint: true },

    // Sector 2: 360° Helical Tower Descent (radius ~115m around center [150, *, -360])
    { pos: [95, -20, -445], canyonWidth: 26, wallHeight: 14, bankingDeg: 16, feature: 'spiral_helix' },
    { pos: [185, -28, -465], canyonWidth: 26, wallHeight: 14, bankingDeg: 18, feature: 'spiral_helix' },
    { pos: [255, -36, -405], canyonWidth: 26, wallHeight: 14, bankingDeg: 18, feature: 'spiral_helix' },
    { pos: [265, -44, -310], canyonWidth: 26, wallHeight: 14, bankingDeg: 18, feature: 'spiral_helix' },
    { pos: [205, -52, -245], canyonWidth: 26, wallHeight: 14, bankingDeg: 18, feature: 'spiral_helix' },
    { pos: [115, -60, -260], canyonWidth: 26, wallHeight: 14, bankingDeg: 16, feature: 'spiral_helix' },
    { pos: [60, -66, -340], canyonWidth: 26, wallHeight: 14, bankingDeg: 12, feature: 'spiral_helix' },
    { pos: [55, -70, -445], canyonWidth: 28, wallHeight: 14, bankingDeg: 0, feature: 'bridge_deck', checkpoint: true },

    // Sector 3: Steep Gravity Dive & Tower Jump
    { pos: [55, -84, -550], canyonWidth: 26, wallHeight: 14, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [55, -98, -655], canyonWidth: 26, wallHeight: 14, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [55, -92, -755], canyonWidth: 26, wallHeight: 14, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [55, -122, -855], canyonWidth: 30, wallHeight: 34, bankingDeg: 0, feature: 'chasm_floor' },
    { pos: [55, -112, -955], canyonWidth: 30, wallHeight: 24, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 4: Skyway Wallride Bowl
    { pos: [30, -114, -1050], canyonWidth: 32, wallHeight: 22, bankingDeg: -22, feature: 'wallride_bowl' },
    { pos: [-35, -114, -1130], canyonWidth: 34, wallHeight: 24, bankingDeg: -28, feature: 'wallride_bowl' },
    { pos: [-125, -114, -1175], canyonWidth: 34, wallHeight: 24, bankingDeg: -26, feature: 'wallride_bowl' },
    { pos: [-215, -114, -1195], canyonWidth: 28, wallHeight: 18, bankingDeg: -10, feature: 'bridge_deck', checkpoint: true },

    // Sector 5: Reverse Crosswind Gusts & Finish
    { pos: [-305, -118, -1230], canyonWidth: 28, wallHeight: 14, bankingDeg: 0, feature: 'crosswind_zone' },
    { pos: [-390, -124, -1275], canyonWidth: 28, wallHeight: 14, bankingDeg: 0, feature: 'crosswind_zone' },
    { pos: [-475, -132, -1320], canyonWidth: 28, wallHeight: 16, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [-560, -136, -1365], canyonWidth: 30, wallHeight: 18, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [-645, -136, -1410], canyonWidth: 32, wallHeight: 20, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
