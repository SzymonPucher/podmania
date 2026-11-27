import * as THREE from 'three';
import type { AudioEngine } from '../core/AudioEngine';
import type { PodModificationId, PodTelemetry, WreckImpactInfo } from '../types';
import type { TrackBuilder } from '../world/TrackBuilder';
import { POD_CONFIG } from './PodConfig';
import type { DetachablePartDescriptor, PodMeshBuilder } from './PodMeshBuilder';
import type { PodVFX } from './PodVFX';

interface DisassemblyRigidBody {
  desc: DetachablePartDescriptor;
  origParent: THREE.Object3D;
  origLocalPos: THREE.Vector3;
  origLocalQuat: THREE.Quaternion;
  origLocalScale: THREE.Vector3;
  worldScale: THREE.Vector3;

  detached: boolean;
  detachDelaySec: number;
  parentBody: DisassemblyRigidBody | null;

  comPos: THREE.Vector3;
  prevComPos: THREE.Vector3;
  vel: THREE.Vector3;
  quat: THREE.Quaternion;
  angVel: THREE.Vector3;

  rogueThrust: number;
  rogueThrustDuration: number;
  fanSpinRate: number;
  engineHeat: number;
  bounceCount: number;
}

interface SeveredCableState {
  side: 'left' | 'right';
  freeEndPos: THREE.Vector3;
  freeEndVel: THREE.Vector3;
  midPos: THREE.Vector3;
  midVel: THREE.Vector3;
  maxLen: number;
}

interface ShrapnelChunk {
  active: boolean;
  pos: THREE.Vector3;
  prevPos: THREE.Vector3;
  vel: THREE.Vector3;
  quat: THREE.Quaternion;
  angVel: THREE.Vector3;
  scale: THREE.Vector3;
  radius: number;
}

const SHRAPNEL_COUNT = 42;

export class PodDisassembly {
  public readonly group = new THREE.Group();
  private active = false;
  private elapsedSec = 0;

  private bodies: DisassemblyRigidBody[] = [];
  private leftEngineBody: DisassemblyRigidBody | null = null;
  private rightEngineBody: DisassemblyRigidBody | null = null;
  private cockpitBody: DisassemblyRigidBody | null = null;

  private readonly cables: SeveredCableState[] = [
    {
      side: 'left',
      freeEndPos: new THREE.Vector3(),
      freeEndVel: new THREE.Vector3(),
      midPos: new THREE.Vector3(),
      midVel: new THREE.Vector3(),
      maxLen: 5.8,
    },
    {
      side: 'right',
      freeEndPos: new THREE.Vector3(),
      freeEndVel: new THREE.Vector3(),
      midPos: new THREE.Vector3(),
      midVel: new THREE.Vector3(),
      maxLen: 5.8,
    },
  ];

  private readonly shrapnelMesh: THREE.InstancedMesh;
  private readonly shrapnelPool: ShrapnelChunk[] = [];
  private readonly explosionLight: THREE.PointLight;

  // Scratch math objects (zero hot-loop GC)
  private readonly tmpVecA = new THREE.Vector3();
  private readonly tmpVecB = new THREE.Vector3();
  private readonly tmpVecC = new THREE.Vector3();
  private readonly tmpRel = new THREE.Vector3();
  private readonly tmpPodOmega = new THREE.Vector3();
  private readonly tmpPodFwd = new THREE.Vector3();
  private readonly tmpPodRight = new THREE.Vector3();
  private readonly tmpBlastOrigin = new THREE.Vector3();
  private readonly tmpAxis = new THREE.Vector3();
  private readonly tmpDeltaQuat = new THREE.Quaternion();
  private readonly dummy = new THREE.Object3D();

  constructor() {
    const shrapnelGeo = new THREE.BoxGeometry(0.28, 0.05, 0.36);
    const shrapnelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.82,
      roughness: 0.3,
    });
    this.shrapnelMesh = new THREE.InstancedMesh(
      shrapnelGeo,
      shrapnelMat,
      SHRAPNEL_COUNT
    );
    this.shrapnelMesh.castShadow = true;
    this.shrapnelMesh.frustumCulled = false;
    this.group.add(this.shrapnelMesh);

    const palette = [
      new THREE.Color(0x9aa4b0), // steel
      new THREE.Color(0xe59a18), // yellow flap armor
      new THREE.Color(0x24529a), // cobalt collar
      new THREE.Color(0x2b3038), // gunmetal greeble
      new THREE.Color(0x7a302a), // maroon tank
      new THREE.Color(0xb87333), // copper ring
    ];

    for (let i = 0; i < SHRAPNEL_COUNT; i++) {
      this.shrapnelPool.push({
        active: false,
        pos: new THREE.Vector3(),
        prevPos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        quat: new THREE.Quaternion(),
        angVel: new THREE.Vector3(),
        scale: new THREE.Vector3(1, 1, 1),
        radius: 0.14,
      });
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.shrapnelMesh.setMatrixAt(i, this.dummy.matrix);
      this.shrapnelMesh.setColorAt(i, palette[i % palette.length]);
    }
    this.shrapnelMesh.instanceMatrix.needsUpdate = true;
    if (this.shrapnelMesh.instanceColor) {
      this.shrapnelMesh.instanceColor.needsUpdate = true;
    }

    this.explosionLight = new THREE.PointLight(0xff7722, 0, 34, 1.4);
    this.group.add(this.explosionLight);
  }

  public get isActive(): boolean {
    return this.active;
  }

  public start(
    telemetry: PodTelemetry,
    wreckInfo: WreckImpactInfo,
    podMesh: PodMeshBuilder,
    podVfx: PodVFX,
    audio: AudioEngine
  ): void {
    if (this.active) {
      this.reassemble(podMesh, telemetry.modification);
    }

    this.active = true;
    this.elapsedSec = 0;
    this.bodies = [];
    this.leftEngineBody = null;
    this.rightEngineBody = null;
    this.cockpitBody = null;

    // Ensure intact pod world transforms are 100% up-to-date
    podMesh.podRoot.updateMatrixWorld(true);

    // Pod world angular velocity vector: yaw + pitch + roll rates
    this.tmpPodFwd.set(-Math.sin(telemetry.yaw), 0, -Math.cos(telemetry.yaw));
    this.tmpPodRight.set(Math.cos(telemetry.yaw), 0, -Math.sin(telemetry.yaw));
    this.tmpPodOmega
      .set(0, telemetry.omegaYaw, 0)
      .addScaledVector(this.tmpPodRight, wreckInfo.pitchVel)
      .addScaledVector(this.tmpPodFwd, wreckInfo.rollVel);

    // Determine physical blast center based on how the pod was wrecked
    this.tmpBlastOrigin.copy(telemetry.pos);
    if (wreckInfo.cause === 'overheat') {
      if (wreckInfo.overheatedLeft && !wreckInfo.overheatedRight) {
        this.tmpBlastOrigin.addScaledVector(this.tmpPodRight, -1.35);
      } else if (wreckInfo.overheatedRight && !wreckInfo.overheatedLeft) {
        this.tmpBlastOrigin.addScaledVector(this.tmpPodRight, 1.35);
      }
    } else if (wreckInfo.cause === 'wall_impact') {
      // Shift blast origin toward whichever side struck the wall
      const rightDotNorm = this.tmpPodRight.dot(wreckInfo.impactNormal);
      if (Math.abs(rightDotNorm) > 0.2) {
        this.tmpBlastOrigin.addScaledVector(
          this.tmpPodRight,
          rightDotNorm > 0 ? -1.4 : 1.4
        );
      }
    } else if (wreckInfo.cause === 'cliff_impact') {
      this.tmpBlastOrigin.addScaledVector(this.tmpPodFwd, 2.2);
    }

    const descriptors = podMesh.getDetachableParts();

    // First pass: capture original local transforms & world matrices BEFORE reparenting anything
    for (const desc of descriptors) {
      if (!desc.node.parent) continue;
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      desc.node.matrixWorld.decompose(worldPos, worldQuat, worldScale);

      const comOffsetWorld = this.tmpVecA
        .copy(desc.comOffsetLocal)
        .multiply(worldScale)
        .applyQuaternion(worldQuat);
      const comPos = worldPos.clone().add(comOffsetWorld);

      const body: DisassemblyRigidBody = {
        desc,
        origParent: desc.node.parent,
        origLocalPos: desc.node.position.clone(),
        origLocalQuat: desc.node.quaternion.clone(),
        origLocalScale: desc.node.scale.clone(),
        worldScale,
        detached: false,
        detachDelaySec: 0,
        parentBody: null,
        comPos,
        prevComPos: comPos.clone(),
        vel: new THREE.Vector3(),
        quat: worldQuat,
        angVel: new THREE.Vector3(),
        rogueThrust: 0,
        rogueThrustDuration: 0,
        fanSpinRate: 0,
        engineHeat: 0,
        bounceCount: 0,
      };

      if (desc.kind === 'left_engine') {
        this.leftEngineBody = body;
        body.engineHeat = telemetry.heatLeft;
        body.fanSpinRate = 12 + Math.abs(wreckInfo.pLeftAtWreck) * 32;
        if (
          wreckInfo.cause !== 'cliff_impact' &&
          (wreckInfo.pLeftAtWreck > 0.08 ||
            wreckInfo.cause === 'air_overload' ||
            wreckInfo.cause === 'nitro_burn')
        ) {
          body.rogueThrust =
            Math.max(0.35, Math.abs(wreckInfo.pLeftAtWreck)) *
            (0.65 + Math.random() * 0.4);
          body.rogueThrustDuration = 0.55 + Math.random() * 0.7;
        }
      } else if (desc.kind === 'right_engine') {
        this.rightEngineBody = body;
        body.engineHeat = telemetry.heatRight;
        body.fanSpinRate = 12 + Math.abs(wreckInfo.pRightAtWreck) * 32;
        if (
          wreckInfo.cause !== 'cliff_impact' &&
          (wreckInfo.pRightAtWreck > 0.08 ||
            wreckInfo.cause === 'air_overload' ||
            wreckInfo.cause === 'nitro_burn')
        ) {
          body.rogueThrust =
            Math.max(0.35, Math.abs(wreckInfo.pRightAtWreck)) *
            (0.65 + Math.random() * 0.4);
          body.rogueThrustDuration = 0.55 + Math.random() * 0.7;
        }
      } else if (desc.kind === 'cockpit') {
        this.cockpitBody = body;
      }

      this.bodies.push(body);
    }

    // Link sub-parts to their parent assembly & assign cascading tear-off delays
    for (const body of this.bodies) {
      const pk = body.desc.parentKind;
      if (pk === 'left_engine') body.parentBody = this.leftEngineBody;
      else if (pk === 'right_engine') body.parentBody = this.rightEngineBody;
      else if (pk === 'cockpit') body.parentBody = this.cockpitBody;

      if (pk === 'root') {
        body.detachDelaySec = 0;
      } else {
        // Immediate full shatter on direct cliff/ground impacts or overheated side;
        // brief cascading tear-off (0..0.28s or first bounce) for a few secondary parts
        const isDirectBlastSide =
          wreckInfo.cause === 'cliff_impact' ||
          wreckInfo.cause === 'ground_impact' ||
          (wreckInfo.cause === 'overheat' &&
            ((body.desc.side < 0 && wreckInfo.overheatedLeft) ||
              (body.desc.side > 0 && wreckInfo.overheatedRight)));

        if (isDirectBlastSide || Math.random() < 0.68) {
          body.detachDelaySec = 0;
        } else {
          body.detachDelaySec = 0.06 + Math.random() * 0.26;
        }
      }
    }

    // Detach immediate bodies and compute physics-accurate initial velocities & spins
    for (const body of this.bodies) {
      if (body.detachDelaySec <= 0) {
        this.detachBodyNow(body, telemetry, wreckInfo, true);
      }
    }

    // Initialize whipping severed control tether cables anchored to cockpit outriggers
    podMesh.detachCablesAndPlasmaToGroup(this.group);
    for (const cable of this.cables) {
      const anchorWorld = podMesh.getCockpitWorldArm(cable.side, this.tmpVecA);
      const engineWorld =
        cable.side === 'left'
          ? (this.leftEngineBody?.comPos ?? telemetry.pos)
          : (this.rightEngineBody?.comPos ?? telemetry.pos);

      // Snap occurs near the engine pylon so tether whips back from engine toward cockpit
      cable.freeEndPos.copy(anchorWorld).lerp(engineWorld, 0.86);
      cable.midPos.copy(anchorWorld).lerp(cable.freeEndPos, 0.5);
      cable.maxLen = Math.max(3.6, anchorWorld.distanceTo(cable.freeEndPos) * 1.05);

      const parentVel = this.cockpitBody ? this.cockpitBody.vel : telemetry.vel;
      cable.freeEndVel
        .copy(parentVel)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 14,
            5 + Math.random() * 9,
            (Math.random() - 0.5) * 14
          )
        );
      cable.midVel.copy(parentVel).lerp(cable.freeEndVel, 0.5);
      cable.midVel.y += 2.5;
    }

    // Spawn metallic shrapnel burst carrying pod momentum + explosive scatter
    this.spawnShrapnelBurst(telemetry, wreckInfo);

    // Trigger primary explosion VFX + dynamic point light flash + procedural RUD audio
    const speedFactor = THREE.MathUtils.clamp(
      wreckInfo.preImpactVel.length() / 70,
      0.65,
      1.6
    );
    podVfx.triggerExplosionBurst(
      this.tmpBlastOrigin,
      telemetry.vel,
      telemetry.groundHeight,
      speedFactor,
      telemetry.modification === 'cooled'
    );
    if (this.leftEngineBody && wreckInfo.overheatedLeft) {
      podVfx.triggerExplosionBurst(
        this.leftEngineBody.comPos,
        this.leftEngineBody.vel,
        telemetry.groundHeight,
        0.95,
        false
      );
    }
    if (this.rightEngineBody && wreckInfo.overheatedRight) {
      podVfx.triggerExplosionBurst(
        this.rightEngineBody.comPos,
        this.rightEngineBody.vel,
        telemetry.groundHeight,
        0.95,
        false
      );
    }

    this.explosionLight.position.copy(this.tmpBlastOrigin);
    this.explosionLight.position.y += 1.2;
    this.explosionLight.intensity = 42;

    audio.playDisassemblyExplosion();
  }

  private detachBodyNow(
    body: DisassemblyRigidBody,
    telemetry: PodTelemetry,
    wreckInfo: WreckImpactInfo,
    isInitialBlast: boolean
  ): void {
    if (body.detached) return;

    if (!isInitialBlast && body.parentBody) {
      // Re-sample exact current world pose right before delayed shear-off
      body.parentBody.desc.node.updateMatrixWorld(true);
      const wp = this.tmpVecA;
      const wq = body.quat;
      const ws = body.worldScale;
      body.desc.node.matrixWorld.decompose(wp, wq, ws);
      const comOff = this.tmpVecB
        .copy(body.desc.comOffsetLocal)
        .multiply(ws)
        .applyQuaternion(wq);
      body.comPos.copy(wp).add(comOff);
      body.prevComPos.copy(body.comPos);
    }

    body.detached = true;
    this.group.add(body.desc.node);

    if (!isInitialBlast && body.parentBody) {
      // Inherit parent rigid body linear + rotational velocity + shear impulse
      this.tmpRel.copy(body.comPos).sub(body.parentBody.comPos);
      this.tmpVecC.crossVectors(body.parentBody.angVel, this.tmpRel);
      body.vel.copy(body.parentBody.vel).add(this.tmpVecC);
      if ( this.tmpRel.lengthSq() > 1e-4 ) {
        this.tmpRel.normalize();
      } else {
        this.tmpRel.set(body.desc.side || 1, 0.6, 0).normalize();
      }
      const tearSpeed = 4.5 + Math.random() * 7.5;
      body.vel.addScaledVector(this.tmpRel, tearSpeed);
      body.vel.y += 2.5 + Math.random() * 4.5;
      body.angVel
        .copy(body.parentBody.angVel)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 14,
            (Math.random() - 0.5) * 14,
            (Math.random() - 0.5) * 14
          )
        );
      this.syncNodeTransform(body);
      return;
    }

    // --- Initial t=0 Physics Momentum & Structural Breakup Impulse ---
    // 1. Base pod linear velocity + cross(omega_pod, r)
    this.tmpRel.copy(body.comPos).sub(telemetry.pos);
    this.tmpVecC.crossVectors(this.tmpPodOmega, this.tmpRel);

    if (wreckInfo.cause === 'cliff_impact') {
      // Front engines take brunt of cliff rebound; trailing cockpit whips forward/upward on inertia!
      if (body.desc.kind === 'cockpit' || body.desc.parentKind === 'cockpit') {
        body.vel
          .copy(wreckInfo.preImpactVel)
          .multiplyScalar(0.38)
          .addScaledVector(wreckInfo.impactNormal, Math.max(6, wreckInfo.impactSpeed * 0.22));
        body.vel.y += 6.5 + Math.random() * 4.0;
      } else {
        body.vel
          .copy(wreckInfo.impactNormal)
          .multiplyScalar(Math.max(9, wreckInfo.impactSpeed * (0.26 + Math.random() * 0.22)));
        body.vel.y += 4.0 + Math.random() * 6.5;
      }
    } else {
      body.vel.copy(telemetry.vel);
    }
    body.vel.add(this.tmpVecC);

    // 2. Radial breakup impulse away from blast origin, scaled inversely by mass^(1/3)
    const massFactor = Math.pow(120 / Math.max(12, body.desc.mass), 0.36);
    const blastDir = this.tmpVecA.copy(body.comPos).sub(this.tmpBlastOrigin);
    if (blastDir.lengthSq() < 0.04) {
      blastDir.set(
        body.desc.side !== 0 ? body.desc.side : (Math.random() - 0.5) * 2,
        0.45 + Math.random() * 0.5,
        (Math.random() - 0.5) * 1.2
      );
    }
    blastDir.normalize();

    const speedEnergy = THREE.MathUtils.clamp(
      wreckInfo.preImpactVel.length() * 0.14,
      4.5,
      16.0
    );
    let radialImpulse = (4.8 + speedEnergy * (0.45 + Math.random() * 0.55)) * massFactor;

    // Lateral separation between twin engines when plasma binder snaps
    if (body.desc.side !== 0) {
      const latPush =
        (wreckInfo.cause === 'overheat' ||
        wreckInfo.cause === 'nitro_burn' ||
        wreckInfo.cause === 'air_overload'
          ? 7.5
          : 4.6) *
        massFactor *
        (0.75 + Math.random() * 0.5);
      body.vel.addScaledVector(this.tmpPodRight, body.desc.side * latPush);
    }

    // Cause-specific normal rebound (e.g. ground slam or canyon wall ricochet)
    if (wreckInfo.cause === 'ground_impact') {
      const bounceUp =
        Math.min(22, Math.max(5.5, wreckInfo.impactSpeed * 0.42)) *
        (0.65 + body.desc.restitution) *
        Math.min(1.35, massFactor);
      body.vel.addScaledVector(wreckInfo.impactNormal, bounceUp);
    } else if (wreckInfo.cause === 'wall_impact') {
      const wallKick =
        Math.min(20, Math.max(5, wreckInfo.impactSpeed * 0.45)) *
        Math.min(1.4, massFactor);
      body.vel.addScaledVector(wreckInfo.impactNormal, wallKick);
      body.vel.y += 3.2 + Math.random() * 4.5;
    } else if (wreckInfo.cause === 'abyss_fall') {
      radialImpulse *= 0.85;
    }

    body.vel.addScaledVector(blastDir, radialImpulse);
    body.vel.y += (2.2 + Math.random() * 4.2) * Math.min(1.4, massFactor);

    // Slight longitudinal spread so engines & cockpit don't travel in lockstep
    if (body.desc.kind === 'cockpit') {
      body.vel.addScaledVector(this.tmpPodFwd, -2.5 + Math.random() * 3.0);
    } else if (body.desc.kind === 'left_engine' || body.desc.kind === 'right_engine') {
      body.vel.addScaledVector(this.tmpPodFwd, (Math.random() - 0.35) * 6.5);
    }

    // 3. Initial angular velocity: inherit pod omega + torque from impact & blast lever arm
    body.angVel.copy(this.tmpPodOmega);
    const spinScale = THREE.MathUtils.clamp(massFactor * 1.15, 0.55, 2.8);
    if (body.desc.kind === 'cockpit') {
      // Cockpit tumbles/skids dramatically without excessive blur-spin
      body.angVel.x += (Math.random() - 0.5) * 3.4;
      body.angVel.y += (Math.random() - 0.5) * 4.2;
      body.angVel.z += (Math.random() - 0.5) * 3.8;
    } else if (body.desc.kind === 'left_engine' || body.desc.kind === 'right_engine') {
      // Pitching & rolling tumble proportional to forward speed & impact
      const pitchTumble =
        wreckInfo.cause === 'ground_impact' || wreckInfo.cause === 'cliff_impact'
          ? -(2.2 + Math.random() * 3.4)
          : (Math.random() - 0.5) * 3.8;
      body.angVel.addScaledVector(this.tmpPodRight, pitchTumble);
      body.angVel.y += (Math.random() - 0.5) * 4.2 + body.desc.side * 1.4;
      body.angVel.addScaledVector(
        this.tmpPodFwd,
        body.desc.side * (2.0 + Math.random() * 3.2)
      );
    } else {
      // Smaller parts (yellow airbrake scoops, belly tanks, intake rotors, winglets) cartwheel fast!
      body.angVel.set(
        (Math.random() - 0.5) * 13 * spinScale,
        (Math.random() - 0.5) * 13 * spinScale,
        (Math.random() - 0.5) * 13 * spinScale
      );
    }

    this.syncNodeTransform(body);
  }

  private spawnShrapnelBurst(
    telemetry: PodTelemetry,
    wreckInfo: WreckImpactInfo
  ): void {
    for (let i = 0; i < SHRAPNEL_COUNT; i++) {
      const c = this.shrapnelPool[i];
      c.active = true;
      const sideSpread = (i % 3) - 1; // -1 (left), 0 (center), +1 (right)
      c.pos
        .copy(telemetry.pos)
        .addScaledVector(this.tmpPodRight, sideSpread * 1.25 + (Math.random() - 0.5) * 1.2)
        .addScaledVector(this.tmpPodFwd, (Math.random() - 0.3) * 4.2);
      c.pos.y += (Math.random() - 0.3) * 0.9;
      c.prevPos.copy(c.pos);

      c.vel.copy(
        wreckInfo.cause === 'cliff_impact' ? telemetry.vel : telemetry.vel
      );
      const theta = Math.random() * Math.PI * 2;
      const outSpd = 6 + Math.random() * 20;
      c.vel.x += Math.cos(theta) * outSpd;
      c.vel.y += 4 + Math.random() * 15;
      c.vel.z += Math.sin(theta) * outSpd;
      if (wreckInfo.cause === 'ground_impact' || wreckInfo.cause === 'wall_impact') {
        c.vel.addScaledVector(wreckInfo.impactNormal, 5 + Math.random() * 9);
      }

      c.quat.setFromEuler(
        new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        )
      );
      c.angVel.set(
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 22
      );
      c.scale.set(
        0.55 + Math.random() * 1.15,
        0.6 + Math.random() * 0.9,
        0.55 + Math.random() * 1.25
      );
    }
  }

  public step(
    dt: number,
    elapsedTime: number,
    telemetry: PodTelemetry,
    wreckInfo: WreckImpactInfo,
    track: TrackBuilder,
    podMesh: PodMeshBuilder,
    podVfx: PodVFX,
    audio: AudioEngine,
    cameraPos: THREE.Vector3,
    cameraRight: THREE.Vector3
  ): { majorImpactTrauma: number } {
    if (!this.active) return { majorImpactTrauma: 0 };

    this.elapsedSec += dt;
    let majorImpactTrauma = 0;

    // Fade initial detonation flash light
    if (this.explosionLight.intensity > 0.05) {
      this.explosionLight.intensity *= Math.exp(-7.5 * dt);
      if (this.leftEngineBody) {
        this.explosionLight.position
          .copy(this.leftEngineBody.comPos)
          .lerp(this.rightEngineBody?.comPos ?? this.leftEngineBody.comPos, 0.5);
        this.explosionLight.position.y += 1.4;
      }
    } else {
      this.explosionLight.intensity = 0;
    }

    // Check local track feature for crosswind gusts & surface properties
    const refPos = this.cockpitBody ? this.cockpitBody.comPos : telemetry.pos;
    const nearSlice = track.findNearestSlice(refPos.x, refPos.z, refPos.y);
    const hasCrosswind = nearSlice.feature === 'crosswind_zone';
    const windAccel = hasCrosswind ? 11.5 * (nearSlice.windDir ?? 1) : 0;

    const surfaceFrictionMult =
      track.biome === 'glacier' || nearSlice.feature === 'off_camber'
        ? 0.62
        : nearSlice.feature === 'sand_dunes' || nearSlice.feature === 'silt_trench'
          ? 1.35
          : 1.0;

    // 1. Check delayed cascading tear-offs & integrate rigid bodies
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      if (!b.detached) {
        const parentBounced = (b.parentBody?.bounceCount ?? 0) > 0;
        if (this.elapsedSec >= b.detachDelaySec || parentBounced) {
          this.detachBodyNow(b, telemetry, wreckInfo, false);
        } else {
          continue;
        }
      }

      b.prevComPos.copy(b.comPos);

      // Rogue sputtering turbine thrust along tumbling engine's local forward (-Z) axis
      if (b.rogueThrust > 0 && this.elapsedSec < b.rogueThrustDuration) {
        const sputter = Math.sin(elapsedTime * 46 + i * 3) > -0.35 ? 1.0 : 0.15;
        const thrustMag = b.rogueThrust * 28.0 * sputter;
        this.tmpVecA.set(0, 0, -1).applyQuaternion(b.quat);
        b.vel.addScaledVector(this.tmpVecA, thrustMag * dt);
        // Slight asymmetric nozzle precession torque
        b.angVel.x += Math.sin(elapsedTime * 19 + i) * b.rogueThrust * 3.8 * dt;
        b.angVel.y += Math.cos(elapsedTime * 15 + i) * b.rogueThrust * 3.8 * dt;
      } else {
        b.rogueThrust = Math.max(0, b.rogueThrust - dt * 2.8);
      }

      // Gravity + aerodynamic drag + flat-plate flutter torque + crosswinds
      b.vel.y -= POD_CONFIG.gravity * dt;
      if (hasCrosswind) {
        b.vel.x += nearSlice.right.x * windAccel * (0.6 + b.desc.drag) * dt;
        b.vel.z += nearSlice.right.z * windAccel * (0.6 + b.desc.drag) * dt;
      }

      const spd = b.vel.length();
      if (spd > 0.01) {
        const dragDecel = b.desc.drag * spd + 0.0028 * b.desc.drag * spd * spd;
        const scale = Math.max(0, 1 - (dragDecel / spd) * dt);
        b.vel.multiplyScalar(scale);

        if (b.desc.flutter > 0.1 && spd > 6) {
          b.angVel.x += Math.sin(elapsedTime * 13 + i * 1.7) * b.desc.flutter * spd * 0.12 * dt;
          b.angVel.z += Math.cos(elapsedTime * 11 + i * 2.3) * b.desc.flutter * spd * 0.12 * dt;
        }
      }

      // Air rotational damping
      b.angVel.multiplyScalar(Math.exp(-0.35 * dt));

      // Integrate linear & angular motion
      b.comPos.addScaledVector(b.vel, dt);
      const omegaLen = b.angVel.length();
      if (omegaLen > 1e-4) {
        this.tmpAxis.copy(b.angVel).divideScalar(omegaLen);
        this.tmpDeltaQuat.setFromAxisAngle(this.tmpAxis, omegaLen * dt);
        b.quat.premultiply(this.tmpDeltaQuat).normalize();
      }

      // Terrain ground & cliff-step collision
      const ground = track.sampleGround(b.comPos.x, b.comPos.y, b.comPos.z);
      const prevGround = track.sampleGround(b.prevComPos.x, b.prevComPos.y, b.prevComPos.z);

      if (
        ground.groundY - b.comPos.y > 2.0 &&
        ground.groundY - prevGround.groundY > 2.2
      ) {
        // Struck a sheer vertical cliff face horizontally -> rebound instead of snapping up!
        b.comPos.x = b.prevComPos.x;
        b.comPos.z = b.prevComPos.z;
        const hImpact = Math.hypot(b.vel.x, b.vel.z);
        b.vel.x *= -b.desc.restitution;
        b.vel.z *= -b.desc.restitution;
        b.bounceCount++;
        b.rogueThrust *= 0.2;
        if (hImpact > 6 && b.desc.mass >= 50) {
          podVfx.triggerSparks(b.comPos, 14, b.vel, 0.9);
          this.emitSpatialBounceSound(b.comPos, hImpact / 28, audio, cameraPos, cameraRight);
          if (b.desc.mass >= 200) {
            majorImpactTrauma = Math.max(majorImpactTrauma, Math.min(0.45, hImpact / 55));
          }
        }
      } else if (b.comPos.y - b.desc.radius < ground.groundY) {
        const pen = ground.groundY - (b.comPos.y - b.desc.radius);
        b.comPos.y += pen;

        const vn = b.vel.dot(ground.normal);
        if (vn < 0) {
          const impactSpd = -vn;
          const effRest = impactSpd > 3.0 ? b.desc.restitution : 0.08;
          b.vel.addScaledVector(ground.normal, -(1 + effRest) * vn);

          // Tangential surface friction + rolling/tumbling torque: omega += (n x v_tan) / r
          this.tmpVecA
            .copy(b.vel)
            .addScaledVector(ground.normal, -b.vel.dot(ground.normal));
          const tanSpd = this.tmpVecA.length();
          const mu = b.desc.friction * surfaceFrictionMult;
          if (tanSpd > 0.05) {
            const impulseDv = Math.min(
              tanSpd * 0.55,
              mu * Math.max(impactSpd * 0.65, POD_CONFIG.gravity * dt * 2.8)
            );
            b.vel.addScaledVector(this.tmpVecA, -impulseDv / tanSpd);

            // Impart rolling tumble from ground grip
            this.tmpVecB.crossVectors(ground.normal, this.tmpVecA).multiplyScalar(
              (impulseDv / tanSpd) * (0.55 / Math.max(0.2, b.desc.radius))
            );
            b.angVel.add(this.tmpVecB);
          }

          b.angVel.multiplyScalar(0.86);
          b.fanSpinRate *= 0.65;
          if (impactSpd > 5.0) {
            b.bounceCount++;
            b.rogueThrust *= 0.35;
          }

          if ((impactSpd > 4.5 || tanSpd > 16) && b.desc.mass >= 35) {
            if (impactSpd > 4.5) {
              podVfx.triggerGroundBounceVfx(
                b.comPos,
                b.vel,
                ground.groundY,
                impactSpd
              );
              this.emitSpatialBounceSound(
                b.comPos,
                impactSpd / 26,
                audio,
                cameraPos,
                cameraRight
              );
              if (b.desc.mass >= 200) {
                majorImpactTrauma = Math.max(
                  majorImpactTrauma,
                  Math.min(0.42, impactSpd / 45)
                );
              }
            } else if (Math.random() < dt * 18) {
              // High-speed metal skid sparks along canyon dirt/rock
              podVfx.triggerSparks(b.comPos, 3, b.vel, 0.65);
            }
          }
        } else {
          // Resting/sliding contact damping
          b.vel.x *= 1 - Math.min(1, b.desc.friction * surfaceFrictionMult * 2.4 * dt);
          b.vel.z *= 1 - Math.min(1, b.desc.friction * surfaceFrictionMult * 2.4 * dt);
          b.angVel.multiplyScalar(Math.exp(-3.2 * dt));
        }
      }

      // Canyon wall, cave ceiling & slalom pillar collision
      const wallRes = track.resolveWallAndCeilingCollision(
        b.comPos,
        b.vel,
        b.desc.radius
      );
      if (wallRes.hitWall && wallRes.impactSpeed > 4.5) {
        b.bounceCount++;
        b.rogueThrust *= 0.3;
        b.angVel.x += (Math.random() - 0.5) * wallRes.impactSpeed * 0.35;
        b.angVel.y += (Math.random() - 0.5) * wallRes.impactSpeed * 0.45;
        if (b.desc.mass >= 35) {
          podVfx.triggerSparks(b.comPos, 12, b.vel, 0.85);
          this.emitSpatialBounceSound(
            b.comPos,
            wallRes.impactSpeed / 28,
            audio,
            cameraPos,
            cameraRight
          );
          if (b.desc.mass >= 200) {
            majorImpactTrauma = Math.max(
              majorImpactTrauma,
              Math.min(0.4, wallRes.impactSpeed / 50)
            );
          }
        }
      }

      this.syncNodeTransform(b);

      // Update engine-specific visuals & persistent fire/smoke wreck plumes
      if (b.desc.kind === 'left_engine' || b.desc.kind === 'right_engine') {
        b.engineHeat = Math.max(35, b.engineHeat - dt * 12);
        b.fanSpinRate = Math.max(0, b.fanSpinRate - dt * 6);
        const sideName = b.desc.kind === 'left_engine' ? 'left' : 'right';
        podMesh.updateDetachedEngineVisuals(
          sideName,
          this.elapsedSec < b.rogueThrustDuration ? b.rogueThrust : 0,
          b.engineHeat,
          b.fanSpinRate,
          dt,
          elapsedTime
        );

        const fireIntensity = Math.max(0.15, 1 - this.elapsedSec * 0.26);
        podVfx.emitWreckTrail(
          b.comPos,
          b.vel,
          28 * fireIntensity,
          26,
          dt
        );
      } else if (b.desc.kind === 'cockpit') {
        podVfx.emitWreckTrail(b.comPos, b.vel, 6, 14, dt);
      }
    }

    // 2. Update severing plasma binder arc (snaps violently in first 0.28s)
    podMesh.getEngineWorldEmitter('left', this.tmpVecA);
    podMesh.getEngineWorldEmitter('right', this.tmpVecB);
    podMesh.updateSeveringPlasmaWorld(
      this.tmpVecA,
      this.tmpVecB,
      Math.min(1, this.elapsedSec / 0.28)
    );

    // 3. Simulate whipping severed control tether cables in world space
    for (const cable of this.cables) {
      const anchor = podMesh.getCockpitWorldArm(cable.side, this.tmpVecA);

      cable.freeEndVel.y -= POD_CONFIG.gravity * dt;
      cable.freeEndVel.multiplyScalar(Math.exp(-1.6 * dt));
      cable.freeEndPos.addScaledVector(cable.freeEndVel, dt);

      // Keep cable within max physical tether length of cockpit outrigger
      this.tmpRel.copy(cable.freeEndPos).sub(anchor);
      const dist = this.tmpRel.length();
      if (dist > cable.maxLen && dist > 1e-4) {
        this.tmpRel.divideScalar(dist);
        cable.freeEndPos.copy(anchor).addScaledVector(this.tmpRel, cable.maxLen);
        const vOut = cable.freeEndVel.dot(this.tmpRel);
        if (vOut > 0) {
          cable.freeEndVel.addScaledVector(this.tmpRel, -vOut * 1.15);
        }
      }

      const cGround = track.sampleGround(
        cable.freeEndPos.x,
        cable.freeEndPos.y,
        cable.freeEndPos.z
      );
      if (
        cable.freeEndPos.y < cGround.groundY + 0.08 &&
        cGround.groundY - cable.freeEndPos.y < 2.2
      ) {
        cable.freeEndPos.y = cGround.groundY + 0.08;
        if (cable.freeEndVel.y < 0) cable.freeEndVel.y *= -0.2;
        cable.freeEndVel.x *= Math.exp(-5 * dt);
        cable.freeEndVel.z *= Math.exp(-5 * dt);
      }

      // Spring-lagged midpoint for realistic whip curvature
      this.tmpVecB.copy(anchor).lerp(cable.freeEndPos, 0.5);
      this.tmpVecB.y -= 0.35;
      cable.midVel.x += (this.tmpVecB.x - cable.midPos.x) * 42 * dt;
      cable.midVel.y += (this.tmpVecB.y - cable.midPos.y - 4.0) * 42 * dt;
      cable.midVel.z += (this.tmpVecB.z - cable.midPos.z) * 42 * dt;
      cable.midVel.multiplyScalar(Math.exp(-5.5 * dt));
      cable.midPos.addScaledVector(cable.midVel, dt);

      const mGround = track.sampleGround(cable.midPos.x, cable.midPos.y, cable.midPos.z);
      if (cable.midPos.y < mGround.groundY + 0.06 && mGround.groundY - cable.midPos.y < 2.2) {
        cable.midPos.y = mGround.groundY + 0.06;
        if (cable.midVel.y < 0) cable.midVel.y = 0;
      }

      podMesh.updateSeveredWorldCable(
        cable.side,
        anchor,
        cable.freeEndPos,
        cable.midPos
      );
    }

    // 4. Step instanced metallic shrapnel chunks
    this.stepShrapnel(dt, track);

    return { majorImpactTrauma };
  }

  private stepShrapnel(dt: number, track: TrackBuilder): void {
    for (let i = 0; i < SHRAPNEL_COUNT; i++) {
      const c = this.shrapnelPool[i];
      if (!c.active) continue;

      c.prevPos.copy(c.pos);
      c.vel.y -= POD_CONFIG.gravity * dt;
      c.vel.multiplyScalar(Math.exp(-0.55 * dt));
      c.pos.addScaledVector(c.vel, dt);

      const wLen = c.angVel.length();
      if (wLen > 1e-3) {
        this.tmpAxis.copy(c.angVel).divideScalar(wLen);
        this.tmpDeltaQuat.setFromAxisAngle(this.tmpAxis, wLen * dt);
        c.quat.premultiply(this.tmpDeltaQuat).normalize();
      }

      const g = track.sampleGround(c.pos.x, c.pos.y, c.pos.z);
      if (c.pos.y - c.radius < g.groundY && g.groundY - c.pos.y < 2.2) {
        c.pos.y = g.groundY + c.radius;
        const vn = c.vel.dot(g.normal);
        if (vn < 0) {
          c.vel.addScaledVector(g.normal, -1.38 * vn);
          c.vel.x *= 0.72;
          c.vel.z *= 0.72;
          c.angVel.multiplyScalar(0.75);
        }
      }
      track.resolveWallAndCeilingCollision(c.pos, c.vel, c.radius);

      this.dummy.position.copy(c.pos);
      this.dummy.quaternion.copy(c.quat);
      this.dummy.scale.copy(c.scale);
      this.dummy.updateMatrix();
      this.shrapnelMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.shrapnelMesh.instanceMatrix.needsUpdate = true;
  }

  private syncNodeTransform(body: DisassemblyRigidBody): void {
    const comOffsetWorld = this.tmpVecC
      .copy(body.desc.comOffsetLocal)
      .multiply(body.worldScale)
      .applyQuaternion(body.quat);
    body.desc.node.position.copy(body.comPos).sub(comOffsetWorld);
    body.desc.node.quaternion.copy(body.quat);
    body.desc.node.scale.copy(body.worldScale);
  }

  private emitSpatialBounceSound(
    worldPos: THREE.Vector3,
    severity: number,
    audio: AudioEngine,
    cameraPos: THREE.Vector3,
    cameraRight: THREE.Vector3
  ): void {
    const dist = worldPos.distanceTo(cameraPos);
    const atten = THREE.MathUtils.clamp(1 - dist / 95, 0.12, 1);
    this.tmpRel.copy(worldPos).sub(cameraPos);
    if (this.tmpRel.lengthSq() > 1e-4) this.tmpRel.normalize();
    const pan = THREE.MathUtils.clamp(this.tmpRel.dot(cameraRight), -0.85, 0.85);
    audio.playDebrisBounce(severity * atten, pan);
  }

  public getFocusTarget(outPos: THREE.Vector3, outVel: THREE.Vector3): void {
    if (!this.cockpitBody) {
      outPos.set(0, 0, 0);
      outVel.set(0, 0, 0);
      return;
    }

    // Weight focus primarily on the cockpit while blending in nearby engines so wide scatter stays framed
    outPos.copy(this.cockpitBody.comPos);
    outVel.copy(this.cockpitBody.vel);
    let totalW = 1.0;

    for (const eng of [this.leftEngineBody, this.rightEngineBody]) {
      if (!eng) continue;
      const d = eng.comPos.distanceTo(this.cockpitBody.comPos);
      // Fade weight smoothly if an engine falls far off a cliff relative to the cockpit
      const w = 0.42 * THREE.MathUtils.clamp(1 - (d - 16) / 38, 0.08, 1.0);
      outPos.addScaledVector(eng.comPos, w);
      outVel.addScaledVector(eng.vel, w);
      totalW += w;
    }

    outPos.divideScalar(totalW);
    outVel.divideScalar(totalW);
  }

  public getCockpitSpeedKmh(): number {
    if (!this.cockpitBody) return 0;
    return this.cockpitBody.vel.length() * 3.6;
  }

  public reassemble(podMesh: PodMeshBuilder, selectedMod: PodModificationId): void {
    if (!this.active && this.bodies.length === 0) return;

    // Restore every anatomical sub-part back to its exact original parent and local TRS
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const b = this.bodies[i];
      b.origParent.add(b.desc.node);
      b.desc.node.position.copy(b.origLocalPos);
      b.desc.node.quaternion.copy(b.origLocalQuat);
      b.desc.node.scale.copy(b.origLocalScale);
    }

    this.bodies = [];
    this.leftEngineBody = null;
    this.rightEngineBody = null;
    this.cockpitBody = null;

    // Hide shrapnel instances & detonation flash
    this.dummy.scale.set(0, 0, 0);
    this.dummy.updateMatrix();
    for (let i = 0; i < SHRAPNEL_COUNT; i++) {
      this.shrapnelPool[i].active = false;
      this.shrapnelMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.shrapnelMesh.instanceMatrix.needsUpdate = true;
    this.explosionLight.intensity = 0;

    podMesh.restoreAfterDisassembly(selectedMod);
    this.active = false;
    this.elapsedSec = 0;
  }
}
