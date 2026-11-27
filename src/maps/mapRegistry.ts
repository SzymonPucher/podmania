import type { MapDefinition } from '../types';
import { MAP1_DUSTVEIL } from './map1_dustveil';
import { MAP2_CRIMSON_RIFT } from './map2_crimson_rift';
import { MAP3_FROSTSPIRE } from './map3_frostspire';
import { MAP4_ZENITH_SKYWAY } from './map4_zenith_skyway';
import { MAP5_DUNE_LABYRINTH } from './map5_dune_labyrinth';

export const MAP_REGISTRY: MapDefinition[] = [
  MAP1_DUSTVEIL,
  MAP2_CRIMSON_RIFT,
  MAP3_FROSTSPIRE,
  MAP4_ZENITH_SKYWAY,
  MAP5_DUNE_LABYRINTH,
];

export function getMapById(id: string): MapDefinition {
  return MAP_REGISTRY.find((m) => m.id === id) ?? MAP1_DUSTVEIL;
}
