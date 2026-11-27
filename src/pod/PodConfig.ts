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

  // Wall Collision
  wallCollisionRadius: 2.1,
} as const;

export const FIXED_DT = 1 / 120;
