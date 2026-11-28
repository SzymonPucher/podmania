import type * as THREE from 'three';

export type MedalTier = 'none' | 'bronze' | 'silver' | 'gold';

export type MapDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type PodModificationId = 'none' | 'nitro' | 'cooled' | 'flying';

export interface PodModificationDef {
  id: PodModificationId;
  name: string;
  shortName: string;
  tag: string;
  accentColor: string;
  summary: string;
  bonuses: string[];
  drawbacks: string[];
  usesSpace: boolean;
  tankSeconds: number;
}

export type RaceState =
  | 'MENU'
  | 'COUNTDOWN'
  | 'RACING'
  | 'WRECKING'
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
  | 'sand_dunes'
  | 'ridge_split'
  | 'bridge_deck'
  | 'rough_scree'
  | 'cliff_drop'
  | 'split_terrace'
  | 'pillar_slalom'
  | 'half_rock_left'
  | 'half_rock_right'
  | 'half_pipe'
  | 'wallride_bowl'
  | 'stepped_cascade'
  | 'void_gap'
  | 'double_decker'
  | 'tabletop_jump'
  | 'stalactite_corridor'
  | 'crosswind_zone'
  | 'crumbling_bridge'
  | 'hazard_pit'
  | 'energy_gates'
  | 'debris_field'
  | 'silt_trench'
  | 'off_camber'
  | 'whoops_section'
  | 'water_ford'
  | 'asymmetric_fork'
  | 'spiral_helix'
  | 'double_apex'
  | 'funnel_squeeze'
  | 'rock_arch_sequence';

export type MapBiome =
  | 'desert'
  | 'volcanic'
  | 'glacier'
  | 'skyway'
  | 'desert_geode'
  | 'badlands'
  | 'starlight';

export interface TrackStationDef {
  pos: [number, number, number];
  canyonWidth: number;
  wallHeight: number;
  bankingDeg: number;
  feature?: TrackFeature;
  checkpoint?: boolean;
  /** Optional cap on `void_gap` span length in meters (trims trailing void slices to `landing_slope`). */
  voidGapLengthM?: number;
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
  difficulty?: MapDifficulty;
  biome?: MapBiome;
  laps?: number;
  isLoop?: boolean;
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
  selectedModification?: PodModificationId;
}

export interface InputSnapshot {
  targetLeft: number;
  targetRight: number;
  leftActiveCode: string | null;
  rightActiveCode: string | null;
  spaceHeld: boolean;
}

export interface TouchFingerState {
  active: boolean;
  /** Normalized horizontal screen coordinate [0..1] */
  xNorm: number;
  /** Normalized vertical screen coordinate [0..1] */
  yNorm: number;
  /** Viewport X in CSS pixels */
  clientX: number;
  /** Viewport Y in CSS pixels */
  clientY: number;
  /** Computed throttle [-0.3..1.0] */
  throttle: number;
  /** True when finger has slid into the middle activation zone for nitro/coolant */
  inMiddleZone: boolean;
}

export interface TouchControlsState {
  hasUsedTouch: boolean;
  left: TouchFingerState;
  right: TouchFingerState;
}

export type LandingEventKind =
  | 'none'
  | 'vector_boost'
  | 'damped_landing'
  | 'hard_impact'
  | 'wall_scrape';

export interface EngineMotionOffset {
  x: number;
  y: number;
  z: number;
  pitch: number;
  yaw: number;
  roll: number;
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
  heatLeft: number;
  heatRight: number;
  overheatedLeft: boolean;
  overheatedRight: boolean;
  speedMs: number;
  speedKmh: number;
  groundHeight: number;
  clearance: number;
  isGrounded: boolean;
  airTime: number;
  /** Seconds both engines have been off continuously (need >= 1.0s for landing boost) */
  enginesOffTime: number;
  /** True once both engines have been off for at least 1 second */
  coastReady: boolean;
  /** Active post-landing overdrive boost [0..1] */
  landingBoost: number;
  /** True when applying engine thrust high in the air (damaging hull) */
  airborneOverload: boolean;
  /** Estimated seconds until touchdown while descending (Infinity when grounded/ascending) */
  timeToImpact: number;
  hullIntegrity: number;
  cockpitYawOffset: number;
  cockpitRollOffset: number;
  cockpitVertOffset: number;
  cockpitLatOffset: number;
  cockpitPitchOffset: number;
  cockpitLongOffset: number;
  cockpitLatVel: number;
  cockpitVertVel: number;
  engineLeftOffset: EngineMotionOffset;
  engineRightOffset: EngineMotionOffset;
  lastLandingEvent: LandingEventKind;
  lastLandingDamage: number;
  lastLandingBoostKmh: number;
  lastOverheatDamage: number;
  modification: PodModificationId;
  /** Remaining active modification tank in seconds (5.0s max for nitro/cooled, 0 otherwise) */
  modTankSec: number;
  modTankMaxSec: number;
  nitroActive: boolean;
  coolantActive: boolean;
}

export interface GroundSample {
  groundY: number;
  normal: THREE.Vector3;
  found: boolean;
}

export type WreckCause =
  | 'ground_impact'
  | 'wall_impact'
  | 'cliff_impact'
  | 'overheat'
  | 'air_overload'
  | 'nitro_burn'
  | 'hazard_pit'
  | 'abyss_fall';

export interface WreckImpactInfo {
  cause: WreckCause;
  preImpactVel: THREE.Vector3;
  impactNormal: THREE.Vector3;
  impactSpeed: number;
  omegaYaw: number;
  pitchVel: number;
  rollVel: number;
  overheatedLeft: boolean;
  overheatedRight: boolean;
  pLeftAtWreck: number;
  pRightAtWreck: number;
}
