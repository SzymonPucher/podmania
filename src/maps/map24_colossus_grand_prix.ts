import type { MapDefinition } from '../types';

export const MAP24_COLOSSUS_GRAND_PRIX: MapDefinition = {
  id: 'map24_colossus_grand_prix',
  name: 'Colossus Sky Grand Prix',
  subtitle: 'Expert • 3-Lap 3+ Min Championship Loop',
  description:
    'Monumental 14.4km (3-lap) championship circuit above the clouds featuring wallride bowls, skybridge causeways, barrier chicanes, crosswinds, a 56m split terrace, and an ascending helix back to Start.',
  playable: true,
  difficulty: 'expert',
  biome: 'skyway',
  isLoop: true,
  laps: 3,
  medalsMs: {
    gold: 212000,
    silver: 244000,
    bronze: 288000,
  },
  stations: [
    // Sector 1: Grand Prix Main Straight & Steep Dive (heading -Z from [0,0,0])
    { pos: [0, 0, 0], canyonWidth: 32, wallHeight: 16, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [0, -10, -125], canyonWidth: 28, wallHeight: 14, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [0, -22, -250], canyonWidth: 28, wallHeight: 14, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [0, -34, -375], canyonWidth: 26, wallHeight: 14, bankingDeg: 0, feature: 'half_rock_left' },
    { pos: [0, -38, -500], canyonWidth: 26, wallHeight: 14, bankingDeg: 0, feature: 'half_rock_right' },
    { pos: [0, -40, -625], canyonWidth: 26, wallHeight: 14, bankingDeg: 0, feature: 'half_rock_left' },
    { pos: [25, -42, -745], canyonWidth: 32, wallHeight: 20, bankingDeg: 22, feature: 'wallride_bowl' },
    { pos: [105, -42, -845], canyonWidth: 34, wallHeight: 22, bankingDeg: 30, feature: 'wallride_bowl' },
    { pos: [220, -42, -900], canyonWidth: 34, wallHeight: 22, bankingDeg: 28, feature: 'wallride_bowl' },
    { pos: [345, -42, -915], canyonWidth: 30, wallHeight: 18, bankingDeg: 10, feature: 'bridge_deck', checkpoint: true },

    // Sector 2: Northern Skybridge Causeway & Void Leap
    { pos: [475, -42, -895], canyonWidth: 32, wallHeight: 22, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [605, -44, -860], canyonWidth: 32, wallHeight: 22, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [735, -46, -820], canyonWidth: 32, wallHeight: 22, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [865, -48, -775], canyonWidth: 32, wallHeight: 22, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [985, -58, -725], canyonWidth: 28, wallHeight: 16, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [1055, -58, -695], canyonWidth: 26, wallHeight: 14, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [1105, -52, -670], canyonWidth: 28, wallHeight: 12, bankingDeg: 0, feature: 'void_gap' },
    { pos: [1165, -68, -640], canyonWidth: 30, wallHeight: 18, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 3: Eastern Double-Apex & 56m Split Terrace
    { pos: [1265, -70, -560], canyonWidth: 32, wallHeight: 18, bankingDeg: 16, feature: 'double_apex' },
    { pos: [1335, -70, -450], canyonWidth: 32, wallHeight: 18, bankingDeg: 16, feature: 'double_apex' },
    { pos: [1365, -70, -325], canyonWidth: 32, wallHeight: 18, bankingDeg: 8, feature: 'double_apex' },
    { pos: [1375, -70, -195], canyonWidth: 56, wallHeight: 24, bankingDeg: 0, feature: 'split_terrace' },
    { pos: [1375, -70, -65], canyonWidth: 56, wallHeight: 24, bankingDeg: 0, feature: 'split_terrace' },
    { pos: [1375, -70, 65], canyonWidth: 56, wallHeight: 24, bankingDeg: 0, feature: 'split_terrace' },
    { pos: [1375, -70, 195], canyonWidth: 56, wallHeight: 24, bankingDeg: 0, feature: 'split_terrace' },
    { pos: [1355, -72, 325], canyonWidth: 34, wallHeight: 18, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 4: Southern Crosswind S-Bends & Second Wallride Bowl
    { pos: [1310, -72, 445], canyonWidth: 28, wallHeight: 14, bankingDeg: 12, feature: 'crosswind_zone' },
    { pos: [1230, -72, 550], canyonWidth: 28, wallHeight: 14, bankingDeg: 14, feature: 'crosswind_zone' },
    { pos: [1125, -70, 630], canyonWidth: 28, wallHeight: 14, bankingDeg: -12, feature: 'crosswind_zone' },
    { pos: [1005, -68, 690], canyonWidth: 28, wallHeight: 14, bankingDeg: 12, feature: 'crosswind_zone' },
    { pos: [875, -66, 730], canyonWidth: 34, wallHeight: 22, bankingDeg: 26, feature: 'wallride_bowl' },
    { pos: [740, -62, 745], canyonWidth: 34, wallHeight: 22, bankingDeg: 28, feature: 'wallride_bowl' },
    { pos: [605, -58, 730], canyonWidth: 34, wallHeight: 22, bankingDeg: 24, feature: 'wallride_bowl' },
    { pos: [475, -54, 685], canyonWidth: 30, wallHeight: 18, bankingDeg: 14, feature: 'bridge_deck', checkpoint: true },

    // Sector 5: Ascending Return Causeway & Chicane back to [0,0,0]
    { pos: [355, -44, 620], canyonWidth: 28, wallHeight: 16, bankingDeg: 10, feature: 'spiral_helix' },
    { pos: [245, -34, 540], canyonWidth: 28, wallHeight: 16, bankingDeg: 10, feature: 'spiral_helix' },
    { pos: [145, -24, 450], canyonWidth: 28, wallHeight: 16, bankingDeg: 10, feature: 'spiral_helix' },
    { pos: [65, -14, 350], canyonWidth: 28, wallHeight: 16, bankingDeg: 12, feature: 'spiral_helix' },
    { pos: [15, -6, 240], canyonWidth: 28, wallHeight: 16, bankingDeg: 8, feature: 'half_rock_right' },
    { pos: [0, -2, 125], canyonWidth: 28, wallHeight: 16, bankingDeg: 0, feature: 'bridge_deck', checkpoint: true },
  ],
};
