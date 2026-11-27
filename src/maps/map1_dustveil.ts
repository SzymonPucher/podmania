import type { MapDefinition } from '../types';

export const MAP1_DUSTVEIL: MapDefinition = {
  id: 'map1_dustveil',
  name: 'Dustveil Gorge',
  subtitle: 'Sector 01 • Outer Rim Canyon',
  description:
    'Sun-baked dirt canyon with sweeping banked berms, a crystal-lit cavern hairpin, and two massive chasm drops.',
  playable: true,
  difficulty: 'easy',
  biome: 'desert',
  medalsMs: {
    gold: 52000,
    silver: 61000,
    bronze: 75000,
  },
  stations: [
    // Sector 1: Basin Launch (0 - 380m) — heading -Z then sweeping right (+X)
    { pos: [0, 0, 20], canyonWidth: 28, wallHeight: 22, bankingDeg: 0, feature: 'normal' },
    { pos: [0, 0, -60], canyonWidth: 28, wallHeight: 24, bankingDeg: 0, feature: 'normal' },
    { pos: [4, 0, -160], canyonWidth: 26, wallHeight: 26, bankingDeg: 4, feature: 'normal' },
    { pos: [34, 1, -260], canyonWidth: 24, wallHeight: 28, bankingDeg: 11, feature: 'normal' },
    { pos: [95, 2, -350], canyonWidth: 22, wallHeight: 30, bankingDeg: 14, feature: 'normal', checkpoint: true },

    // Sector 2: Twin-Arch Serpentine (380 - 820m) — rhythm S-bends with alternating half-track rock barriers (inside & outside turns)
    { pos: [175, 4, -420], canyonWidth: 24, wallHeight: 34, bankingDeg: 16, feature: 'half_rock_right' },
    { pos: [255, 6, -495], canyonWidth: 24, wallHeight: 36, bankingDeg: -15, feature: 'half_rock_left' },
    { pos: [310, 7, -595], canyonWidth: 24, wallHeight: 36, bankingDeg: -16, feature: 'half_rock_right' },
    { pos: [330, 8, -700], canyonWidth: 24, wallHeight: 38, bankingDeg: 14, feature: 'half_rock_left' },
    { pos: [380, 6, -800], canyonWidth: 21, wallHeight: 40, bankingDeg: 10, feature: 'normal', checkpoint: true },

    // Sector 3: Echoing Cavern (820 - 1260m) — 440m enclosed cave ending in a tight left hairpin
    { pos: [450, 2, -885], canyonWidth: 21, wallHeight: 34, bankingDeg: 6, feature: 'cave' },
    { pos: [525, -2, -965], canyonWidth: 20, wallHeight: 32, bankingDeg: 8, feature: 'cave' },
    { pos: [590, -4, -1055], canyonWidth: 20, wallHeight: 32, bankingDeg: -14, feature: 'cave' },
    { pos: [570, -4, -1155], canyonWidth: 21, wallHeight: 34, bankingDeg: -18, feature: 'cave' },
    { pos: [490, -2, -1210], canyonWidth: 22, wallHeight: 36, bankingDeg: -10, feature: 'cave', checkpoint: true },

    // Sector 4: Mesa Step Jump (1260 - 1640m) — exit cave onto sunlit plateau -> +13° lip -> 14m drop
    { pos: [405, 3, -1255], canyonWidth: 22, wallHeight: 36, bankingDeg: 0, feature: 'normal' },
    { pos: [320, 8, -1310], canyonWidth: 22, wallHeight: 32, bankingDeg: 0, feature: 'normal' },
    { pos: [255, 16, -1355], canyonWidth: 22, wallHeight: 28, bankingDeg: 0, feature: 'jump_lip' },
    { pos: [195, -8, -1395], canyonWidth: 26, wallHeight: 42, bankingDeg: 0, feature: 'chasm_floor' },
    { pos: [120, 1, -1445], canyonWidth: 28, wallHeight: 36, bankingDeg: 0, feature: 'landing_slope' },
    { pos: [45, -7, -1505], canyonWidth: 26, wallHeight: 34, bankingDeg: 6, feature: 'landing_slope', checkpoint: true },

    // Sector 5: Abyssal Cliff Plunge (1640 - 2120m) — fast downhill chute -> sheer cliff -> 44m deep sunken basin
    { pos: [-25, -14, -1580], canyonWidth: 24, wallHeight: 38, bankingDeg: 8, feature: 'normal' },
    { pos: [-75, -18, -1675], canyonWidth: 24, wallHeight: 40, bankingDeg: 0, feature: 'normal' },
    { pos: [-110, -20, -1775], canyonWidth: 24, wallHeight: 38, bankingDeg: 0, feature: 'cliff_drop' },
    { pos: [-145, -64, -1870], canyonWidth: 30, wallHeight: 62, bankingDeg: 0, feature: 'chasm_floor' },
    { pos: [-180, -54, -1965], canyonWidth: 30, wallHeight: 56, bankingDeg: 0, feature: 'landing_slope' },
    { pos: [-215, -62, -2060], canyonWidth: 28, wallHeight: 54, bankingDeg: -4, feature: 'landing_slope', checkpoint: true },

    // Sector 6: Dustveil Sprint (2120 - 2480m) — sweeping monolith chicane into Finish Gate
    { pos: [-240, -64, -2160], canyonWidth: 25, wallHeight: 54, bankingDeg: -10, feature: 'normal' },
    { pos: [-215, -64, -2265], canyonWidth: 24, wallHeight: 54, bankingDeg: 12, feature: 'normal' },
    { pos: [-175, -64, -2365], canyonWidth: 26, wallHeight: 52, bankingDeg: 0, feature: 'finish_basin' },
    { pos: [-160, -64, -2470], canyonWidth: 30, wallHeight: 46, bankingDeg: 0, feature: 'finish_basin' },
  ],
};
