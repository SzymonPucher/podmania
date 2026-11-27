import type { MapDefinition } from '../types';

export const MAP9_CLOUDSPAN_CAUSEWAY: MapDefinition = {
  id: 'map9_cloudspan_causeway',
  name: 'Cloudspan Causeway',
  subtitle: 'Easy • High-Altitude Skybridge',
  description:
    'Broad suspended skybridges with stone arch rib cages, gentle tabletop plateau jumps, a sweeping double-apex curve, and a wide funnel finish.',
  playable: true,
  difficulty: 'easy',
  biome: 'skyway',
  medalsMs: {
    gold: 49000,
    silver: 58000,
    bronze: 72000,
  },
  stations: [
    // Sector 1: Skybridge Promenade
    { pos: [0, 0, 20], canyonWidth: 30, wallHeight: 12, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [0, -6, -70], canyonWidth: 30, wallHeight: 12, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [0, -12, -165], canyonWidth: 30, wallHeight: 12, bankingDeg: 0, feature: 'tabletop_jump' },
    { pos: [0, -12, -260], canyonWidth: 30, wallHeight: 12, bankingDeg: 0, feature: 'tabletop_jump' },
    { pos: [12, -12, -355], canyonWidth: 30, wallHeight: 14, bankingDeg: 6, feature: 'bridge_deck', checkpoint: true },

    // Sector 2: Cloud Double-Apex Sweeper
    { pos: [48, -14, -445], canyonWidth: 32, wallHeight: 16, bankingDeg: 14, feature: 'double_apex' },
    { pos: [115, -14, -515], canyonWidth: 32, wallHeight: 16, bankingDeg: 14, feature: 'double_apex' },
    { pos: [195, -14, -555], canyonWidth: 32, wallHeight: 16, bankingDeg: 6, feature: 'double_apex' },
    { pos: [275, -14, -605], canyonWidth: 32, wallHeight: 16, bankingDeg: 14, feature: 'double_apex' },
    { pos: [330, -14, -685], canyonWidth: 30, wallHeight: 16, bankingDeg: 10, feature: 'bridge_deck', checkpoint: true },

    // Sector 3: Sky-Arch Rib Span
    { pos: [350, -16, -780], canyonWidth: 30, wallHeight: 22, bankingDeg: 0, feature: 'rock_arch_sequence' },
    { pos: [350, -18, -880], canyonWidth: 30, wallHeight: 22, bankingDeg: 0, feature: 'rock_arch_sequence' },
    { pos: [335, -20, -980], canyonWidth: 30, wallHeight: 22, bankingDeg: -8, feature: 'rock_arch_sequence' },
    { pos: [295, -22, -1070], canyonWidth: 30, wallHeight: 18, bankingDeg: -10, feature: 'normal', checkpoint: true },

    // Sector 4: Wide Plaza Funnel Entry
    { pos: [240, -24, -1155], canyonWidth: 54, wallHeight: 18, bankingDeg: 0, feature: 'funnel_squeeze' },
    { pos: [185, -26, -1240], canyonWidth: 42, wallHeight: 18, bankingDeg: 0, feature: 'funnel_squeeze' },
    { pos: [130, -28, -1325], canyonWidth: 28, wallHeight: 18, bankingDeg: 0, feature: 'funnel_squeeze' },
    { pos: [75, -28, -1410], canyonWidth: 23, wallHeight: 16, bankingDeg: 0, feature: 'bridge_deck', checkpoint: true },

    // Sector 5: Elevated Tabletop & Banked Return
    { pos: [25, -28, -1500], canyonWidth: 28, wallHeight: 14, bankingDeg: -10, feature: 'bridge_deck' },
    { pos: [-15, -28, -1595], canyonWidth: 30, wallHeight: 14, bankingDeg: -10, feature: 'tabletop_jump' },
    { pos: [-35, -28, -1690], canyonWidth: 30, wallHeight: 14, bankingDeg: 0, feature: 'tabletop_jump' },
    { pos: [-35, -30, -1790], canyonWidth: 30, wallHeight: 14, bankingDeg: 0, feature: 'bridge_deck', checkpoint: true },

    // Sector 6: Steep Causeway Finish
    { pos: [-35, -42, -1890], canyonWidth: 28, wallHeight: 14, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [-35, -54, -1990], canyonWidth: 28, wallHeight: 14, bankingDeg: 0, feature: 'bridge_deck' },
    { pos: [-35, -58, -2090], canyonWidth: 30, wallHeight: 18, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [-35, -58, -2190], canyonWidth: 32, wallHeight: 20, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
