import type { PodModificationDef, PodModificationId } from '../types';

export const POD_CONFIG = {
  // Propulsion & Drag (hits ~376 km/h = 104.4 m/s at 100% + 100%)
  maxForwardAccel: 44.2,
  linearDrag: 0.12,
  quadDrag: 0.0029,
  spoolUpRate: 11.0,
  spoolDownRate: 8.5,
  reverseSnapRate: 14.0,

  // Differential Steering & Dirt Drift
  baseTurnAccel: 9.5,
  highSpeedTurnScale: 0.58,
  airborneTurnScale: 0.28,
  yawDampingGrounded: 8.5,
  yawDampingAirborne: 3.2,
  dirtLateralGrip: 5.8,
  bankCarveBonus: 2.4,
  slideSpeedScrub: 0.08,

  // Motorcycle Lean Dynamics
  maxRollRad: 0.82,
  rollSpringOmega: 13.0,
  rollDampingRatio: 0.88,
  thrustLeanFactor: 0.28,

  // Repulsorlift Hover Suspension
  hoverHeight: 1.85,
  maxRepulsorReach: 3.3,
  gravity: 26.0,
  hoverSpringOmega: 14.0,
  hoverDampingRatio: 0.85,
  slopePitchAlignRate: 9.0,
  airPitchNoseDropRate: 0.7,

  // Air Coasting & Landing Ignition Boost
  airborneLinearDragMult: 0.22,
  airborneQuadDragMult: 0.22,
  airborneDriveScale: 0.08,

  // Mid-Air Thrust Overload & Pre-Touchdown Ignition Window
  minEnginesOffSec: 0.5,
  takeoffThrustGraceSec: 0.25,
  highAirDamageClearance: 7.5,
  highAirThrustDamageRate: 22.0,
  thrustFlareWindowSec: 0.15,
  vectoredGroundLiftAccel: 42.0,

  // Landing Impact & Boost Rewards
  minAirTimeForLandingCheck: 0.30,
  safeImpactSpeed: 10.5,
  vectorBoostBaseAddMs: 19.0,
  vectorBoostBigJumpAddMs: 13.0,
  vectorBoostDurationSec: 1.85,
  vectorBoostExtraAccel: 28.0,
  damagePerExcessSpeedSq: 0.24,
  // Engine Overheat & Cooldown (% per second on 0..100 scale)
  overheatRate100: 10.0,
  coolRate70: 5.0,
  coolRate30: 10.0,
  coolRateIdle: 20.0,
  overheatRecoverThreshold: 70.0,
  overheatHullDamage: 10.0,

  // Pod Modifications
  modWeightScale: 0.95, // -5% acceleration and max speed for tank mods
  nitroTankSec: 5.0,
  nitroPowerAdd: 0.5, // +50% power to both boosters
  nitroOverheatRate: 20.0, // +20% heat/s regardless of applied power
  nitroHullDamageRate: 5.0, // 5% hull/s (up to 25% for full 5s tank)
  coolantTankSec: 5.0,
  coolantCoolRate: 30.0, // -30% heat/s stacked on top of engine power modifiers

  // Wall Collision
  wallCollisionRadius: 2.1,
} as const;

export const POD_MODIFICATIONS: PodModificationDef[] = [
  {
    id: 'none',
    name: 'Unmodified Pod',
    shortName: 'Stock Pod',
    tag: 'Stock Loadout',
    accentColor: '#94a3b8',
    summary: 'Factory-spec twin-turbine podracer with zero weight penalties.',
    bonuses: ['Full 100% base acceleration & top speed', 'Full Vector Landing Boost'],
    drawbacks: ['No auxiliary tank or airborne thrust mod'],
    usesSpace: false,
    tankSeconds: 0,
  },
  {
    id: 'nitro',
    name: 'Nitro Boosters',
    shortName: 'Nitro Boosters',
    tag: 'Mod 01 · Hold Space',
    accentColor: '#f97316',
    summary: '5s pressurized nitro tank usable in bursts for raw twin-booster surge.',
    bonuses: [
      'Hold Space (5s tank, multi-burst): +50% power to both boosters',
    ],
    drawbacks: [
      '-5% overall acceleration & max speed (weight)',
      '+20%/s booster heat while active (regardless of throttle)',
      '-5%/s hull damage while active (up to 25% full tank)',
    ],
    usesSpace: true,
    tankSeconds: POD_CONFIG.nitroTankSec,
  },
  {
    id: 'cooled',
    name: 'Cooled Engines',
    shortName: 'Cooled Engines',
    tag: 'Mod 02 · Hold Space',
    accentColor: '#38bdf8',
    summary: '5s liquid cryo-coolant injection to sustain peak throttle without overheating.',
    bonuses: [
      'Hold Space (5s tank, multi-burst): -30%/s heat on both engines',
      'Stacks directly on top of active engine power heat/cool rates',
    ],
    drawbacks: [
      '-5% overall acceleration & max speed (weight)',
    ],
    usesSpace: true,
    tankSeconds: POD_CONFIG.coolantTankSec,
  },
  {
    id: 'flying',
    name: 'Flying Engines',
    shortName: 'Flying Engines',
    tag: 'Mod 03 · Passive',
    accentColor: '#34d399',
    summary: 'Stabilized aero-turbines built to fire safely and cleanly through big air.',
    bonuses: [
      'Zero airborne engine damage & full ground-level thrust in mid-air',
      'No 0.5s engine cut needed before landing (keep engines on to land safely)',
    ],
    drawbacks: [
      'No speed boost on proper landing',
    ],
    usesSpace: false,
    tankSeconds: 0,
  },
];

export function getModificationById(id: PodModificationId): PodModificationDef {
  return POD_MODIFICATIONS.find((m) => m.id === id) ?? POD_MODIFICATIONS[0];
}

/**
 * Hull damage malfunction tier:
 * - 0: >= 75% hull (nominal, 0% penalty)
 * - 1: < 75% hull (-5% accel & max speed)
 * - 2: < 50% hull (-10% accel & max speed)
 * - 3: < 25% hull (-20% accel & max speed)
 */
export function getHullMalfunctionTier(hullIntegrity: number): 0 | 1 | 2 | 3 {
  if (hullIntegrity < 25) return 3;
  if (hullIntegrity < 50) return 2;
  if (hullIntegrity < 75) return 1;
  return 0;
}

export function getHullPerformanceScale(hullIntegrity: number): number {
  if (hullIntegrity < 25) return 0.8;
  if (hullIntegrity < 50) return 0.9;
  if (hullIntegrity < 75) return 0.95;
  return 1.0;
}

export const FIXED_DT = 1 / 120;
export const WRECK_ANIM_DURATION_SEC = 3.0;
