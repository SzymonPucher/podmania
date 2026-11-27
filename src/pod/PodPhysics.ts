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
  private damperHoldDuration = 0;
  private cockpitYawVel = 0;
  private cockpitRollVel = 0;
  private cockpitVertVel = 0;
  private prevOmegaYaw = 0;
  private prevVelY = 0;

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
      damperCharge: POD_CONFIG.damperMaxCharge,
      damperCooldown: 0,
      damperFiring: false,
      hullIntegrity: 100,
      cockpitYawOffset: 0,
      cockpitRollOffset: 0,
      cockpitVertOffset: 0,
      lastLandingEvent: 'none',
      lastLandingDamage: 0,
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
    s.damperCharge = POD_CONFIG.damperMaxCharge;
    s.damperCooldown = 0;
    s.damperFiring = false;
    s.hullIntegrity = 100;
    s.cockpitYawOffset = 0;
    s.cockpitRollOffset = 0;
    s.cockpitVertOffset = 0;
    s.lastLandingEvent = 'none';
    s.lastLandingDamage = 0;

    this.rollVel = 0;
    this.damperHoldDuration = 0;
    this.cockpitYawVel = 0;
    this.cockpitRollVel = 0;
    this.cockpitVertVel = 0;
    this.prevOmegaYaw = 0;
    this.prevVelY = 0;
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

    // 1. Engine Spooling (still rev visually during countdown!)
    s.pLeft = this.spoolEngine(s.pLeft, input.targetLeft, dt);
    s.pRight = this.spoolEngine(s.pRight, input.targetRight, dt);

    const isWrecked = s.hullIntegrity <= 0;
    const driveEnabled = allowDrive && !isWrecked;
    const hullScale = s.hullIntegrity < 30 ? 0.9 + (s.hullIntegrity / 30) * 0.1 : 1.0;

    const effLeft = driveEnabled ? s.pLeft * hullScale : 0;
    const effRight = driveEnabled ? s.pRight * hullScale : 0;

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

    const yawAccel = diff * POD_CONFIG.baseTurnAccel * speedFactor * turnAuthority - s.omegaYaw * yawDamp;
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

    // 4. Horizontal Dirt Propulsion & Drift
    this.tmpForward.set(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
    this.tmpRight.set(Math.cos(s.yaw), 0, -Math.sin(s.yaw));

    let vFwd = s.vel.x * this.tmpForward.x + s.vel.z * this.tmpForward.z;
    let vLat = s.vel.x * this.tmpRight.x + s.vel.z * this.tmpRight.z;

    let driveAccel =
      (effLeft + effRight) * 0.5 * POD_CONFIG.maxForwardAccel * (s.isGrounded ? 1.0 : 0.35);

    let terrainDragMult = 1.0;
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

    const damperGroundDrag =
      s.damperFiring && s.isGrounded ? POD_CONFIG.damperFlatGroundDrag : 0;
    const dragAccel =
      (POD_CONFIG.linearDrag * terrainDragMult + damperGroundDrag) * vFwd +
      POD_CONFIG.quadDrag * vFwd * Math.abs(vFwd) +
      POD_CONFIG.slideSpeedScrub * Math.abs(vLat) * Math.sign(vFwd);

    const gripRate = s.isGrounded
      ? (POD_CONFIG.dirtLateralGrip + Math.abs(Math.sin(s.roll)) * POD_CONFIG.bankCarveBonus) * terrainGripMult
      : 0.4;

    vFwd += (driveAccel - dragAccel) * dt;
    vLat -= vLat * Math.min(1, gripRate * dt);

    s.vel.x = this.tmpForward.x * vFwd + this.tmpRight.x * vLat;
    s.vel.z = this.tmpForward.z * vFwd + this.tmpRight.z * vLat;

    // 5. Multi-Probe Repulsorlift Hover & Slope Pitch
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

    const wasGrounded = s.isGrounded;
    s.isGrounded = h <= POD_CONFIG.maxRepulsorReach;

    // Damping Thruster State (Space)
    if (s.damperCooldown > 0) {
      s.damperCooldown = Math.max(0, s.damperCooldown - dt);
    }

    s.damperFiring =
      driveEnabled && input.spaceHeld && s.damperCharge > 0 && s.damperCooldown <= 0;

    if (s.damperFiring) {
      s.damperCharge = Math.max(0, s.damperCharge - POD_CONFIG.damperDrainRate * dt);
      this.damperHoldDuration += dt;
      if (!s.isGrounded && s.vel.y < -1.0 && h < 18.0) {
        s.vel.y += POD_CONFIG.damperUpwardAccel * dt;
      }
      if (s.damperCharge <= 0) {
        s.damperCooldown = POD_CONFIG.damperOverheatCooldown;
      }
    } else {
      this.damperHoldDuration = 0;
      s.damperCharge = Math.min(
        POD_CONFIG.damperMaxCharge,
        s.damperCharge + POD_CONFIG.damperRechargeRate * dt
      );
    }

    // Touchdown Resolution
    if (!s.isGrounded) {
      s.airTime += dt;
    } else if (!wasGrounded || (s.airTime >= POD_CONFIG.minAirTimeForLandingCheck && h <= POD_CONFIG.hoverHeight * 1.15)) {
      if (s.airTime >= POD_CONFIG.minAirTimeForLandingCheck) {
        const impactSpeed = -(
          s.vel.x * this.tmpNormal.x +
          s.vel.y * this.tmpNormal.y +
          s.vel.z * this.tmpNormal.z
        );

        if (s.damperFiring && this.damperHoldDuration >= 0.06) {
          if (impactSpeed <= POD_CONFIG.dampedSafeImpactSpeed) {
            s.lastLandingEvent = 'perfect_damp';
          } else {
            const excess = impactSpeed - POD_CONFIG.dampedSafeImpactSpeed;
            const dmg = THREE.MathUtils.clamp(
              excess * excess * POD_CONFIG.damagePerExcessSpeedSq * 0.5,
              4,
              25
            );
            s.hullIntegrity = Math.max(0, s.hullIntegrity - dmg);
            s.lastLandingEvent = 'hard_impact';
            s.lastLandingDamage = dmg;
          }
        } else if (impactSpeed > POD_CONFIG.safeImpactSpeed) {
          const excess = impactSpeed - POD_CONFIG.safeImpactSpeed;
          const dmg = THREE.MathUtils.clamp(
            excess * excess * POD_CONFIG.damagePerExcessSpeedSq,
            8,
            55
          );
          s.hullIntegrity = Math.max(0, s.hullIntegrity - dmg);
          s.vel.x *= 0.65;
          s.vel.z *= 0.65;
          s.lastLandingEvent = 'hard_impact';
          s.lastLandingDamage = dmg;
        }
        s.airTime = 0;
      } else if (h <= POD_CONFIG.hoverHeight * 1.15) {
        s.airTime = 0;
      }
    }

    // Unilateral Repulsor Hover Acceleration (NEVER pulls down off a ramp lip!)
    let aHover = 0;
    if (h < POD_CONFIG.maxRepulsorReach) {
      const slopeTanY =
        -(this.tmpNormal.x * this.tmpForward.x + this.tmpNormal.z * this.tmpForward.z) /
        Math.max(0.25, this.tmpNormal.y);
      const groundVelY = vFwd * slopeTanY;
      const hDot = s.vel.y - groundVelY;

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

    s.vel.y += (aHover - POD_CONFIG.gravity) * dt;

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

    // 7. Articulated Trailing Cockpit Secondary Motion
    const angAccel = (s.omegaYaw - this.prevOmegaYaw) / dt;
    this.prevOmegaYaw = s.omegaYaw;
    const vertAccel = (s.vel.y - this.prevVelY) / dt;
    this.prevVelY = s.vel.y;

    const targetCockpitYaw = THREE.MathUtils.clamp(-s.omegaYaw * 0.085 - angAccel * 0.008, -0.22, 0.22);
    const targetCockpitRoll = THREE.MathUtils.clamp(-s.roll * 0.14, -0.18, 0.18);
    const targetCockpitVert = THREE.MathUtils.clamp(-vertAccel * 0.004, -0.18, 0.18);

    this.cockpitYawVel += (120 * (targetCockpitYaw - s.cockpitYawOffset) - 16 * this.cockpitYawVel) * dt;
    s.cockpitYawOffset += this.cockpitYawVel * dt;

    this.cockpitRollVel += (110 * (targetCockpitRoll - s.cockpitRollOffset) - 15 * this.cockpitRollVel) * dt;
    s.cockpitRollOffset += this.cockpitRollVel * dt;

    this.cockpitVertVel += (140 * (targetCockpitVert - s.cockpitVertOffset) - 18 * this.cockpitVertVel) * dt;
    s.cockpitVertOffset += this.cockpitVertVel * dt;

    s.speedMs = s.vel.length();
    s.speedKmh = s.speedMs * 3.6;
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
