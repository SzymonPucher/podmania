import type { MapDefinition } from '../types';

export const MAP22_OBSIDIAN_VORTEX: MapDefinition = {
  id: 'map22_obsidian_vortex',
  name: 'Obsidian Vortex',
  subtitle: 'Expert • Starlight Spiral & Plasma Pit',
  description:
    'Midnight starlight crucible combining a 360° corkscrew helix, plasma gate chicanes, toxic hazard trenches, a double-decker overpass, and a void jump.',
  playable: true,
  difficulty: 'expert',
  biome: 'starlight',
  medalsMs: {
    gold: 78000,
    silver: 92000,
    bronze: 112000,
  },
  stations: [
    // Sector 1: Plasma Chicane Launch
    { pos: [0, 0, 20], canyonWidth: 26, wallHeight: 26, bankingDeg: 0, feature: 'normal' },
    { pos: [0, -6, -75], canyonWidth: 26, wallHeight: 26, bankingDeg: 0, feature: 'energy_gates' },
    { pos: [0, -12, -170], canyonWidth: 26, wallHeight: 26, bankingDeg: 0, feature: 'energy_gates' },
    { pos: [15, -16, -265], canyonWidth: 26, wallHeight: 28, bankingDeg: 8, feature: 'energy_gates' },
    { pos: [45, -18, -360], canyonWidth: 28, wallHeight: 28, bankingDeg: 10, feature: 'normal', checkpoint: true },

    // Sector 2: 360° Starlight Vortex Helix
    { pos: [105, -24, -440], canyonWidth: 25, wallHeight: 16, bankingDeg: 18, feature: 'spiral_helix' },
    { pos: [195, -32, -460], canyonWidth: 25, wallHeight: 16, bankingDeg: 20, feature: 'spiral_helix' },
    { pos: [270, -40, -400], canyonWidth: 25, wallHeight: 16, bankingDeg: 20, feature: 'spiral_helix' },
    { pos: [280, -48, -305], canyonWidth: 25, wallHeight: 16, bankingDeg: 20, feature: 'spiral_helix' },
    { pos: [215, -56, -240], canyonWidth: 25, wallHeight: 16, bankingDeg: 20, feature: 'spiral_helix' },
    { pos: [125, -64, -255], canyonWidth: 25, wallHeight: 16, bankingDeg: 18, feature: 'spiral_helix' },
    { pos: [70, -70, -335], canyonWidth: 25, wallHeight: 16, bankingDeg: 12, feature: 'spiral_helix' },
    { pos: [65, -74, -435], canyonWidth: 28, wallHeight: 28, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 3: Double-Decker Span & Void Leap
    { pos: [65, -78, -535], canyonWidth: 32, wallHeight: 30, bankingDeg: 0, feature: 'double_decker' },
    { pos: [65, -82, -635], canyonWidth: 32, wallHeight: 30, bankingDeg: 0, feature: 'double_decker' },
    { pos: [65, -86, -735], canyonWidth: 32, wallHeight: 30, bankingDeg: 0, feature: 'double_decker' },
    { pos: [65, -98, -830], canyonWidth: 26, wallHeight: 28, bankingDeg: 0, feature: 'normal' },
    { pos: [65, -93, -900], canyonWidth: 26, wallHeight: 24, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [65, -98, -955], canyonWidth: 28, wallHeight: 14, bankingDeg: 0, feature: 'void_gap' },
    { pos: [65, -108, -1015], canyonWidth: 30, wallHeight: 30, bankingDeg: 0, feature: 'landing_slope', checkpoint: true },

    // Sector 4: Starlight Cavern & Wallride Bowl
    { pos: [45, -112, -1110], canyonWidth: 22, wallHeight: 34, bankingDeg: -12, feature: 'cave' },
    { pos: [-5, -114, -1195], canyonWidth: 22, wallHeight: 34, bankingDeg: -16, feature: 'cave' },
    { pos: [-75, -114, -1265], canyonWidth: 22, wallHeight: 34, bankingDeg: -14, feature: 'cave' },
    { pos: [-155, -114, -1325], canyonWidth: 32, wallHeight: 32, bankingDeg: 24, feature: 'wallride_bowl' },
    { pos: [-235, -114, -1395], canyonWidth: 34, wallHeight: 34, bankingDeg: 28, feature: 'wallride_bowl' },
    { pos: [-285, -114, -1485], canyonWidth: 30, wallHeight: 32, bankingDeg: 14, feature: 'normal', checkpoint: true },

    // Sector 5: Glowing Hazard Trench & Final Gates
    { pos: [-305, -116, -1585], canyonWidth: 32, wallHeight: 34, bankingDeg: 0, feature: 'hazard_pit' },
    { pos: [-310, -118, -1685], canyonWidth: 32, wallHeight: 34, bankingDeg: 0, feature: 'hazard_pit' },
    { pos: [-310, -120, -1785], canyonWidth: 26, wallHeight: 32, bankingDeg: 0, feature: 'energy_gates' },
    { pos: [-310, -134, -1885], canyonWidth: 26, wallHeight: 32, bankingDeg: 0, feature: 'energy_gates' },
    { pos: [-310, -144, -1985], canyonWidth: 28, wallHeight: 32, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [-310, -144, -2085], canyonWidth: 30, wallHeight: 30, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
