import type { MapDefinition } from '../types';

export const MAP8_GLACIER_HALFPIPE: MapDefinition = {
  id: 'map8_glacier_halfpipe',
  name: 'Glacial U-Trough',
  subtitle: 'Easy • Carved Snow Half-Pipe',
  description:
    'Smooth snow-carved half-pipe channels, gentle four-step glacial cascades, meltwater cooling crossings, and a fast downhill chute.',
  playable: true,
  difficulty: 'easy',
  biome: 'glacier',
  medalsMs: {
    gold: 51000,
    silver: 60000,
    bronze: 74000,
  },
  stations: [
    // Sector 1: Steep Opening Chute
    { pos: [0, 0, 20], canyonWidth: 30, wallHeight: 24, bankingDeg: 0, feature: 'normal' },
    { pos: [0, -12, -70], canyonWidth: 30, wallHeight: 26, bankingDeg: 0, feature: 'normal' },
    { pos: [-10, -24, -165], canyonWidth: 32, wallHeight: 28, bankingDeg: -6, feature: 'half_pipe' },
    { pos: [-45, -28, -255], canyonWidth: 32, wallHeight: 30, bankingDeg: -10, feature: 'half_pipe' },
    { pos: [-100, -28, -340], canyonWidth: 32, wallHeight: 30, bankingDeg: -10, feature: 'half_pipe', checkpoint: true },

    // Sector 2: S-Bend Half-Pipe
    { pos: [-165, -28, -415], canyonWidth: 32, wallHeight: 30, bankingDeg: -8, feature: 'half_pipe' },
    { pos: [-215, -28, -500], canyonWidth: 32, wallHeight: 30, bankingDeg: 10, feature: 'half_pipe' },
    { pos: [-235, -28, -595], canyonWidth: 32, wallHeight: 30, bankingDeg: 12, feature: 'half_pipe' },
    { pos: [-215, -28, -690], canyonWidth: 30, wallHeight: 30, bankingDeg: 8, feature: 'normal', checkpoint: true },

    // Sector 3: Glacial Stepped Cascade
    { pos: [-175, -34, -780], canyonWidth: 30, wallHeight: 32, bankingDeg: 0, feature: 'stepped_cascade' },
    { pos: [-130, -42, -870], canyonWidth: 30, wallHeight: 34, bankingDeg: 0, feature: 'stepped_cascade' },
    { pos: [-85, -50, -960], canyonWidth: 30, wallHeight: 34, bankingDeg: 0, feature: 'stepped_cascade' },
    { pos: [-40, -58, -1050], canyonWidth: 30, wallHeight: 34, bankingDeg: 0, feature: 'stepped_cascade' },
    { pos: [0, -62, -1140], canyonWidth: 32, wallHeight: 32, bankingDeg: 0, feature: 'water_ford', checkpoint: true },

    // Sector 4: Meltwater Basin & Cave Arch
    { pos: [40, -62, -1235], canyonWidth: 32, wallHeight: 30, bankingDeg: 6, feature: 'water_ford' },
    { pos: [90, -62, -1325], canyonWidth: 28, wallHeight: 32, bankingDeg: 10, feature: 'cave' },
    { pos: [145, -64, -1410], canyonWidth: 28, wallHeight: 32, bankingDeg: 12, feature: 'cave' },
    { pos: [185, -64, -1505], canyonWidth: 28, wallHeight: 32, bankingDeg: -8, feature: 'cave' },
    { pos: [195, -62, -1605], canyonWidth: 30, wallHeight: 32, bankingDeg: 0, feature: 'normal', checkpoint: true },

    // Sector 5: Shelf Jump & Final Half-Pipe
    { pos: [185, -58, -1700], canyonWidth: 28, wallHeight: 30, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [170, -80, -1795], canyonWidth: 32, wallHeight: 44, bankingDeg: 0, feature: 'chasm_floor' },
    { pos: [155, -72, -1890], canyonWidth: 32, wallHeight: 38, bankingDeg: 0, feature: 'landing_slope' },
    { pos: [140, -76, -1985], canyonWidth: 32, wallHeight: 34, bankingDeg: -8, feature: 'half_pipe', checkpoint: true },

    // Sector 6: Downhill Glacial Sprint
    { pos: [120, -88, -2085], canyonWidth: 30, wallHeight: 34, bankingDeg: 0, feature: 'normal' },
    { pos: [110, -100, -2185], canyonWidth: 30, wallHeight: 34, bankingDeg: 0, feature: 'normal' },
    { pos: [105, -104, -2285], canyonWidth: 32, wallHeight: 32, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [105, -104, -2385], canyonWidth: 34, wallHeight: 30, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
