import type { MapDefinition } from '../types';
import { MAP1_DUSTVEIL } from './map1_dustveil';

export const MAP_CRIMSON_RIFT_PLACEHOLDER: MapDefinition = {
  id: 'map2_crimson_rift',
  name: 'Crimson Rift',
  subtitle: 'Sector 02 • Basalt Spire Trench',
  description:
    'Volcanic salt-flat chasms and twin-ledge canyon split routes. Coming soon after Dustveil Gorge.',
  playable: false,
  unlockRequirement: {
    mapId: 'map1_dustveil',
    minMedal: 'silver',
  },
  stations: [],
};

export const MAP_REGISTRY: MapDefinition[] = [
  MAP1_DUSTVEIL,
  MAP_CRIMSON_RIFT_PLACEHOLDER,
];

export function getMapById(id: string): MapDefinition {
  return MAP_REGISTRY.find((m) => m.id === id) ?? MAP1_DUSTVEIL;
}
