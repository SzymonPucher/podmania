import * as THREE from 'three';
import type { InputSnapshot, PodTelemetry } from '../types';
import type { TrackBuilder } from '../world/TrackBuilder';
import { POD_CONFIG } from './PodConfig';

export interface PhysicsStateSnapshot {
  pos: THREE.Vector3;
  yaw: number;
  pitch: number;
}

export class PodPhysics {
  public readonly state: PodTelemetry;

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
    };
  }

  public resetToPose(pos: THREE.Vector3, yaw: number, pitch = 0): void {
    const s = this.state;
    s.pos.copy(pos);
    s.vel.set(0, 0, 0);
    s.yaw = yaw;
    s.pitch = pitch;
    s.roll = 0;
    s.omegaYaw = 0;
    s.pLeft = 0;
    s.pRight = 0;
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
    allowDrive: boolean
  ): void {
    const s = this.state;
    s.lastLandingEvent = 'none';
    s.lastLandingDamage = 0;
    s.lastLandingBoostKmh = 0;
    s.airborneOverload = false;

    // 1. Engine Spooling (still rev visually during countdown!)
    s.pLeft = this.spoolEngine(s.pLeft, input.targetLeft, dt);
    s.pRight = this.spoolEngine(s.pRight, input.targetRight, dt);

    const isWrecked = s.hullIntegrity <= 0;
    const driveEnabled = allowDrive && !isWrecked;
    const hullScale = s.hullIntegrity < 30 ? 0.9 + (s.hullIntegrity / 30) * 0.1 : 1.0;

    if (s.landingBoost > 0) {
      s.landingBoost = Math.max(
        0,
        s.landingBoost - dt / POD_CONFIG.vectorBoostDurationSec
      );
    }

    const effLeft = driveEnabled ? s.pLeft * hullScale : 0;
    const effRight = driveEnabled ? s.pRight * hullScale : 0;
    const fwdInputLevel = driveEnabled
      ? (Math.max(0, input.targetLeft) + Math.max(0, input.targetRight)) * 0.5
      : 0;
    const bothEnginesOff =
      driveEnabled && input.targetLeft === 0 && input.targetRight === 0;
    const bothEnginesActiveForward =
      driveEnabled && input.targetLeft > 0 && input.targetRight > 0;
    const minForwardInput = bothEnginesActiveForward
      ? Math.min(input.targetLeft, input.targetRight)
      : 0;

    const horizSpeed = Math.hypot(s.vel.x, s.vel.z);
    const currentFeature = track.findNearestSlice(s.pos.x, s.pos.z).feature;

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
    let driveAccel =
      (effLeft + effRight) *
      0.5 *
      POD_CONFIG.maxForwardAccel *
      (s.isGrounded ? 1.0 : POD_CONFIG.airborneDriveScale);

    if (s.landingBoost > 0 && s.isGrounded && driveEnabled) {
      driveAccel += s.landingBoost * POD_CONFIG.vectorBoostExtraAccel;
    }

    let terrainDragMult = s.isGrounded ? 1.0 : POD_CONFIG.airborneLinearDragMult;
    let terrainGripMult = 1.0;
    if (s.isGrounded) {
      if (currentFeature === 'boost_pad' && driveEnabled) {
        driveAccel += 26.0;
        terrainDragMult = 0.8;
        terrainGripMult = 1.35;
      } else if (currentFeature === 'ice_sheet') {
        terrainDragMult = 0.72;
        terrainGripMult = 0.28;
      } else if (currentFeature === 'sand_dunes') {
        terrainDragMult = 1.2;
        terrainGripMult = 0.85;
      } else if (currentFeature === 'rough_scree') {
        terrainDragMult = 1.28;
        terrainGripMult = 0.9;
      } else if (currentFeature === 'bridge_deck') {
        terrainDragMult = 0.9;
        terrainGripMult = 1.3;
      } else if (currentFeature === 'magma_vent') {
        driveAccel += 5.5;
      }
    }

    const quadDragEff =
      POD_CONFIG.quadDrag *
      (s.isGrounded ? 1.0 : POD_CONFIG.airborneQuadDragMult) *
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

      // Applying thrust while airborne high up damages the pod
      if (
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
        s.coastReady &&
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

        if (s.coastReady && effectiveIgnitionThrust > 0) {
          // Coasted with both engines off >= 1s and activated both right before ground:
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

    // Magma vent thermal updraft
    if (currentFeature === 'magma_vent' && h < 18.0) {
      aHover += 16.5 * (1 - h / 18.0);
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
}
