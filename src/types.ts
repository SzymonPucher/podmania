import type * as THREE from 'three';

export type MedalTier = 'none' | 'bronze' | 'silver' | 'gold';

export type RaceState =
  | 'MENU'
  | 'COUNTDOWN'
  | 'RACING'
  | 'WRECKED'
  | 'FINISHED'
  | 'PAUSED';

export type TrackFeature =
  | 'normal'
  | 'cave'
  | 'jump_lip'
  | 'chasm_floor'
  | 'landing_slope'
  | 'finish_basin'
  | 'ice_sheet'
  | 'magma_vent'
  | 'boost_pad'
  | 'sand_dunes'
  | 'ridge_split'
  | 'bridge_deck'
  | 'rough_scree';

export type MapBiome = 'desert' | 'volcanic' | 'glacier' | 'skyway' | 'desert_geode';

export interface TrackStationDef {
  pos: [number, number, number];
  canyonWidth: number;
  wallHeight: number;
  bankingDeg: number;
  feature?: TrackFeature;
  checkpoint?: boolean;
}

export interface MedalTimesMs {
  gold: number;
  silver: number;
  bronze: number;
}

export interface MapDefinition {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  playable: boolean;
  biome?: MapBiome;
  unlockRequirement?: {
    mapId: string;
    minMedal: Exclude<MedalTier, 'none'>;
  };
  stations: TrackStationDef[];
  medalsMs?: MedalTimesMs;
}

export interface MapRecord {
  bestTimeMs: number | null;
  bestScore: number;
  bestMedal: MedalTier;
  checkpointSplitsMs?: number[];
}

export interface SaveData {
  maps: Record<string, MapRecord>;
}

export interface InputSnapshot {
  targetLeft: number;
  targetRight: number;
  leftActiveCode: string | null;
  rightActiveCode: string | null;
  spaceHeld: boolean;
}

export interface PodTelemetry {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  pitch: number;
  roll: number;
  omegaYaw: number;
  pLeft: number;
  pRight: number;
  speedMs: number;
  speedKmh: number;
  groundHeight: number;
  clearance: number;
  isGrounded: boolean;
  airTime: number;
  damperCharge: number;
  damperCooldown: number;
  damperFiring: boolean;
  hullIntegrity: number;
  cockpitYawOffset: number;
  cockpitRollOffset: number;
  cockpitVertOffset: number;
  lastLandingEvent: 'none' | 'perfect_damp' | 'hard_impact' | 'wall_scrape';
  lastLandingDamage: number;
}

export interface GroundSample {
  groundY: number;
  normal: THREE.Vector3;
  found: boolean;
}
