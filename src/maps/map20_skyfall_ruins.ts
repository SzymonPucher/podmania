import type { MapDefinition } from '../types';

export const MAP20_SKYFALL_RUINS: MapDefinition = {
  id: 'map20_skyfall_ruins',
  name: 'Skyfall Ruined Viaduct',
  subtitle: 'Expert • Crumbling Spans & Void Gaps',
  description:
    'Shattered high-altitude stone viaducts with missing outer slabs, fierce crosswind gusts, rock barrier chicanes, and two must-clear void leaps.',
  playable: true,
  difficulty: 'expert',
  biome: 'skyway',
  medalsMs: {
    gold: 72000,
    silver: 85000,
    bronze: 105000,
  },
  stations: [
    // Sector 1: Steep Launch & First Void Gap
    { pos: [0, 0, 20], canyonWidth: 26, wallHeight: 12, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [0, -14, -75], canyonWidth: 26, wallHeight: 12, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [0, -28, -170], canyonWidth: 26, wallHeight: 12, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [0, -23, -245], canyonWidth: 26, wallHeight: 12, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [0, -28, -300], canyonWidth: 28, wallHeight: 12, bankingDeg: 0, feature: 'void_gap' },
    { pos: [0, -38, -360], canyonWidth: 28, wallHeight: 16, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 2: Crumbling Skybridge in Crosswinds
    { pos: [15, -40, -455], canyonWidth: 25, wallHeight: 12, bankingDeg: 6, feature: 'crumbling_bridge' },
    { pos: [50, -42, -545], canyonWidth: 25, wallHeight: 12, bankingDeg: 10, feature: 'crumbling_bridge' },
    { pos: [105, -44, -625], canyonWidth: 25, wallHeight: 12, bankingDeg: 10, feature: 'crumbling_bridge' },
    { pos: [170, -46, -695], canyonWidth: 26, wallHeight: 12, bankingDeg: 0, feature: 'crosswind_zone' },
    { pos: [240, -48, -765], canyonWidth: 26, wallHeight: 12, bankingDeg: 0, feature: 'crosswind_zone' },
    { pos: [305, -48, -840], canyonWidth: 28, wallHeight: 16, bankingDeg: 0, feature: 'bridge_deck', checkpoint: true },

    // Sector 3: 56m Split Sky Terrace
    { pos: [355, -48, -925], canyonWidth: 56, wallHeight: 22, bankingDeg: 0, feature: 'split_terrace' },
    { pos: [390, -48, -1015], canyonWidth: 56, wallHeight: 22, bankingDeg: 0, feature: 'split_terrace' },
    { pos: [405, -48, -1110], canyonWidth: 56, wallHeight: 22, bankingDeg: 0, feature: 'split_terrace' },
    { pos: [400, -50, -1205], canyonWidth: 34, wallHeight: 18, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 4: Rock Barrier Chicane Corridor
    { pos: [375, -52, -1300], canyonWidth: 26, wallHeight: 16, bankingDeg: -8, feature: 'half_rock_right' },
    { pos: [330, -54, -1390], canyonWidth: 26, wallHeight: 16, bankingDeg: -10, feature: 'half_rock_left' },
    { pos: [270, -56, -1470], canyonWidth: 26, wallHeight: 16, bankingDeg: -10, feature: 'half_rock_right' },
    { pos: [200, -58, -1540], canyonWidth: 26, wallHeight: 16, bankingDeg: 0, feature: 'bridge_deck', checkpoint: true },

    // Sector 5: Second Steep Dive & Void Leap
    { pos: [130, -72, -1610], canyonWidth: 25, wallHeight: 14, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [60, -86, -1680], canyonWidth: 25, wallHeight: 14, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [5, -81, -1735], canyonWidth: 25, wallHeight: 14, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [-35, -86, -1775], canyonWidth: 28, wallHeight: 12, bankingDeg: 0, feature: 'void_gap' },
    { pos: [-80, -96, -1820], canyonWidth: 30, wallHeight: 18, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 6: Final Crumbling Sprint
    { pos: [-135, -102, -1895], canyonWidth: 25, wallHeight: 14, bankingDeg: 0, feature: 'crumbling_bridge' },
    { pos: [-190, -110, -1970], canyonWidth: 25, wallHeight: 14, bankingDeg: 0, feature: 'crumbling_bridge' },
    { pos: [-245, -116, -2045], canyonWidth: 28, wallHeight: 18, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [-300, -116, -2120], canyonWidth: 30, wallHeight: 20, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
