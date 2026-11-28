import type { MapDefinition, MapDifficulty } from '../types';
import { MAP1_DUSTVEIL } from './map1_dustveil';
import { MAP2_CRIMSON_RIFT } from './map2_crimson_rift';
import { MAP3_FROSTSPIRE } from './map3_frostspire';
import { MAP4_ZENITH_SKYWAY } from './map4_zenith_skyway';
import { MAP5_DUNE_LABYRINTH } from './map5_dune_labyrinth';
import { MAP6_SUNSTONE_ARCHES } from './map6_sunstone_arches';
import { MAP7_EMERALD_OASIS_LOOP } from './map7_emerald_oasis_loop';
import { MAP8_GLACIER_HALFPIPE } from './map8_glacier_halfpipe';
import { MAP9_CLOUDSPAN_CAUSEWAY } from './map9_cloudspan_causeway';
import { MAP10_AMBER_MESA } from './map10_amber_mesa';
import { MAP11_CINDER_BOWL_LOOP } from './map11_cinder_bowl_loop';
import { MAP12_COPPERHEAD_WHOOPS } from './map12_copperhead_whoops';
import { MAP13_OVERPASS_CANYON } from './map13_overpass_canyon';
import { MAP14_ZEPHYR_RIDGE } from './map14_zephyr_ridge';
import { MAP15_SHALE_CASCADE } from './map15_shale_cascade';
import { MAP16_ACID_CALDERA } from './map16_acid_caldera';
import { MAP17_REACTOR_GATES_LOOP } from './map17_reactor_gates_loop';
import { MAP18_WIDOWMAKER_HELIX } from './map18_widowmaker_helix';
import { MAP19_GREAT_RIFT_ODYSSEY } from './map19_great_rift_odyssey';
import { MAP20_SKYFALL_RUINS } from './map20_skyfall_ruins';
import { MAP21_GRAVEYARD_GAUNTLET } from './map21_graveyard_gauntlet';
import { MAP22_OBSIDIAN_VORTEX } from './map22_obsidian_vortex';
import { MAP23_CRYO_ABYSS_RUN } from './map23_cryo_abyss_run';
import { MAP24_COLOSSUS_GRAND_PRIX } from './map24_colossus_grand_prix';
import { MAP25_TRANS_PLANETARY_MARATHON } from './map25_trans_planetary_marathon';

export const DIFFICULTY_TIERS: {
  id: MapDifficulty;
  label: string;
  subtitle: string;
  color: string;
}[] = [
  {
    id: 'easy',
    label: 'Easy',
    subtitle: 'Canyon Initiate • Forgiving widths & foundational terrain',
    color: '#34d399',
  },
  {
    id: 'medium',
    label: 'Medium',
    subtitle: 'Skilled Runner • Multi-tier routes, wallrides & elemental hazards',
    color: '#38bdf8',
  },
  {
    id: 'hard',
    label: 'Hard',
    subtitle: 'Rift Veteran • High-risk ledges, barrier chicanes & continental marathons',
    color: '#f59e0b',
  },
  {
    id: 'expert',
    label: 'Expert',
    subtitle: 'Apex Legend • True void leaps, crumbling spans & championship gauntlets',
    color: '#f87171',
  },
];

export const MAP_REGISTRY: MapDefinition[] = [
  // Easy (6 maps)
  MAP1_DUSTVEIL,
  MAP6_SUNSTONE_ARCHES,
  MAP7_EMERALD_OASIS_LOOP,
  MAP8_GLACIER_HALFPIPE,
  MAP9_CLOUDSPAN_CAUSEWAY,
  MAP10_AMBER_MESA,

  // Medium (7 maps)
  MAP3_FROSTSPIRE,
  MAP4_ZENITH_SKYWAY,
  MAP11_CINDER_BOWL_LOOP,
  MAP12_COPPERHEAD_WHOOPS,
  MAP13_OVERPASS_CANYON,
  MAP14_ZEPHYR_RIDGE,
  MAP15_SHALE_CASCADE,

  // Hard (6 maps)
  MAP2_CRIMSON_RIFT,
  MAP5_DUNE_LABYRINTH,
  MAP16_ACID_CALDERA,
  MAP17_REACTOR_GATES_LOOP,
  MAP18_WIDOWMAKER_HELIX,
  MAP19_GREAT_RIFT_ODYSSEY,

  // Expert (6 maps)
  MAP20_SKYFALL_RUINS,
  MAP21_GRAVEYARD_GAUNTLET,
  MAP22_OBSIDIAN_VORTEX,
  MAP23_CRYO_ABYSS_RUN,
  MAP24_COLOSSUS_GRAND_PRIX,
  MAP25_TRANS_PLANETARY_MARATHON,
];

export function getMapById(id: string): MapDefinition {
  return MAP_REGISTRY.find((m) => m.id === id) ?? MAP1_DUSTVEIL;
}
