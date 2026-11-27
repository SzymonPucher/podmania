import * as THREE from 'three';
import type { InputSnapshot, PodModificationId, PodTelemetry } from '../types';
import type { TrackBuilder } from '../world/TrackBuilder';
import { getModificationById, POD_CONFIG } from './PodConfig';

export interface PhysicsStateSnapshot {
  pos: THREE.Vector3;
  yaw: number;
  pitch: number;
}

export class PodPhysics {
  public readonly state: PodTelemetry;

  private modification: PodModificationId = 'none';
  private rollVel = 0;
  private cockpitYawVel = 0;
  private cockpitRollVel = 0;
  private cockpitVertVel = 0;
  private prevOmegaYaw = 0;
  private prevVelY = 0;

  // Per-jump sequence tracking
  private flareWindowPeakMinThrust = 0;
  private peakAirImpactSpeed = 0;
  private ignitionStartedInFlareWindow = false;

  private readonly tmpForward = new THREE.Vector3();
  private readonly tmpRight = new THREE.Vector3();
  private readonly tmpNormal = new THREE.Vector3(0, 1, 0);

  constructor() {
    this.state = {
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      roll: 0,
      omegaYaw: 0,
      pLeft: 0,
      pRight: 0,
      heatLeft: 0,
      heatRight: 0,
      overheatedLeft: false,
      overheatedRight: false,
      speedMs: 0,
      speedKmh: 0,
      groundHeight: 0,
      clearance: POD_CONFIG.hoverHeight,
      isGrounded: true,
      airTime: 0,
      enginesOffTime: 0,
      coastReady: false,
      landingBoost: 0,
      airborneOverload: false,
      timeToImpact: Infinity,
      hullIntegrity: 100,
      cockpitYawOffset: 0,
      cockpitRollOffset: 0,
      cockpitVertOffset: 0,
      lastLandingEvent: 'none',
      lastLandingDamage: 0,
      lastLandingBoostKmh: 0,
      lastOverheatDamage: 0,
      modification: 'none',
      modTankSec: 0,
      modTankMaxSec: 0,
      nitroActive: false,
      coolantActive: false,
    };
  }

  public setModification(mod: PodModificationId): void {
    this.modification = mod;
    const def = getModificationById(mod);
    this.state.modification = mod;
    this.state.modTankMaxSec = def.tankSeconds;
    this.state.modTankSec = def.tankSeconds;
    this.state.nitroActive = false;
    this.state.coolantActive = false;
  }

  public getModification(): PodModificationId {
    return this.modification;
  }

  public resetToPose(
    pos: THREE.Vector3,
    yaw: number,
    pitch = 0,
    tankRemaining?: number
  ): void {
    const s = this.state;
    const modDef = getModificationById(this.modification);
    s.pos.copy(pos);
    s.vel.set(0, 0, 0);
    s.yaw = yaw;
    s.pitch = pitch;
    s.roll = 0;
    s.omegaYaw = 0;
    s.pLeft = 0;
    s.pRight = 0;
    s.heatLeft = 0;
    s.heatRight = 0;
    s.overheatedLeft = false;
    s.overheatedRight = false;
    s.speedMs = 0;
    s.speedKmh = 0;
    s.groundHeight = pos.y - POD_CONFIG.hoverHeight;
    s.clearance = POD_CONFIG.hoverHeight;
    s.isGrounded = true;
    s.airTime = 0;
    s.enginesOffTime = 0;
    s.coastReady = false;
    s.landingBoost = 0;
    s.airborneOverload = false;
    s.timeToImpact = Infinity;
    s.hullIntegrity = 100;
    s.cockpitYawOffset = 0;
    s.cockpitRollOffset = 0;
    s.cockpitVertOffset = 0;
    s.lastLandingEvent = 'none';
    s.lastLandingDamage = 0;
    s.lastLandingBoostKmh = 0;
    s.lastOverheatDamage = 0;
    s.modification = this.modification;
    s.modTankMaxSec = modDef.tankSeconds;
    s.modTankSec =
      tankRemaining !== undefined
        ? THREE.MathUtils.clamp(tankRemaining, 0, modDef.tankSeconds)
        : modDef.tankSeconds;
    s.nitroActive = false;
    s.coolantActive = false;

    this.rollVel = 0;
    this.cockpitYawVel = 0;
    this.cockpitRollVel = 0;
    this.cockpitVertVel = 0;
    this.prevOmegaYaw = 0;
    this.prevVelY = 0;

    this.flareWindowPeakMinThrust = 0;
    this.peakAirImpactSpeed = 0;
    this.ignitionStartedInFlareWindow = false;
  }

  public step(
    dt: number,
    input: InputSnapshot,
    track: TrackBuilder,
    allowDrive: boolean,
    allowCoolant = true
  ): void {
    const s = this.state;
    s.lastLandingEvent = 'none';
    s.lastLandingDamage = 0;
    s.lastLandingBoostKmh = 0;
    s.lastOverheatDamage = 0;
    s.airborneOverload = false;
    s.nitroActive = false;
    s.coolantActive = false;

    const isWrecked = s.hullIntegrity <= 0;
    const driveEnabled = allowDrive && !isWrecked;
    const hullScale = s.hullIntegrity < 30 ? 0.9 + (s.hullIntegrity / 30) * 0.1 : 1.0;

    const isNitroMod = this.modification === 'nitro';
    const isCooledMod = this.modification === 'cooled';
    const isFlyingMod = this.modification === 'flying';
    const weightMult = isNitroMod || isCooledMod ? POD_CONFIG.modWeightScale : 1.0;

    // 0. Active Modification Tanks (Spacebar)
    let nitroFrac = 0;
    let coolantFrac = 0;
    if (
      isNitroMod &&
      driveEnabled &&
      input.spaceHeld &&
      s.modTankSec > 0 &&
      (!s.overheatedLeft || !s.overheatedRight)
    ) {
      const usedDt = Math.min(dt, s.modTankSec);
      s.modTankSec = Math.max(0, s.modTankSec - usedDt);
      nitroFrac = usedDt / dt;
      s.nitroActive = usedDt > 0;
      // Nitro damages hull at 5% per second (up to 25% across full 5s tank)
      s.hullIntegrity = Math.max(
        0,
        s.hullIntegrity - POD_CONFIG.nitroHullDamageRate * usedDt
      );
    } else if (
      isCooledMod &&
      driveEnabled &&
      allowCoolant &&
      input.spaceHeld &&
      s.modTankSec > 0
    ) {
      const usedDt = Math.min(dt, s.modTankSec);
      s.modTankSec = Math.max(0, s.modTankSec - usedDt);
      coolantFrac = usedDt / dt;
      s.coolantActive = usedDt > 0;
    }

    const nitroHeatRate = s.nitroActive
      ? POD_CONFIG.nitroOverheatRate * nitroFrac
      : null;
    const extraCoolRate = s.coolantActive
      ? POD_CONFIG.coolantCoolRate * coolantFrac
      : 0;

    // 1. Per-Engine Overheat & Spooling (overheated engine forced idle until cooled to 70%)
    const leftHeatState = this.updateEngineHeat(
      s.heatLeft,
      s.overheatedLeft,
      driveEnabled ? input.targetLeft : 0,
      dt,
      nitroHeatRate,
      extraCoolRate
    );
    const leftJustOverheated = !s.overheatedLeft && leftHeatState.overheated;
    s.heatLeft = leftHeatState.heat;
    s.overheatedLeft = leftHeatState.overheated;

    const rightHeatState = this.updateEngineHeat(
      s.heatRight,
      s.overheatedRight,
      driveEnabled ? input.targetRight : 0,
      dt,
      nitroHeatRate,
      extraCoolRate
    );
    const rightJustOverheated = !s.overheatedRight && rightHeatState.overheated;
    s.heatRight = rightHeatState.heat;
    s.overheatedRight = rightHeatState.overheated;

    if (leftJustOverheated || rightJustOverheated) {
      const overheatCount = (leftJustOverheated ? 1 : 0) + (rightJustOverheated ? 1 : 0);
      const dmg = overheatCount * POD_CONFIG.overheatHullDamage;
      s.hullIntegrity = Math.max(0, s.hullIntegrity - dmg);
      s.lastOverheatDamage = dmg;
    }

    const nitroPowerAdd = s.nitroActive ? POD_CONFIG.nitroPowerAdd * nitroFrac : 0;
    const effectiveTargetLeft = s.overheatedLeft
      ? 0
      : input.targetLeft + nitroPowerAdd;
    const effectiveTargetRight = s.overheatedRight
      ? 0
      : input.targetRight + nitroPowerAdd;

    // Still rev visually during countdown when not overheated
    s.pLeft = this.spoolEngine(s.pLeft, effectiveTargetLeft, dt);
    s.pRight = this.spoolEngine(s.pRight, effectiveTargetRight, dt);

    if (s.landingBoost > 0) {
      s.landingBoost = Math.max(
        0,
        s.landingBoost - dt / POD_CONFIG.vectorBoostDurationSec
      );
    }

    const effLeft = driveEnabled ? s.pLeft * hullScale : 0;
    const effRight = driveEnabled ? s.pRight * hullScale : 0;
    const fwdInputLevel = driveEnabled
      ? (Math.max(0, effectiveTargetLeft) + Math.max(0, effectiveTargetRight)) * 0.5
      : 0;
    const bothEnginesOff =
      driveEnabled && effectiveTargetLeft === 0 && effectiveTargetRight === 0;
    const bothEnginesActiveForward =
      driveEnabled && effectiveTargetLeft > 0 && effectiveTargetRight > 0;
    const minForwardInput = bothEnginesActiveForward
      ? Math.min(effectiveTargetLeft, effectiveTargetRight)
      : 0;

    const horizSpeed = Math.hypot(s.vel.x, s.vel.z);
    const nearestSlice = track.findNearestSlice(s.pos.x, s.pos.z, s.pos.y);
    const currentFeature = nearestSlice.feature;
    const relSliceX = s.pos.x - nearestSlice.center.x;
    const relSliceZ = s.pos.z - nearestSlice.center.z;
    const sliceLatDist = relSliceX * nearestSlice.right.x + relSliceZ * nearestSlice.right.z;
    const absSliceLatFrac =
      Math.abs(sliceLatDist) / Math.max(1, nearestSlice.canyonWidth * 0.5);

    // 2. Differential Yaw & Heading
    const speedFactor =
      1 / (1 + (horizSpeed / 80) * (1 - POD_CONFIG.highSpeedTurnScale));
    const diff = effRight - effLeft; // + => turns LEFT (+yaw), - => turns RIGHT (-yaw)
    const turnAuthority = s.isGrounded ? 1.0 : POD_CONFIG.airborneTurnScale;
    const yawDamp = s.isGrounded
      ? POD_CONFIG.yawDampingGrounded
      : POD_CONFIG.yawDampingAirborne;

    const yawAccel =
      diff * POD_CONFIG.baseTurnAccel * speedFactor * turnAuthority -
      s.omegaYaw * yawDamp;
    s.omegaYaw += yawAccel * dt;
    s.yaw += s.omegaYaw * dt;

    // 3. Motorcycle Lean (roll has same sign as omegaYaw)
    const centripetalLean = Math.atan2(horizSpeed * s.omegaYaw, POD_CONFIG.gravity);
    let targetRoll = THREE.MathUtils.clamp(
      centripetalLean * 1.15 + diff * POD_CONFIG.thrustLeanFactor,
      -POD_CONFIG.maxRollRad,
      POD_CONFIG.maxRollRad
    );
    if (!s.isGrounded) {
      targetRoll *= 0.5;
    }
    const wR = POD_CONFIG.rollSpringOmega;
    const zR = POD_CONFIG.rollDampingRatio;
    const rollAccel = wR * wR * (targetRoll - s.roll) - 2 * zR * wR * this.rollVel;
    this.rollVel += rollAccel * dt;
    s.roll += this.rollVel * dt;

    // 4. Multi-Probe Ground Sampling (sampled before propulsion & landing checks)
    this.tmpForward.set(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
    this.tmpRight.set(Math.cos(s.yaw), 0, -Math.sin(s.yaw));

    const pC = track.sampleGround(s.pos.x, s.pos.y, s.pos.z);
    const pL = track.sampleGround(
      s.pos.x - this.tmpRight.x * 1.35 + this.tmpForward.x * 1.8,
      s.pos.y,
      s.pos.z - this.tmpRight.z * 1.35 + this.tmpForward.z * 1.8
    );
    const pR = track.sampleGround(
      s.pos.x + this.tmpRight.x * 1.35 + this.tmpForward.x * 1.8,
      s.pos.y,
      s.pos.z + this.tmpRight.z * 1.35 + this.tmpForward.z * 1.8
    );
    const pBack = track.sampleGround(
      s.pos.x - this.tmpForward.x * 3.2,
      s.pos.y,
      s.pos.z - this.tmpForward.z * 3.2
    );

    const avgGroundY = (pC.groundY + pL.groundY + pR.groundY + pBack.groundY) * 0.25;
    this.tmpNormal
      .copy(pC.normal)
      .add(pL.normal)
      .add(pR.normal)
      .add(pBack.normal)
      .normalize();

    s.groundHeight = avgGroundY;
    const h = s.pos.y - avgGroundY;
    s.clearance = h;

    let vFwd = s.vel.x * this.tmpForward.x + s.vel.z * this.tmpForward.z;
    let vLat = s.vel.x * this.tmpRight.x + s.vel.z * this.tmpRight.z;

    const slopeTanY =
      -(this.tmpNormal.x * this.tmpForward.x + this.tmpNormal.z * this.tmpForward.z) /
      Math.max(0.25, this.tmpNormal.y);
    const groundVelY = vFwd * slopeTanY;
    const hDot = s.vel.y - groundVelY;

    const touchdownHeight = POD_CONFIG.hoverHeight * 1.22;
    const withinRepulsor = h <= POD_CONFIG.maxRepulsorReach;
    const stillPlungingFromJump =
      s.airTime >= POD_CONFIG.minAirTimeForLandingCheck &&
      h > touchdownHeight &&
      hDot < -1.5;

    const wasGrounded = s.isGrounded;
    s.isGrounded = withinRepulsor && !stillPlungingFromJump;

    // Estimate Time-To-Impact (seconds until reaching touchdown height)
    const closingSpeed = Math.max(-s.vel.y, -hDot);
    const tti =
      !s.isGrounded && closingSpeed > 1.0
        ? Math.max(0, (h - touchdownHeight) / closingSpeed)
        : Infinity;
    s.timeToImpact = tti;

    // 5. Horizontal Propulsion, Air Coasting & Overdrive Boost
    const flyingThrustInAir =
      isFlyingMod && !s.isGrounded && (Math.abs(effLeft) > 0.05 || Math.abs(effRight) > 0.05);

    let driveAccel =
      (effLeft + effRight) *
      0.5 *
      (POD_CONFIG.maxForwardAccel * weightMult) *
      (s.isGrounded || isFlyingMod ? 1.0 : POD_CONFIG.airborneDriveScale);

    if (s.landingBoost > 0 && s.isGrounded && driveEnabled) {
      driveAccel += s.landingBoost * POD_CONFIG.vectorBoostExtraAccel;
    }

    // Abyss fall check on true void gaps and crumbling bridges
    if (
      (currentFeature === 'void_gap' || currentFeature === 'crumbling_bridge') &&
      s.pos.y < nearestSlice.center.y - 26.0
    ) {
      s.hullIntegrity = 0;
    }

    // Lateral crosswind gusts
    if (currentFeature === 'crosswind_zone' && driveEnabled) {
      const gustAccel = 11.5 * (nearestSlice.windDir ?? 1);
      s.vel.x += nearestSlice.right.x * gustAccel * dt;
      s.vel.z += nearestSlice.right.z * gustAccel * dt;
    }

    // Recalculate forward/lateral velocity components after crosswind
    vFwd = s.vel.x * this.tmpForward.x + s.vel.z * this.tmpForward.z;
    vLat = s.vel.x * this.tmpRight.x + s.vel.z * this.tmpRight.z;

    let terrainDragMult =
      s.isGrounded || flyingThrustInAir ? 1.0 : POD_CONFIG.airborneLinearDragMult;
    let terrainGripMult = 1.0;
    if (s.isGrounded) {
      if (currentFeature === 'sand_dunes') {
        terrainDragMult = 1.2;
        terrainGripMult = 0.85;
      } else if (currentFeature === 'rough_scree') {
        terrainDragMult = 1.28;
        terrainGripMult = 0.9;
      } else if (currentFeature === 'bridge_deck' || currentFeature === 'double_decker' || currentFeature === 'spiral_helix') {
        terrainDragMult = 0.9;
        terrainGripMult = 1.3;
      } else if (currentFeature === 'half_pipe') {
        terrainDragMult = 0.94;
        terrainGripMult = 1.25;
      } else if (currentFeature === 'wallride_bowl') {
        terrainDragMult = 0.92;
        terrainGripMult = 1.55;
      } else if (currentFeature === 'off_camber') {
        terrainDragMult = 1.0;
        terrainGripMult = 0.76;
      } else if (currentFeature === 'whoops_section') {
        terrainDragMult = 1.12;
        terrainGripMult = 0.9;
      } else if (currentFeature === 'water_ford') {
        terrainDragMult = 1.22;
        terrainGripMult = 0.88;
        if (!s.overheatedLeft) s.heatLeft = Math.max(0, s.heatLeft - 26.0 * dt);
        if (!s.overheatedRight) s.heatRight = Math.max(0, s.heatRight - 26.0 * dt);
      } else if (currentFeature === 'silt_trench') {
        const ribbonCenter = Math.sin(nearestSlice.distance * 0.045) * nearestSlice.canyonWidth * 0.21;
        if (Math.abs(sliceLatDist - ribbonCenter) > 5.0) {
          terrainDragMult = 1.82;
          terrainGripMult = 0.68;
        } else {
          terrainDragMult = 0.95;
          terrainGripMult = 1.15;
        }
      } else if (currentFeature === 'asymmetric_fork') {
        if (sliceLatDist < -4.0) {
          terrainDragMult = 0.86;
          terrainGripMult = 1.25;
        } else {
          terrainDragMult = 1.06;
        }
      } else if (currentFeature === 'hazard_pit' && absSliceLatFrac < 0.4) {
        terrainDragMult = 1.65;
        terrainGripMult = 0.8;
        if (driveEnabled) {
          s.hullIntegrity = Math.max(0, s.hullIntegrity - 5.5 * dt);
          s.heatLeft = Math.min(100, s.heatLeft + 18.0 * dt);
          s.heatRight = Math.min(100, s.heatRight + 18.0 * dt);
        }
      }
    }

    const quadDragEff =
      (POD_CONFIG.quadDrag / weightMult) *
      (s.isGrounded || flyingThrustInAir ? 1.0 : POD_CONFIG.airborneQuadDragMult) *
      (1 - 0.48 * s.landingBoost);

    const dragAccel =
      POD_CONFIG.linearDrag * terrainDragMult * vFwd +
      quadDragEff * vFwd * Math.abs(vFwd) +
      (s.isGrounded ? POD_CONFIG.slideSpeedScrub * Math.abs(vLat) * Math.sign(vFwd) : 0);

    const gripRate = s.isGrounded
      ? (POD_CONFIG.dirtLateralGrip +
          Math.abs(Math.sin(s.roll)) * POD_CONFIG.bankCarveBonus) *
        terrainGripMult
      : 0.35;

    vFwd += (driveAccel - dragAccel) * dt;
    vLat -= vLat * Math.min(1, gripRate * dt);

    s.vel.x = this.tmpForward.x * vFwd + this.tmpRight.x * vLat;
    s.vel.z = this.tmpForward.z * vFwd + this.tmpRight.z * vLat;

    // 6. Track 1s Engines-Off Coasting & Pre-Touchdown Ignition
    if (bothEnginesOff) {
      if (!this.ignitionStartedInFlareWindow) {
        s.enginesOffTime += dt;
        if (s.enginesOffTime >= POD_CONFIG.minEnginesOffSec) {
          s.coastReady = true;
        }
      }
    } else if (s.isGrounded && s.airTime === 0) {
      s.enginesOffTime = 0;
      s.coastReady = false;
      this.ignitionStartedInFlareWindow = false;
    } else if (
      !s.isGrounded &&
      !this.ignitionStartedInFlareWindow &&
      tti > POD_CONFIG.thrustFlareWindowSec &&
      s.airTime > POD_CONFIG.takeoffThrustGraceSec
    ) {
      // Turning engines back on too early in mid-air resets the 1s coast
      s.enginesOffTime = 0;
      s.coastReady = false;
    }

    let aVectoredLift = 0;

    if (!s.isGrounded) {
      s.airTime += dt;

      const curImpactNormalSpeed = -(
        s.vel.x * this.tmpNormal.x +
        s.vel.y * this.tmpNormal.y +
        s.vel.z * this.tmpNormal.z
      );
      if (curImpactNormalSpeed > this.peakAirImpactSpeed) {
        this.peakAirImpactSpeed = curImpactNormalSpeed;
      }

      // Applying thrust while airborne high up damages the pod (bypassed by Flying Engines)
      if (
        !isFlyingMod &&
        driveEnabled &&
        s.airTime > POD_CONFIG.takeoffThrustGraceSec &&
        tti > POD_CONFIG.thrustFlareWindowSec &&
        fwdInputLevel > 0 &&
        h > POD_CONFIG.highAirDamageClearance
      ) {
        const altSeverity = THREE.MathUtils.clamp(
          (h - POD_CONFIG.highAirDamageClearance) / 14.0,
          0.38,
          1.5
        );
        const airDmg =
          POD_CONFIG.highAirThrustDamageRate * fwdInputLevel * altSeverity * dt;
        s.hullIntegrity = Math.max(0, s.hullIntegrity - airDmg);
        s.airborneOverload = true;
      }

      // Final pre-touchdown ignition window ("right before hitting the ground")
      if (
        (isFlyingMod || s.coastReady) &&
        (this.ignitionStartedInFlareWindow || tti <= POD_CONFIG.thrustFlareWindowSec) &&
        h < 16.0 &&
        s.vel.y < -1.0 &&
        bothEnginesActiveForward
      ) {
        this.ignitionStartedInFlareWindow = true;
        if (minForwardInput > this.flareWindowPeakMinThrust) {
          this.flareWindowPeakMinThrust = minForwardInput;
        }
        aVectoredLift = minForwardInput * POD_CONFIG.vectoredGroundLiftAccel;
      }
    } else if (
      !wasGrounded ||
      (s.airTime >= POD_CONFIG.minAirTimeForLandingCheck && h <= touchdownHeight)
    ) {
      // Touchdown Resolution
      if (s.airTime >= POD_CONFIG.minAirTimeForLandingCheck) {
        const currentImpactSpeed = -(
          s.vel.x * this.tmpNormal.x +
          s.vel.y * this.tmpNormal.y +
          s.vel.z * this.tmpNormal.z
        );
        const rawImpactSpeed = Math.max(
          currentImpactSpeed,
          this.peakAirImpactSpeed * 0.92
        );

        const effectiveIgnitionThrust = Math.max(
          minForwardInput,
          this.flareWindowPeakMinThrust
        );

        if (isFlyingMod) {
          if (minForwardInput > 0) {
            // Flying Engines: no 0.5s shutoff required, engines on -> zero damage, NO speed boost
            const targetSlopeVelY = vFwd * slopeTanY;
            s.vel.y = Math.max(s.vel.y * 0.2, targetSlopeVelY - 1.5);
            s.vel.x = this.tmpForward.x * vFwd + this.tmpRight.x * (vLat * 0.5);
            s.vel.z = this.tmpForward.z * vFwd + this.tmpRight.z * (vLat * 0.5);
            if (rawImpactSpeed > POD_CONFIG.safeImpactSpeed * 0.7 || s.airTime >= 0.6) {
              s.lastLandingEvent = 'damped_landing';
            }
          } else if (rawImpactSpeed > POD_CONFIG.safeImpactSpeed) {
            // Engines were NOT on when landing -> hard impact damage!
            const excess = rawImpactSpeed - POD_CONFIG.safeImpactSpeed;
            const dmg = THREE.MathUtils.clamp(
              excess * excess * POD_CONFIG.damagePerExcessSpeedSq,
              6,
              55
            );
            s.hullIntegrity = Math.max(0, s.hullIntegrity - dmg);
            s.vel.x *= 0.65;
            s.vel.z *= 0.65;
            s.lastLandingEvent = 'hard_impact';
            s.lastLandingDamage = dmg;
          }
        } else if (s.coastReady && effectiveIgnitionThrust > 0) {
          // Coasted with both engines off >= 0.5s and activated both right before ground:
          // Zero damage + huge speed boost!
          const jumpScale = THREE.MathUtils.clamp(
            (s.airTime - POD_CONFIG.minAirTimeForLandingCheck) / 1.25,
            0.25,
            1.0
          );
          const thrustScale = THREE.MathUtils.clamp(
            0.45 + 0.55 * effectiveIgnitionThrust,
            0.45,
            1.0
          );
          const addSpeedMs =
            (POD_CONFIG.vectorBoostBaseAddMs +
              jumpScale * POD_CONFIG.vectorBoostBigJumpAddMs) *
            thrustScale;

          vFwd = Math.max(vFwd, 36) + addSpeedMs;
          s.vel.x = this.tmpForward.x * vFwd + this.tmpRight.x * (vLat * 0.35);
          s.vel.z = this.tmpForward.z * vFwd + this.tmpRight.z * (vLat * 0.35);

          const targetSlopeVelY = vFwd * slopeTanY;
          s.vel.y = Math.max(s.vel.y * 0.2, targetSlopeVelY - 1.5);

          s.pLeft = Math.max(s.pLeft, effectiveIgnitionThrust);
          s.pRight = Math.max(s.pRight, effectiveIgnitionThrust);
          s.landingBoost = Math.max(s.landingBoost, thrustScale);

          s.lastLandingEvent = 'vector_boost';
          s.lastLandingBoostKmh = Math.round(addSpeedMs * 3.6);
        } else if (rawImpactSpeed > POD_CONFIG.safeImpactSpeed) {
          const excess = rawImpactSpeed - POD_CONFIG.safeImpactSpeed;
          const dmg = THREE.MathUtils.clamp(
            excess * excess * POD_CONFIG.damagePerExcessSpeedSq,
            6,
            55
          );
          s.hullIntegrity = Math.max(0, s.hullIntegrity - dmg);
          s.vel.x *= 0.65;
          s.vel.z *= 0.65;
          s.lastLandingEvent = 'hard_impact';
          s.lastLandingDamage = dmg;
        }

        this.resetAirSequenceTrackers();
      } else if (h <= touchdownHeight) {
        this.resetAirSequenceTrackers();
      }
    } else if (s.isGrounded && s.airTime > 0) {
      this.resetAirSequenceTrackers();
    }

    // 7. Unilateral Repulsor Hover Acceleration (NEVER pulls down off a ramp lip!)
    let aHover = 0;
    if (h < POD_CONFIG.maxRepulsorReach) {
      if (h <= POD_CONFIG.hoverHeight || hDot < 0) {
        const wH = POD_CONFIG.hoverSpringOmega;
        const zH = POD_CONFIG.hoverDampingRatio;
        const rawHover =
          POD_CONFIG.gravity +
          wH * wH * (POD_CONFIG.hoverHeight - h) -
          2 * zH * wH * hDot;
        const taper =
          h > POD_CONFIG.hoverHeight
            ? THREE.MathUtils.clamp(
                (POD_CONFIG.maxRepulsorReach - h) /
                  (POD_CONFIG.maxRepulsorReach - POD_CONFIG.hoverHeight),
                0,
                1
              )
            : 1.0;
        aHover = Math.max(0, rawHover) * taper;
      }
    }

    s.vel.y += (aHover + aVectoredLift - POD_CONFIG.gravity) * dt;

    // Integrate position
    s.pos.addScaledVector(s.vel, dt);

    // Prevent ground clipping on extreme drops
    const postGround = track.sampleGround(s.pos.x, s.pos.y, s.pos.z);
    if (s.pos.y < postGround.groundY + 0.45) {
      s.pos.y = postGround.groundY + 0.45;
      if (s.vel.y < 0) s.vel.y = 0;
    }

    // Wall & Cave Ceiling Collision
    const wallHit = track.resolveWallAndCeilingCollision(
      s.pos,
      s.vel,
      POD_CONFIG.wallCollisionRadius
    );
    if (wallHit.hitWall && wallHit.impactSpeed > 8) {
      const wallDmg = THREE.MathUtils.clamp((wallHit.impactSpeed - 8) * 0.45, 2, 18);
      s.hullIntegrity = Math.max(0, s.hullIntegrity - wallDmg);
      if (s.lastLandingEvent === 'none') {
        s.lastLandingEvent = 'wall_scrape';
        s.lastLandingDamage = wallDmg;
      }
    }

    // Slope Pitch Alignment
    if (s.isGrounded) {
      const forwardSlope =
        -(this.tmpNormal.x * this.tmpForward.x + this.tmpNormal.z * this.tmpForward.z) /
        Math.max(0.25, this.tmpNormal.y);
      const targetPitch = THREE.MathUtils.clamp(Math.atan(forwardSlope), -0.55, 0.55);
      s.pitch = THREE.MathUtils.lerp(
        s.pitch,
        targetPitch,
        1 - Math.exp(-POD_CONFIG.slopePitchAlignRate * dt)
      );
    } else {
      s.pitch = Math.max(
        -0.48,
        s.pitch - POD_CONFIG.airPitchNoseDropRate * dt
      );
    }

    // 8. Articulated Trailing Cockpit Secondary Motion
    const angAccel = (s.omegaYaw - this.prevOmegaYaw) / dt;
    this.prevOmegaYaw = s.omegaYaw;
    const vertAccel = (s.vel.y - this.prevVelY) / dt;
    this.prevVelY = s.vel.y;

    const targetCockpitYaw = THREE.MathUtils.clamp(
      -s.omegaYaw * 0.085 - angAccel * 0.008,
      -0.22,
      0.22
    );
    const targetCockpitRoll = THREE.MathUtils.clamp(-s.roll * 0.14, -0.18, 0.18);
    const targetCockpitVert = THREE.MathUtils.clamp(-vertAccel * 0.004, -0.18, 0.18);

    this.cockpitYawVel +=
      (120 * (targetCockpitYaw - s.cockpitYawOffset) - 16 * this.cockpitYawVel) * dt;
    s.cockpitYawOffset += this.cockpitYawVel * dt;

    this.cockpitRollVel +=
      (110 * (targetCockpitRoll - s.cockpitRollOffset) - 15 * this.cockpitRollVel) * dt;
    s.cockpitRollOffset += this.cockpitRollVel * dt;

    this.cockpitVertVel +=
      (140 * (targetCockpitVert - s.cockpitVertOffset) - 18 * this.cockpitVertVel) * dt;
    s.cockpitVertOffset += this.cockpitVertVel * dt;

    s.speedMs = s.vel.length();
    s.speedKmh = s.speedMs * 3.6;
  }

  private resetAirSequenceTrackers(): void {
    this.state.airTime = 0;
    this.state.enginesOffTime = 0;
    this.state.coastReady = false;
    this.flareWindowPeakMinThrust = 0;
    this.peakAirImpactSpeed = 0;
    this.ignitionStartedInFlareWindow = false;
  }

  private spoolEngine(current: number, target: number, dt: number): number {
    let rate: number = POD_CONFIG.spoolDownRate;
    if (target < 0) {
      rate = POD_CONFIG.reverseSnapRate;
    } else if (target > current) {
      rate = POD_CONFIG.spoolUpRate;
    }
    return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-rate * dt));
  }

  private updateEngineHeat(
    heat: number,
    overheated: boolean,
    target: number,
    dt: number,
    nitroOverrideRate: number | null,
    extraCoolRate: number
  ): { heat: number; overheated: boolean } {
    if (overheated) {
      const nextHeat = Math.max(
        0,
        heat - (POD_CONFIG.coolRateIdle + extraCoolRate) * dt
      );
      return {
        heat: nextHeat,
        overheated: nextHeat > POD_CONFIG.overheatRecoverThreshold,
      };
    }

    let deltaPerSec: number;
    if (nitroOverrideRate !== null) {
      deltaPerSec = nitroOverrideRate;
    } else {
      const absTarget = Math.abs(target);
      if (absTarget >= 0.99) {
        deltaPerSec = POD_CONFIG.overheatRate100;
      } else if (absTarget >= 0.65) {
        deltaPerSec = -POD_CONFIG.coolRate70;
      } else if (absTarget >= 0.25) {
        deltaPerSec = -POD_CONFIG.coolRate30;
      } else {
        deltaPerSec = -POD_CONFIG.coolRateIdle;
      }
      deltaPerSec -= extraCoolRate;
    }

    const nextHeat = THREE.MathUtils.clamp(heat + deltaPerSec * dt, 0, 100);
    return {
      heat: nextHeat,
      overheated: nextHeat >= 100,
    };
  }
}
