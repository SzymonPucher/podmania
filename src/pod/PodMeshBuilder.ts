import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PodModificationId, PodTelemetry } from '../types';
import { getHullMalfunctionTier } from './PodConfig';

interface HeatMaterialEntry {
  mat: THREE.MeshStandardMaterial;
  baseColor: THREE.Color;
  baseEmissive: THREE.Color;
}

export type DisassemblyPartKind =
  | 'left_engine'
  | 'right_engine'
  | 'cockpit'
  | 'belly_tank'
  | 'intake_rotor'
  | 'air_flap'
  | 'winglet'
  | 'outrigger'
  | 'mod_part';

export interface DetachablePartDescriptor {
  id: string;
  node: THREE.Object3D;
  parentKind: 'root' | 'left_engine' | 'right_engine' | 'cockpit';
  comOffsetLocal: THREE.Vector3;
  radius: number;
  mass: number;
  restitution: number;
  friction: number;
  drag: number;
  flutter: number;
  kind: DisassemblyPartKind;
  side: -1 | 0 | 1;
}

interface EngineVisualRefs {
  root: THREE.Group;
  bellyGroup: THREE.Group;
  intakeGroup: THREE.Group;
  fanGroup: THREE.Group;
  flaps: Array<{
    hingeOffset: THREE.Group;
    pivot: THREE.Group;
    axis: THREE.Vector3;
    sign: number;
  }>;
  exhaustCore: THREE.Mesh;
  exhaustOuter: THREE.Mesh;
  reversePuff: THREE.Mesh;
  emitterWorldDummy: THREE.Object3D;
  pylonDummy: THREE.Object3D;
  heatMaterials: HeatMaterialEntry[];
  modNitroGroup: THREE.Group;
  modCoolantGroup: THREE.Group;
  modFlyingGroup: THREE.Group;
}

interface CableBuffer {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  positions: Float32Array;
  rings: number;
  sides: number;
}

interface CableHardwareMount {
  node: THREE.Group;
  u: number;
}

interface DetailedCableAssembly {
  group: THREE.Group;
  mainCable: CableBuffer;
  energyConduit: CableBuffer;
  dataConduit: CableBuffer;
  mounts: CableHardwareMount[];
  sideSign: -1 | 1;
}

const PLASMA_SEGMENTS = 14;
const MAIN_CABLE_RINGS = 28;
const MAIN_CABLE_SIDES = 10;
const MAIN_CABLE_RADIUS = 0.044;
const AUX_CABLE_RINGS = 24;
const AUX_CABLE_SIDES = 6;
const ENERGY_CONDUIT_RADIUS = 0.017;
const DATA_CONDUIT_RADIUS = 0.014;
const COCKPIT_BASE_Z = 5.325;
const COCKPIT_SCALE = 0.72;
const CABLE_MOUNT_US = [0.055, 0.2, 0.35, 0.5, 0.65, 0.8, 0.935] as const;

export class PodMeshBuilder {
  public readonly podRoot = new THREE.Group();
  public readonly enginesGroup = new THREE.Group();
  public readonly cockpitGroup = new THREE.Group();

  private readonly leftEngine: EngineVisualRefs;
  private readonly rightEngine: EngineVisualRefs;
  private readonly cockpitPilotGroup = new THREE.Group();
  private cockpitLeftWingGroup!: THREE.Group;
  private cockpitRightWingGroup!: THREE.Group;
  private cockpitLeftArmGroup!: THREE.Group;
  private cockpitRightArmGroup!: THREE.Group;
  private readonly damperLight: THREE.PointLight;

  private readonly cockpitLeftArmDummy = new THREE.Object3D();
  private readonly cockpitRightArmDummy = new THREE.Object3D();
  private cockpitRepulsorMat!: THREE.MeshStandardMaterial;
  private conduitEnergyMat!: THREE.MeshStandardMaterial;
  private couplerGlowMat!: THREE.MeshStandardMaterial;

  private readonly plasmaLines: Array<{
    line: THREE.Line;
    positions: Float32Array;
    jitterScale: number;
  }> = [];

  private readonly leftCable: DetailedCableAssembly;
  private readonly rightCable: DetailedCableAssembly;

  // Reusable scratch objects (zero per-frame allocations)
  private readonly tmpA = new THREE.Vector3();
  private readonly tmpB = new THREE.Vector3();
  private readonly tmpMid = new THREE.Vector3();
  private readonly tmpP1 = new THREE.Vector3();
  private readonly tmpP2 = new THREE.Vector3();
  private readonly tmpTan = new THREE.Vector3();
  private readonly tmpNorm = new THREE.Vector3();
  private readonly tmpBinorm = new THREE.Vector3();
  private readonly tmpAuxPt = new THREE.Vector3();
  private readonly tmpChord = new THREE.Vector3();
  private readonly tmpExitDir = new THREE.Vector3();
  private readonly tmpEntryDir = new THREE.Vector3();
  private readonly tmpUp = new THREE.Vector3(0, 1, 0);
  private readonly tmpCurve = new THREE.CubicBezierCurve3();
  private readonly tmpBasisMat = new THREE.Matrix4();
  private readonly tmpInvRoot = new THREE.Matrix4();

  private flapFlareLeft = 0;
  private flapFlareRight = 0;
  private readonly normalOuterColor = new THREE.Color(0xff7711);
  private readonly boostOuterColor = new THREE.Color(0x38bdf8);
  private readonly nitroOuterColor = new THREE.Color(0xf43f5e);
  private readonly overloadOuterColor = new THREE.Color(0xef4444);
  private readonly malfunctionOuterColor = new THREE.Color(0xd9480f);
  private readonly heatColor = new THREE.Color(0xff2a14);
  private readonly heatEmissiveColor = new THREE.Color(0xff1e00);

  constructor() {
    this.podRoot.rotation.order = 'YXZ';
    this.enginesGroup.rotation.order = 'YXZ';
    this.cockpitGroup.rotation.order = 'YXZ';

    const mats = this.createMaterials();

    this.leftEngine = this.buildSingleEngine(-1.35, -1, mats);
    this.rightEngine = this.buildSingleEngine(1.35, 1, mats);
    this.enginesGroup.add(this.leftEngine.root, this.rightEngine.root);

    this.buildCockpit(mats);
    this.cockpitGroup.position.set(0, 0.85, COCKPIT_BASE_Z);
    this.cockpitGroup.scale.setScalar(COCKPIT_SCALE);

    this.damperLight = new THREE.PointLight(0x38bdf8, 0, 14, 1.5);
    this.damperLight.position.set(0, -0.5, 0.5);
    this.podRoot.add(this.damperLight);

    this.podRoot.add(this.enginesGroup, this.cockpitGroup);

    // Pre-allocate 3 crackling plasma binder strands
    const plasmaColors = [0xe040fb, 0xd946ef, 0xffb2ff];
    for (let i = 0; i < 3; i++) {
      const positions = new Float32Array((PLASMA_SEGMENTS + 1) * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: plasmaColors[i],
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: i === 2 ? 0.95 : 0.72,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      this.podRoot.add(line);
      this.plasmaLines.push({
        line,
        positions,
        jitterScale: i === 2 ? 0.08 : 0.14,
      });
    }

    // Pre-allocate twin detailed multi-strand control tether cable assemblies
    this.leftCable = this.createDetailedCableAssembly(-1, mats);
    this.rightCable = this.createDetailedCableAssembly(1, mats);
    this.podRoot.add(this.leftCable.group, this.rightCable.group);
  }

  public setModification(mod: PodModificationId): void {
    for (const eng of [this.leftEngine, this.rightEngine]) {
      eng.modNitroGroup.visible = mod === 'nitro';
      eng.modCoolantGroup.visible = mod === 'cooled';
      eng.modFlyingGroup.visible = mod === 'flying';
    }
  }

  public update(t: PodTelemetry, dt: number, elapsedTime: number): void {
    this.podRoot.position.copy(t.pos);
    this.podRoot.rotation.set(t.pitch, t.yaw, t.roll, 'YXZ');

    // Subtle engine vibration & trailing cockpit
    const malfTier = t.hullIntegrity > 0 ? getHullMalfunctionTier(t.hullIntegrity) : 0;
    const malfSeverity = malfTier / 3; // 0, 0.33, 0.67, 1.0
    const malfVib = malfTier > 0 ? (0.012 + malfSeverity * 0.032) : 0;
    const overloadVib = t.airborneOverload ? 0.055 : 0;
    const overheatVib = t.overheatedLeft || t.overheatedRight ? 0.032 : 0;
    const nitroVib = t.nitroActive ? 0.028 : 0;
    const vib =
      (Math.abs(t.pLeft) + Math.abs(t.pRight)) * 0.008 +
      malfVib +
      overloadVib +
      overheatVib +
      nitroVib;
    this.enginesGroup.position.set(
      (Math.random() - 0.5) * vib,
      (Math.random() - 0.5) * vib,
      0
    );
    this.enginesGroup.rotation.x = 0;

    // Organic idle hover dangle transitioning into subtle high-speed aerodynamic buffet
    const idleWeight = 1 - THREE.MathUtils.clamp(t.speedMs / 18, 0, 1);
    const aeroWeight = THREE.MathUtils.clamp(t.speedMs / 75, 0, 1);
    const revEnergy = (Math.abs(t.pLeft) + Math.abs(t.pRight)) * 0.5;
    const idleSwayX =
      (Math.sin(elapsedTime * 1.45) * 0.085 + Math.sin(elapsedTime * 2.85) * 0.025) *
      idleWeight;
    const idleBobY =
      (Math.sin(elapsedTime * 2.15 + 0.6) * 0.065 + Math.cos(elapsedTime * 3.9) * 0.018) *
      idleWeight;
    const idleRoll =
      (Math.cos(elapsedTime * 1.45) * 0.048 + Math.sin(elapsedTime * 2.7) * 0.015) *
      idleWeight;
    const idlePitch = Math.sin(elapsedTime * 1.85 + 1.1) * 0.028 * idleWeight;

    const buffetScale =
      aeroWeight * (0.016 + t.landingBoost * 0.014 + (t.nitroActive ? 0.016 : 0)) +
      revEnergy * 0.008;
    const aeroBuffetX = Math.sin(elapsedTime * 17.3) * buffetScale;
    const aeroBuffetY = Math.cos(elapsedTime * 21.7) * buffetScale * 0.9;
    const aeroBuffetRoll = Math.sin(elapsedTime * 14.9) * buffetScale * 1.1;
    const aeroBuffetPitch = Math.cos(elapsedTime * 16.1) * buffetScale * 0.65;

    // Independent per-engine elastic motion (~50% of cabin dangle + out-of-phase hover float)
    const engL = t.engineLeftOffset;
    const engR = t.engineRightOffset;
    const engIdleX_L =
      (Math.sin(elapsedTime * 1.65 + 0.8) * 0.042 + Math.sin(elapsedTime * 3.1) * 0.012) *
      idleWeight;
    const engIdleY_L =
      (Math.sin(elapsedTime * 2.35 + 1.9) * 0.036 + Math.cos(elapsedTime * 4.2) * 0.01) *
      idleWeight;
    const engIdleZ_L = Math.sin(elapsedTime * 1.9 + 0.4) * 0.025 * idleWeight;
    const engIdleRoll_L = Math.cos(elapsedTime * 1.7 + 0.5) * 0.026 * idleWeight;
    const engIdlePitch_L = Math.sin(elapsedTime * 2.05 + 2.2) * 0.016 * idleWeight;

    const engIdleX_R =
      (Math.sin(elapsedTime * 1.55 + 3.4) * 0.042 + Math.cos(elapsedTime * 2.95) * 0.012) *
      idleWeight;
    const engIdleY_R =
      (Math.sin(elapsedTime * 2.25 + 4.5) * 0.036 + Math.sin(elapsedTime * 3.85) * 0.01) *
      idleWeight;
    const engIdleZ_R = Math.cos(elapsedTime * 1.8 + 2.1) * 0.025 * idleWeight;
    const engIdleRoll_R = Math.sin(elapsedTime * 1.6 + 3.1) * 0.026 * idleWeight;
    const engIdlePitch_R = Math.cos(elapsedTime * 1.95 + 0.7) * 0.016 * idleWeight;

    const engBuffetL = buffetScale * 0.52;
    const engBuffetR = buffetScale * 0.52;

    // Purely graphical engine malfunction shudder & misfire coughs when hull < 75%
    const malfCoughL =
      malfTier > 0 && Math.sin(elapsedTime * (5.3 + malfTier * 2.1) + 0.7) > 0.92 - malfSeverity * 0.14
        ? 1
        : 0;
    const malfCoughR =
      malfTier > 0 && Math.sin(elapsedTime * (4.7 + malfTier * 2.4) + 3.1) > 0.92 - malfSeverity * 0.14
        ? 1
        : 0;
    const malfAmp = malfSeverity * (0.025 + revEnergy * 0.028);
    const malfJitXL = malfAmp * Math.sin(elapsedTime * 37.3 + 0.4) + malfCoughL * malfSeverity * 0.045 * (Math.random() - 0.5);
    const malfJitYL = malfAmp * Math.cos(elapsedTime * 43.1 + 1.1) + malfCoughL * malfSeverity * 0.04 * (Math.random() - 0.5);
    const malfJitZL = malfCoughL * malfSeverity * 0.09;
    const malfRollL = malfAmp * 1.4 * Math.sin(elapsedTime * 29.7) + malfCoughL * malfSeverity * 0.055;
    const malfPitchL = malfAmp * 0.9 * Math.cos(elapsedTime * 33.4) - malfCoughL * malfSeverity * 0.04;

    const malfJitXR = malfAmp * Math.cos(elapsedTime * 35.9 + 2.2) + malfCoughR * malfSeverity * 0.045 * (Math.random() - 0.5);
    const malfJitYR = malfAmp * Math.sin(elapsedTime * 41.7 + 2.8) + malfCoughR * malfSeverity * 0.04 * (Math.random() - 0.5);
    const malfJitZR = malfCoughR * malfSeverity * 0.09;
    const malfRollR = malfAmp * 1.4 * Math.cos(elapsedTime * 28.3 + 1.5) - malfCoughR * malfSeverity * 0.055;
    const malfPitchR = malfAmp * 0.9 * Math.sin(elapsedTime * 31.8 + 0.9) - malfCoughR * malfSeverity * 0.04;

    this.leftEngine.root.position.set(
      -1.35 + engL.x + engIdleX_L + Math.sin(elapsedTime * 19.1 + 0.5) * engBuffetL + malfJitXL,
      engL.y + engIdleY_L + Math.cos(elapsedTime * 23.3 + 1.2) * engBuffetL + malfJitYL,
      engL.z + engIdleZ_L + malfJitZL
    );
    this.leftEngine.root.rotation.set(
      engL.pitch + engIdlePitch_L + Math.cos(elapsedTime * 17.5) * engBuffetL * 0.65 + malfPitchL,
      engL.yaw + engIdleX_L * 0.14,
      engL.roll + engIdleRoll_L + Math.sin(elapsedTime * 15.8 + 0.9) * engBuffetL * 1.1 + malfRollL,
      'YXZ'
    );

    this.rightEngine.root.position.set(
      1.35 + engR.x + engIdleX_R + Math.cos(elapsedTime * 18.4 + 2.1) * engBuffetR + malfJitXR,
      engR.y + engIdleY_R + Math.sin(elapsedTime * 22.7 + 3.0) * engBuffetR + malfJitYR,
      engR.z + engIdleZ_R + malfJitZR
    );
    this.rightEngine.root.rotation.set(
      engR.pitch + engIdlePitch_R + Math.sin(elapsedTime * 16.9 + 1.7) * engBuffetR * 0.65 + malfPitchR,
      engR.yaw + engIdleX_R * 0.14,
      engR.roll + engIdleRoll_R + Math.cos(elapsedTime * 15.2 + 2.4) * engBuffetR * 1.1 + malfRollR,
      'YXZ'
    );

    this.cockpitGroup.position.set(
      t.cockpitLatOffset + idleSwayX + aeroBuffetX,
      0.85 + t.cockpitVertOffset + idleBobY + aeroBuffetY,
      COCKPIT_BASE_Z + t.cockpitLongOffset
    );
    this.cockpitGroup.rotation.set(
      t.cockpitPitchOffset + idlePitch + aeroBuffetPitch,
      t.cockpitYawOffset + idleSwayX * 0.16,
      t.cockpitRollOffset + idleRoll + aeroBuffetRoll,
      'YXZ'
    );
    this.cockpitPilotGroup.rotation.z = t.roll * 0.3;

    // Reactive under-belly repulsor pad glow & cable coupler / power conduit accents
    const repulsorPulse = 0.9 + Math.sin(elapsedTime * 7.5) * 0.12;
    this.cockpitRepulsorMat.emissiveIntensity =
      (1.25 + t.landingBoost * 1.9 + (t.nitroActive ? 0.6 : 0)) * repulsorPulse;

    const maxHeat = Math.max(t.heatLeft, t.heatRight) / 100;
    const malfFlicker =
      malfTier > 0 && (malfCoughL > 0 || malfCoughR > 0 || Math.random() < malfSeverity * 0.08)
        ? 0.35 + Math.random() * 0.4
        : 1.0;
    const energyPulse = (0.85 + 0.15 * Math.sin(elapsedTime * 11.0)) * malfFlicker;
    if (t.coolantActive) {
      this.couplerGlowMat.color.setHex(0x67e8f9);
      this.couplerGlowMat.emissive.setHex(0x38bdf8);
      this.couplerGlowMat.emissiveIntensity = 1.9 * energyPulse;
      this.conduitEnergyMat.emissive.setHex(0x0c4a6e);
      this.conduitEnergyMat.emissiveIntensity = 0.9;
    } else if (t.nitroActive) {
      this.couplerGlowMat.color.setHex(0xfb923c);
      this.couplerGlowMat.emissive.setHex(0xf97316);
      this.couplerGlowMat.emissiveIntensity = 2.1 * energyPulse;
      this.conduitEnergyMat.emissive.setHex(0x9a3412);
      this.conduitEnergyMat.emissiveIntensity = 1.15;
    } else if (t.landingBoost > 0.05) {
      this.couplerGlowMat.color.setHex(0x7dd3fc);
      this.couplerGlowMat.emissive.setHex(0x38bdf8);
      this.couplerGlowMat.emissiveIntensity = (1.1 + t.landingBoost * 1.3) * energyPulse;
      this.conduitEnergyMat.emissive.setHex(0x1e3a5f);
      this.conduitEnergyMat.emissiveIntensity = 0.65;
    } else {
      this.couplerGlowMat.color.setHex(0x38bdf8);
      this.couplerGlowMat.emissive.setHex(0x0ea5e9);
      this.couplerGlowMat.emissiveIntensity = (0.55 + revEnergy * 0.65) * energyPulse;
      this.conduitEnergyMat.emissive.setHex(0x451a03);
      this.conduitEnergyMat.emissiveIntensity = 0.18 + revEnergy * 0.25 + maxHeat * 0.65;
    }

    // Update left & right engine animations
    this.flapFlareLeft = THREE.MathUtils.lerp(
      this.flapFlareLeft,
      t.pLeft < -0.05 ? 1 : 0,
      1 - Math.exp(-14 * dt)
    );
    this.flapFlareRight = THREE.MathUtils.lerp(
      this.flapFlareRight,
      t.pRight < -0.05 ? 1 : 0,
      1 - Math.exp(-14 * dt)
    );

    this.updateEngineVisuals(
      this.leftEngine,
      t.pLeft,
      this.flapFlareLeft,
      t.landingBoost,
      t.airborneOverload,
      t.heatLeft,
      t.overheatedLeft,
      t.nitroActive && !t.overheatedLeft,
      malfSeverity,
      malfCoughL > 0,
      dt,
      elapsedTime,
      0.0
    );
    this.updateEngineVisuals(
      this.rightEngine,
      t.pRight,
      this.flapFlareRight,
      t.landingBoost,
      t.airborneOverload,
      t.heatRight,
      t.overheatedRight,
      t.nitroActive && !t.overheatedRight,
      malfSeverity,
      malfCoughR > 0,
      dt,
      elapsedTime,
      2.3
    );

    // Glow under pod during landing boost, nitro burn, or cryo-coolant flush
    if (t.nitroActive) {
      this.damperLight.color.setHex(0xf97316);
      this.damperLight.intensity = 20;
    } else if (t.coolantActive) {
      this.damperLight.color.setHex(0x67e8f9);
      this.damperLight.intensity = 15;
    } else if (t.landingBoost > 0.02) {
      this.damperLight.color.setHex(0x38bdf8);
      this.damperLight.intensity = t.landingBoost * 22;
    } else {
      this.damperLight.intensity = 0;
    }

    // Ensure matrices are current before computing local attachment points
    this.podRoot.updateMatrixWorld(true);
    const invRoot = this.tmpInvRoot.copy(this.podRoot.matrixWorld).invert();

    // Update Plasma Binder Arc (unstable crackle & brief flickers when hull damaged)
    this.leftEngine.emitterWorldDummy.getWorldPosition(this.tmpA).applyMatrix4(invRoot);
    this.rightEngine.emitterWorldDummy.getWorldPosition(this.tmpB).applyMatrix4(invRoot);
    const plasmaJitterMult = 1 + malfSeverity * 1.35 + (malfCoughL || malfCoughR ? malfSeverity * 0.85 : 0);
    for (let l = 0; l < this.plasmaLines.length; l++) {
      const arc = this.plasmaLines[l];
      const pos = arc.positions;
      const baseOpacity = l === 2 ? 0.95 : 0.72;
      const lineMat = arc.line.material as THREE.LineBasicMaterial;
      lineMat.opacity =
        malfTier > 0 && Math.random() < malfSeverity * 0.12
          ? baseOpacity * (0.2 + Math.random() * 0.45)
          : baseOpacity;
      const jitter = arc.jitterScale * plasmaJitterMult;
      for (let i = 0; i <= PLASMA_SEGMENTS; i++) {
        const u = i / PLASMA_SEGMENTS;
        const env = Math.sin(u * Math.PI);
        const jx = (Math.random() - 0.5) * jitter * env;
        const jy = (Math.random() - 0.5) * jitter * env;
        const jz = (Math.random() - 0.5) * jitter * env;
        pos[i * 3] = THREE.MathUtils.lerp(this.tmpA.x, this.tmpB.x, u) + jx;
        pos[i * 3 + 1] = THREE.MathUtils.lerp(this.tmpA.y, this.tmpB.y, u) + jy;
        pos[i * 3 + 2] = THREE.MathUtils.lerp(this.tmpA.z, this.tmpB.z, u) + jz;
      }
      arc.line.geometry.attributes.position.needsUpdate = true;
    }

    // Update Twin Detailed Multi-Strand Control Tether Cables
    this.leftEngine.pylonDummy.getWorldPosition(this.tmpA).applyMatrix4(invRoot);
    this.cockpitLeftArmDummy.getWorldPosition(this.tmpB).applyMatrix4(invRoot);
    this.updateDetailedCable(
      this.leftCable,
      this.tmpA,
      this.tmpB,
      this.leftEngine.root.quaternion,
      this.cockpitGroup.quaternion,
      t,
      t.pLeft,
      elapsedTime
    );

    this.rightEngine.pylonDummy.getWorldPosition(this.tmpA).applyMatrix4(invRoot);
    this.cockpitRightArmDummy.getWorldPosition(this.tmpB).applyMatrix4(invRoot);
    this.updateDetailedCable(
      this.rightCable,
      this.tmpA,
      this.tmpB,
      this.rightEngine.root.quaternion,
      this.cockpitGroup.quaternion,
      t,
      t.pRight,
      elapsedTime
    );
  }

  private updateEngineVisuals(
    eng: EngineVisualRefs,
    power: number,
    flare: number,
    landingBoost: number,
    airborneOverload: boolean,
    heat: number,
    overheated: boolean,
    nitroActive: boolean,
    malfunctionSeverity: number,
    malfunctionCough: boolean,
    dt: number,
    elapsedTime: number,
    phaseOffset: number
  ): void {
    // Update engine hull redness & thermal glow based on overheat level (0..100)
    const heatFrac = THREE.MathUtils.clamp(heat / 100, 0, 1);
    const redness = Math.pow(heatFrac, 1.15);
    const overheatPulse = overheated ? 0.85 + 0.15 * Math.sin(elapsedTime * 16) : 1.0;
    for (let i = 0; i < eng.heatMaterials.length; i++) {
      const entry = eng.heatMaterials[i];
      entry.mat.color.copy(entry.baseColor).lerp(this.heatColor, redness * 0.72);
      entry.mat.emissive
        .copy(entry.baseEmissive)
        .lerp(this.heatEmissiveColor, redness * (overheated ? overheatPulse : 0.85));
      entry.mat.emissiveIntensity =
        1.0 + redness * (overheated ? 2.4 * overheatPulse : 1.4);
    }

    // Spin 28-blade intake fan (slightly sluggish & stuttering visually when damaged)
    const fanMalfScale =
      malfunctionSeverity > 0
        ? (1 - malfunctionSeverity * 0.24) *
          (malfunctionCough ? 0.52 : 0.92 + 0.08 * Math.sin(elapsedTime * 19 + phaseOffset))
        : 1.0;
    eng.fanGroup.rotation.z +=
      dt *
      (4.0 + Math.abs(power) * 32.0 + landingBoost * 24.0 + (nitroActive ? 22.0 : 0)) *
      fanMalfScale;

    // Flare forward yellow airbrake flaps on reverse (-30%)
    const flareRad = flare * THREE.MathUtils.degToRad(26);
    for (const f of eng.flaps) {
      f.pivot.setRotationFromAxisAngle(f.axis, f.sign * flareRad);
    }

    // Rear exhaust jet plumes (supercharged during landing boost or nitro, sputtering on overload or hull malfunction)
    const posP = Math.max(0, power);
    const effPlume = Math.max(posP, landingBoost * 0.85, nitroActive ? 1.15 : 0);
    if (effPlume > 0.02) {
      const malfDropout =
        malfunctionSeverity > 0 &&
        (malfunctionCough
          ? Math.random() < 0.25 + malfunctionSeverity * 0.35
          : Math.random() < malfunctionSeverity * 0.045);

      if (malfDropout) {
        eng.exhaustCore.visible = false;
        eng.exhaustOuter.visible = false;
      } else {
        eng.exhaustCore.visible = true;
        eng.exhaustOuter.visible = true;
        const malfSputter =
          malfunctionSeverity > 0
            ? (1 - malfunctionSeverity * 0.16) *
              (malfunctionCough
                ? 0.45 + Math.random() * 0.45
                : 1 - malfunctionSeverity * 0.22 * (0.5 + 0.5 * Math.sin(elapsedTime * 27 + phaseOffset)) * Math.random())
            : 1.0;
        const sputter = (airborneOverload ? 0.65 + Math.random() * 0.7 : 1.0) * malfSputter;
        const flicker = (0.9 + Math.sin(elapsedTime * 45 * Math.PI * 2) * 0.12) * sputter;
        const boostScale = 1 + landingBoost * 0.75 + (nitroActive ? 0.45 : 0);
        const lenScale = (0.35 + effPlume * 1.45) * flicker * boostScale;
        const radScale =
          (0.65 + Math.min(1.4, effPlume) * 0.45) *
          (1 + landingBoost * 0.3 + (nitroActive ? 0.22 : 0)) *
          (malfunctionCough ? 0.82 : 1.0);
        eng.exhaustCore.scale.set(radScale, lenScale * 0.85, radScale);
        eng.exhaustOuter.scale.set(radScale * 1.15, lenScale, radScale * 1.15);

        const outerMat = eng.exhaustOuter.material as THREE.MeshBasicMaterial;
        if (airborneOverload) {
          outerMat.color.copy(this.overloadOuterColor);
        } else if (nitroActive) {
          outerMat.color.copy(this.nitroOuterColor);
        } else if (landingBoost > 0.02) {
          outerMat.color
            .copy(this.normalOuterColor)
            .lerp(this.boostOuterColor, Math.min(1, landingBoost * 1.2));
        } else if (malfunctionSeverity > 0) {
          outerMat.color
            .copy(this.normalOuterColor)
            .lerp(
              this.malfunctionOuterColor,
              malfunctionCough ? 0.65 : malfunctionSeverity * 0.32
            );
        } else {
          outerMat.color.copy(this.normalOuterColor);
        }
      }
    } else {
      eng.exhaustCore.visible = false;
      eng.exhaustOuter.visible = false;
    }

    // Forward reverse-thrust puff
    if (power < -0.05) {
      eng.reversePuff.visible = true;
      const puffScale = 0.8 + Math.sin(elapsedTime * 40) * 0.2;
      eng.reversePuff.scale.set(puffScale, puffScale, puffScale);
    } else {
      eng.reversePuff.visible = false;
    }
  }

  private createCabinDustTextures(): {
    dustColorTex: THREE.CanvasTexture;
    dustRoughnessTex: THREE.CanvasTexture;
  } {
    const size = 256;
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = size;
    colorCanvas.height = size;
    const cctx = colorCanvas.getContext('2d')!;

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const rctx = roughCanvas.getContext('2d')!;

    // Deterministic PRNG for consistent desert weathering
    let seed = 4219;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Base warm brushed steel + medium roughness
    cctx.fillStyle = '#adb6c2';
    cctx.fillRect(0, 0, size, size);
    rctx.fillStyle = '#686868';
    rctx.fillRect(0, 0, size, size);

    // Subtle brushed metal streaks & panel wear
    for (let i = 0; i < 220; i++) {
      const y = rand() * size;
      const len = 30 + rand() * 110;
      const x = rand() * size;
      const bright = rand() > 0.5;
      cctx.fillStyle = bright ? 'rgba(225, 232, 240, 0.08)' : 'rgba(50, 56, 66, 0.09)';
      cctx.fillRect(x, y, len, 1 + rand() * 2);
    }

    // Desert sand/ochre dust patches & windblown grime streaks
    for (let i = 0; i < 160; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const rx = 8 + rand() * 34;
      const ry = 4 + rand() * 16;
      const alpha = 0.08 + rand() * 0.22;
      const warm = rand() > 0.35;
      cctx.fillStyle = warm
        ? `rgba(196, 152, 102, ${alpha.toFixed(2)})`
        : `rgba(154, 114, 76, ${alpha.toFixed(2)})`;
      cctx.beginPath();
      cctx.ellipse(x, y, rx, ry, (rand() - 0.5) * 0.4, 0, Math.PI * 2);
      cctx.fill();

      // Dusty spots become much rougher (matte)
      const rAlpha = 0.22 + rand() * 0.45;
      rctx.fillStyle = `rgba(235, 235, 235, ${rAlpha.toFixed(2)})`;
      rctx.beginPath();
      rctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      rctx.fill();
    }

    // Fine grit speckles
    for (let i = 0; i < 650; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const s = 1 + rand() * 2.2;
      cctx.fillStyle =
        rand() > 0.3 ? 'rgba(188, 146, 98, 0.35)' : 'rgba(82, 62, 44, 0.28)';
      cctx.fillRect(x, y, s, s);
      rctx.fillStyle = 'rgba(245, 245, 245, 0.5)';
      rctx.fillRect(x, y, s, s);
    }

    const dustColorTex = new THREE.CanvasTexture(colorCanvas);
    dustColorTex.wrapS = THREE.RepeatWrapping;
    dustColorTex.wrapT = THREE.RepeatWrapping;
    dustColorTex.repeat.set(2, 2);
    dustColorTex.colorSpace = THREE.SRGBColorSpace;

    const dustRoughnessTex = new THREE.CanvasTexture(roughCanvas);
    dustRoughnessTex.wrapS = THREE.RepeatWrapping;
    dustRoughnessTex.wrapT = THREE.RepeatWrapping;
    dustRoughnessTex.repeat.set(2, 2);

    return { dustColorTex, dustRoughnessTex };
  }

  private createCableTextures(): {
    cableColorTex: THREE.CanvasTexture;
    cableBumpTex: THREE.CanvasTexture;
  } {
    const size = 256;
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = size;
    colorCanvas.height = size;
    const cctx = colorCanvas.getContext('2d')!;

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = size;
    bumpCanvas.height = size;
    const bctx = bumpCanvas.getContext('2d')!;

    // Dark recessed steel wire-rope base
    cctx.fillStyle = '#252a33';
    cctx.fillRect(0, 0, size, size);
    bctx.fillStyle = '#202020';
    bctx.fillRect(0, 0, size, size);

    // 6 diagonal twisted braided steel strands (seamless tileable diagonals)
    const strands = 6;
    const step = size / strands;
    for (let k = -strands; k <= strands * 2; k++) {
      const x0 = k * step;

      // Primary raised steel strand ridge
      const grad = cctx.createLinearGradient(x0, 0, x0 + step * 0.72, 0);
      grad.addColorStop(0.0, '#1c2028');
      grad.addColorStop(0.28, '#5a6475');
      grad.addColorStop(0.52, '#9ca8ba');
      grad.addColorStop(0.76, '#4c5564');
      grad.addColorStop(1.0, '#181c22');

      cctx.strokeStyle = grad;
      cctx.lineWidth = step * 0.68;
      cctx.beginPath();
      cctx.moveTo(x0, 0);
      cctx.lineTo(x0 + size, size);
      cctx.stroke();

      // Bump ridge
      bctx.strokeStyle = '#e8e8e8';
      bctx.lineWidth = step * 0.48;
      bctx.beginPath();
      bctx.moveTo(x0, 0);
      bctx.lineTo(x0 + size, size);
      bctx.stroke();

      // Fine sub-wire cross-hatch scoring across each strand
      cctx.strokeStyle = 'rgba(220, 230, 244, 0.22)';
      cctx.lineWidth = 2;
      cctx.beginPath();
      cctx.moveTo(x0 + step * 0.14, 0);
      cctx.lineTo(x0 + size + step * 0.14, size);
      cctx.stroke();

      // Deep dark inter-strand valley
      cctx.strokeStyle = 'rgba(10, 13, 18, 0.85)';
      cctx.lineWidth = 4;
      cctx.beginPath();
      cctx.moveTo(x0 + step * 0.5, 0);
      cctx.lineTo(x0 + size + step * 0.5, size);
      cctx.stroke();

      bctx.strokeStyle = '#0a0a0a';
      bctx.lineWidth = 5;
      bctx.beginPath();
      bctx.moveTo(x0 + step * 0.5, 0);
      bctx.lineTo(x0 + size + step * 0.5, size);
      bctx.stroke();
    }

    // Subtle cross-wire weave ribs & weathered desert oil patina
    for (let y = 0; y < size; y += 8) {
      cctx.fillStyle = y % 16 === 0 ? 'rgba(20, 24, 30, 0.24)' : 'rgba(180, 145, 105, 0.08)';
      cctx.fillRect(0, y, size, 2);
      bctx.fillStyle = y % 16 === 0 ? 'rgba(0, 0, 0, 0.28)' : 'rgba(255, 255, 255, 0.12)';
      bctx.fillRect(0, y, size, 2);
    }

    const cableColorTex = new THREE.CanvasTexture(colorCanvas);
    cableColorTex.wrapS = THREE.RepeatWrapping;
    cableColorTex.wrapT = THREE.RepeatWrapping;
    cableColorTex.colorSpace = THREE.SRGBColorSpace;

    const cableBumpTex = new THREE.CanvasTexture(bumpCanvas);
    cableBumpTex.wrapS = THREE.RepeatWrapping;
    cableBumpTex.wrapT = THREE.RepeatWrapping;

    return { cableColorTex, cableBumpTex };
  }

  private createMaterials() {
    const { dustColorTex, dustRoughnessTex } = this.createCabinDustTextures();
    const { cableColorTex, cableBumpTex } = this.createCableTextures();
    this.conduitEnergyMat = new THREE.MeshStandardMaterial({
      color: 0xc87a34,
      emissive: 0x451a03,
      emissiveIntensity: 0.25,
      bumpMap: cableBumpTex,
      bumpScale: 0.012,
      metalness: 0.78,
      roughness: 0.3,
    });
    this.couplerGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.3,
    });
    return {
      steel: new THREE.MeshStandardMaterial({
        color: 0x9aa4b0,
        metalness: 0.88,
        roughness: 0.28,
      }),
      gunmetal: new THREE.MeshStandardMaterial({
        color: 0x2b3038,
        metalness: 0.82,
        roughness: 0.42,
      }),
      yellow: new THREE.MeshStandardMaterial({
        color: 0xe59a18,
        metalness: 0.45,
        roughness: 0.32,
      }),
      blue: new THREE.MeshStandardMaterial({
        color: 0x24529a,
        metalness: 0.65,
        roughness: 0.3,
      }),
      maroon: new THREE.MeshStandardMaterial({
        color: 0x7a302a,
        metalness: 0.5,
        roughness: 0.45,
      }),
      cockpitSilver: new THREE.MeshStandardMaterial({
        color: 0xd4ccbe,
        map: dustColorTex,
        roughnessMap: dustRoughnessTex,
        metalness: 0.62,
        roughness: 0.72,
      }),
      cabinOrange: new THREE.MeshStandardMaterial({
        color: 0xea580c,
        roughnessMap: dustRoughnessTex,
        metalness: 0.36,
        roughness: 0.62,
      }),
      cabinSlate: new THREE.MeshStandardMaterial({
        color: 0x4c5d73,
        roughnessMap: dustRoughnessTex,
        metalness: 0.66,
        roughness: 0.58,
      }),
      cabinDust: new THREE.MeshStandardMaterial({
        color: 0xb8966e,
        roughnessMap: dustRoughnessTex,
        metalness: 0.14,
        roughness: 0.92,
      }),
      hudGlass: new THREE.MeshPhysicalMaterial({
        color: 0x070d18,
        emissive: 0x040c18,
        emissiveIntensity: 0.18,
        metalness: 0.92,
        roughness: 0.05,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04,
      }),
      spinner: new THREE.MeshStandardMaterial({
        color: 0xf09c14,
        metalness: 0.72,
        roughness: 0.22,
        emissive: 0x552200,
      }),
      copper: new THREE.MeshStandardMaterial({
        color: 0xb87333,
        metalness: 0.85,
        roughness: 0.3,
      }),
      cable: new THREE.MeshStandardMaterial({
        color: 0xc2cbd8,
        map: cableColorTex,
        bumpMap: cableBumpTex,
        bumpScale: 0.02,
        metalness: 0.84,
        roughness: 0.34,
      }),
      conduitData: new THREE.MeshStandardMaterial({
        color: 0x202630,
        bumpMap: cableBumpTex,
        bumpScale: 0.014,
        metalness: 0.42,
        roughness: 0.62,
      }),
      conduitEnergy: this.conduitEnergyMat,
      couplerGlow: this.couplerGlowMat,
      seat: new THREE.MeshStandardMaterial({
        color: 0x1e2229,
        metalness: 0.2,
        roughness: 0.8,
      }),
      visor: new THREE.MeshStandardMaterial({
        color: 0x111827,
        metalness: 0.9,
        roughness: 0.1,
      }),
      plasmaRing: new THREE.MeshBasicMaterial({
        color: 0xe040fb,
      }),
      damperJet: new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    };
  }

  private buildSingleEngine(
    xPos: number,
    sideSign: number,
    mats: ReturnType<PodMeshBuilder['createMaterials']>
  ): EngineVisualRefs {
    const nozzleMat = mats.gunmetal.clone();
    const tailSpikeMat = mats.steel.clone();
    const heatMaterials: HeatMaterialEntry[] = [
      {
        mat: nozzleMat,
        baseColor: nozzleMat.color.clone(),
        baseEmissive: nozzleMat.emissive.clone(),
      },
      {
        mat: tailSpikeMat,
        baseColor: tailSpikeMat.color.clone(),
        baseEmissive: tailSpikeMat.emissive.clone(),
      },
    ];
    const root = new THREE.Group();
    root.rotation.order = 'YXZ';
    root.position.set(xPos, 0, 0);

    // 1. Stepped cylindrical barrel (LatheGeometry rotated to align with Z: z=-3.1 to z=-0.1)
    const barrelPts = [
      new THREE.Vector2(0.01, 0.0),
      new THREE.Vector2(0.43, 0.0),
      new THREE.Vector2(0.48, 0.25),
      new THREE.Vector2(0.48, 0.85),
      new THREE.Vector2(0.44, 0.92),
      new THREE.Vector2(0.44, 1.35),
      new THREE.Vector2(0.49, 1.42),
      new THREE.Vector2(0.49, 2.35),
      new THREE.Vector2(0.45, 2.45),
      new THREE.Vector2(0.46, 2.85),
      new THREE.Vector2(0.40, 3.0),
      new THREE.Vector2(0.01, 3.0),
    ];
    const barrelGeo = new THREE.LatheGeometry(barrelPts, 36);
    barrelGeo.rotateX(Math.PI / 2);
    barrelGeo.translate(0, 0, -3.1);
    const barrelMesh = new THREE.Mesh(barrelGeo, mats.steel);
    barrelMesh.castShadow = true;
    root.add(barrelMesh);

    // Cobalt-blue structural collar (z = -2.35 to -1.95)
    const collarGeo = new THREE.CylinderGeometry(0.505, 0.505, 0.42, 32);
    collarGeo.rotateX(Math.PI / 2);
    collarGeo.translate(0, 0, -2.15);
    const collarMesh = new THREE.Mesh(collarGeo, mats.blue);
    collarMesh.castShadow = true;
    root.add(collarMesh);

    // Yellow mid-flank armor panels
    const panelGeos: THREE.BufferGeometry[] = [];
    for (const s of [-1, 1]) {
      const pg = new THREE.BoxGeometry(0.08, 0.34, 0.72);
      pg.translate(s * 0.49, 0.05, -1.65);
      panelGeos.push(pg);
    }
    const intakeLipGeo = new THREE.TorusGeometry(0.47, 0.06, 12, 32);
    intakeLipGeo.translate(0, 0, -3.08);
    panelGeos.push(intakeLipGeo);
    const yellowMerged = mergeGeometries(panelGeos);
    if (yellowMerged) {
      const ym = new THREE.Mesh(yellowMerged, mats.yellow);
      ym.castShadow = true;
      root.add(ym);
    }

    // 2. Procedural Greeble Layer: 24 axial cooling pipes + 32 radial blocks + fuel manifolds
    const gunmetalGeos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      const pipe = new THREE.CylinderGeometry(0.018, 0.018, 2.4, 6);
      pipe.rotateX(Math.PI / 2);
      pipe.translate(Math.cos(ang) * 0.495, Math.sin(ang) * 0.495, -1.65);
      gunmetalGeos.push(pipe);
    }
    for (let i = 0; i < 32; i++) {
      const ang = (i / 32) * Math.PI * 2;
      const zOff = -0.6 - (i % 4) * 0.45;
      const blk = new THREE.BoxGeometry(0.09, 0.09, 0.24);
      blk.rotateZ(ang);
      blk.translate(Math.cos(ang) * 0.49, Math.sin(ang) * 0.49, zOff);
      gunmetalGeos.push(blk);
    }
    const greebleMerged = mergeGeometries(gunmetalGeos);
    if (greebleMerged) {
      const gm = new THREE.Mesh(greebleMerged, mats.gunmetal);
      gm.castShadow = true;
      root.add(gm);
    }

    // 16 angled rear exhaust nozzle petals (isolated material for thermal redness)
    const nozzleGeos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const petal = new THREE.BoxGeometry(0.11, 0.035, 0.36);
      petal.rotateX(0.16);
      petal.rotateZ(ang);
      petal.translate(Math.cos(ang) * 0.37, Math.sin(ang) * 0.37, -0.02);
      nozzleGeos.push(petal);
    }
    const nozzleMerged = mergeGeometries(nozzleGeos);
    if (nozzleMerged) {
      const nm = new THREE.Mesh(nozzleMerged, nozzleMat);
      nm.castShadow = true;
      root.add(nm);
    }

    // Copper/brass fuel manifold rings
    const copperGeos: THREE.BufferGeometry[] = [];
    for (const zRing of [-2.48, -1.35, -0.75]) {
      const ring = new THREE.TorusGeometry(0.495, 0.022, 8, 28);
      ring.translate(0, 0, zRing);
      copperGeos.push(ring);
    }
    const copperMerged = mergeGeometries(copperGeos);
    if (copperMerged) {
      root.add(new THREE.Mesh(copperMerged, mats.copper));
    }

    // Ventral Maroon Belly Tank (isolated group for physics detachment)
    const bellyGroup = new THREE.Group();
    bellyGroup.position.set(0, -0.44, -2.2);
    const bellyGeo = new THREE.SphereGeometry(0.45, 18, 12);
    bellyGeo.scale(0.68, 0.52, 1.85);
    const bellyMesh = new THREE.Mesh(bellyGeo, mats.maroon);
    bellyMesh.castShadow = true;
    bellyGroup.add(bellyMesh);
    root.add(bellyGroup);

    // 3. Intake Spinning Fan (28 angled blades) & Amber Bullet Nose Cone (z = -3.15 to -3.65)
    const intakeGroup = new THREE.Group();
    intakeGroup.position.set(0, 0, -3.11);

    const fanGroup = new THREE.Group();
    fanGroup.position.set(0, 0, 0.01);
    const bladeGeos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 28; i++) {
      const ang = (i / 28) * Math.PI * 2;
      const blade = new THREE.BoxGeometry(0.022, 0.24, 0.07);
      blade.rotateY(0.45);
      blade.rotateZ(ang);
      blade.translate(Math.cos(ang) * 0.31, Math.sin(ang) * 0.31, 0);
      bladeGeos.push(blade);
    }
    const fanMerged = mergeGeometries(bladeGeos);
    if (fanMerged) {
      fanGroup.add(new THREE.Mesh(fanMerged, mats.steel));
    }
    intakeGroup.add(fanGroup);

    const spinnerPts = [
      new THREE.Vector2(0.001, 0.55),
      new THREE.Vector2(0.11, 0.45),
      new THREE.Vector2(0.19, 0.25),
      new THREE.Vector2(0.21, 0.0),
    ];
    const spinnerGeo = new THREE.LatheGeometry(spinnerPts, 24);
    spinnerGeo.rotateX(-Math.PI / 2);
    spinnerGeo.translate(0, 0, -0.01);
    intakeGroup.add(new THREE.Mesh(spinnerGeo, mats.spinner));
    root.add(intakeGroup);

    // 4. Three Forward Yellow Air-Scoop / Airbrake Flaps (z = -3.05 to -4.80)
    const flapConfigs = [
      { angle: Math.PI / 2, width: 0.48, hasGlyph: true }, // 12 o'clock top blade
      { angle: Math.PI / 2 + sideSign * THREE.MathUtils.degToRad(125), width: 0.36, hasGlyph: true }, // outer-lower
      { angle: Math.PI / 2 - sideSign * THREE.MathUtils.degToRad(125), width: 0.34, hasGlyph: false }, // inner-lower
    ];
    const flaps: EngineVisualRefs['flaps'] = [];

    for (const cfg of flapConfigs) {
      const hingeOffset = new THREE.Group();
      hingeOffset.position.set(Math.cos(cfg.angle) * 0.47, Math.sin(cfg.angle) * 0.47, -3.05);

      const pivot = new THREE.Group();
      hingeOffset.add(pivot);

      const bladeShape = new THREE.Shape();
      const hw = cfg.width * 0.5;
      const len = 1.75;
      bladeShape.moveTo(-hw, 0);
      bladeShape.lineTo(-hw, len - hw);
      bladeShape.absarc(0, len - hw, hw, Math.PI, 0, true);
      bladeShape.lineTo(hw, 0);
      bladeShape.closePath();

      const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
        depth: 0.035,
        bevelEnabled: true,
        bevelSize: 0.008,
        bevelThickness: 0.008,
        bevelSegments: 2,
      });
      // Orient blade extending forward (-Z) and flat tangentially around the engine
      bladeGeo.rotateX(-Math.PI / 2);
      bladeGeo.rotateZ(cfg.angle - Math.PI / 2);
      const bladeMesh = new THREE.Mesh(bladeGeo, mats.yellow);
      bladeMesh.castShadow = true;
      pivot.add(bladeMesh);

      if (cfg.hasGlyph) {
        const glyphGeo = new THREE.BoxGeometry(cfg.width * 0.45, 0.052, 0.22);
        glyphGeo.rotateZ(cfg.angle - Math.PI / 2);
        glyphGeo.translate(0, 0, -1.35);
        pivot.add(new THREE.Mesh(glyphGeo, mats.blue));
      }

      root.add(hingeOffset);

      // Pivot axis tangential to circumference so positive rotation flares outward
      const axis = new THREE.Vector3(-Math.sin(cfg.angle), Math.cos(cfg.angle), 0).normalize();
      flaps.push({ hingeOffset, pivot, axis, sign: 1 });
    }

    // 3 small curved silver auxiliary guide vanes around lower cowling rim
    for (let v = 0; v < 3; v++) {
      const vang = -Math.PI / 2 + (v - 1) * 0.55;
      const vaneGeo = new THREE.BoxGeometry(0.14, 0.025, 0.35);
      vaneGeo.rotateZ(vang - Math.PI / 2);
      vaneGeo.translate(Math.cos(vang) * 0.52, Math.sin(vang) * 0.52, -3.12);
      root.add(new THREE.Mesh(vaneGeo, mats.steel));
    }

    // 5. Rear Exhaust Tail Spike & Variable Jet Plume
    const tailSpikeGeo = new THREE.ConeGeometry(0.24, 0.72, 20);
    tailSpikeGeo.rotateX(Math.PI / 2);
    tailSpikeGeo.translate(0, 0, 0.22);
    const tailSpike = new THREE.Mesh(tailSpikeGeo, tailSpikeMat);
    tailSpike.castShadow = true;
    root.add(tailSpike);

    const coreGeo = new THREE.ConeGeometry(0.20, 1.4, 16);
    coreGeo.translate(0, 0.7, 0);
    coreGeo.rotateX(Math.PI / 2);
    const exhaustCore = new THREE.Mesh(
      coreGeo,
      new THREE.MeshBasicMaterial({
        color: 0xcceeff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      })
    );
    exhaustCore.position.set(0, 0, 0.05);
    root.add(exhaustCore);

    const outerGeo = new THREE.ConeGeometry(0.36, 2.0, 16);
    outerGeo.translate(0, 1.0, 0);
    outerGeo.rotateX(Math.PI / 2);
    const exhaustOuter = new THREE.Mesh(
      outerGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff7711,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      })
    );
    exhaustOuter.position.set(0, 0, 0.05);
    root.add(exhaustOuter);

    const puffGeo = new THREE.SphereGeometry(0.45, 12, 10);
    puffGeo.scale(1, 1, 1.8);
    const reversePuff = new THREE.Mesh(
      puffGeo,
      new THREE.MeshBasicMaterial({
        color: 0xf97316,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    reversePuff.position.set(0, 0, -3.55);
    reversePuff.visible = false;
    root.add(reversePuff);

    // 6. Inner Plasma Emitter Dish & Dummy
    const emitterGroup = new THREE.Group();
    emitterGroup.position.set(-sideSign * 0.49, 0, -2.25);
    const dishGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.08, 16);
    dishGeo.rotateZ(Math.PI / 2);
    emitterGroup.add(new THREE.Mesh(dishGeo, mats.gunmetal));
    const glowRingGeo = new THREE.TorusGeometry(0.14, 0.025, 8, 20);
    glowRingGeo.rotateY(Math.PI / 2);
    emitterGroup.add(new THREE.Mesh(glowRingGeo, mats.plasmaRing));
    root.add(emitterGroup);

    const emitterWorldDummy = new THREE.Object3D();
    emitterWorldDummy.position.set(-sideSign * 0.52, 0, -2.25);
    root.add(emitterWorldDummy);

    // 7. Articulated Top-Rear Tether Pylon, Gimbal Yoke & Hydraulic Conduit Manifold
    const pylonGroup = new THREE.Group();
    pylonGroup.position.set(-sideSign * 0.14, 0.47, -1.06);

    // Curved mounting saddle bolted onto the engine barrel
    const saddleGeo = new THREE.BoxGeometry(0.24, 0.08, 0.56);
    const saddleMesh = new THREE.Mesh(saddleGeo, mats.gunmetal);
    saddleMesh.castShadow = true;
    pylonGroup.add(saddleMesh);

    // Twin gusseted steel pylon cheeks rising to the gimbal yoke
    for (const side of [-1, 1] as const) {
      const cheekGeo = new THREE.BoxGeometry(0.042, 0.16, 0.34);
      cheekGeo.translate(side * 0.085, 0.085, -0.02);
      const cheek = new THREE.Mesh(cheekGeo, mats.steel);
      cheek.castShadow = true;
      pylonGroup.add(cheek);
    }

    // Yellow hazard trim tab on outer pylon flank
    const pylonTrimGeo = new THREE.BoxGeometry(0.024, 0.075, 0.26);
    pylonTrimGeo.translate(sideSign * 0.115, 0.06, -0.03);
    pylonGroup.add(new THREE.Mesh(pylonTrimGeo, mats.yellow));

    // Heavy swivel clevis barrel & horizontal copper pivot pin
    const gimbalGeo = new THREE.CylinderGeometry(0.068, 0.074, 0.22, 14);
    gimbalGeo.rotateX(Math.PI / 2);
    gimbalGeo.translate(0, 0.125, 0.06);
    pylonGroup.add(new THREE.Mesh(gimbalGeo, mats.gunmetal));

    const pivotPinGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.26, 12);
    pivotPinGeo.rotateZ(Math.PI / 2);
    pivotPinGeo.translate(0, 0.125, 0.0);
    pylonGroup.add(new THREE.Mesh(pivotPinGeo, mats.copper));

    // Aft-facing ribbed strain-relief boot where the braided cable exits
    const bootGeo = new THREE.CylinderGeometry(0.048, 0.066, 0.18, 12);
    bootGeo.rotateX(Math.PI / 2);
    bootGeo.translate(0, 0.125, 0.19);
    pylonGroup.add(new THREE.Mesh(bootGeo, mats.gunmetal));

    const bootRingGeo = new THREE.TorusGeometry(0.056, 0.012, 8, 16);
    bootRingGeo.translate(0, 0.125, 0.24);
    pylonGroup.add(new THREE.Mesh(bootRingGeo, mats.copper));

    // Secondary hydraulic/telemetry manifold ports under the boot
    for (const ps of [-1, 1] as const) {
      const portGeo = new THREE.CylinderGeometry(0.02, 0.024, 0.14, 8);
      portGeo.rotateX(Math.PI / 2);
      portGeo.translate(ps * 0.042, 0.055, 0.16);
      pylonGroup.add(new THREE.Mesh(portGeo, ps < 0 ? mats.copper : mats.steel));
    }

    root.add(pylonGroup);

    const pylonDummy = new THREE.Object3D();
    pylonDummy.position.set(-sideSign * 0.14, 0.595, -0.82);
    root.add(pylonDummy);

    // 8. Optional Pod Modification Attachments (all hidden for stock unmodified pod)
    const modNitroGroup = new THREE.Group();
    const nitroTankMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      metalness: 0.65,
      roughness: 0.25,
      emissive: 0x7c2d12,
      emissiveIntensity: 0.6,
    });
    const nitroCanisterGeo = new THREE.CapsuleGeometry(0.14, 0.95, 8, 16);
    nitroCanisterGeo.rotateX(Math.PI / 2);
    const nitroCanister = new THREE.Mesh(nitroCanisterGeo, nitroTankMat);
    nitroCanister.position.set(sideSign * 0.34, 0.44, -1.5);
    nitroCanister.castShadow = true;
    modNitroGroup.add(nitroCanister);
    const nitroStrapGeo = new THREE.TorusGeometry(0.15, 0.022, 6, 16);
    for (const zBand of [-1.8, -1.2]) {
      const band = new THREE.Mesh(nitroStrapGeo, mats.gunmetal);
      band.position.set(sideSign * 0.34, 0.44, zBand);
      modNitroGroup.add(band);
    }
    modNitroGroup.visible = false;
    root.add(modNitroGroup);

    const modCoolantGroup = new THREE.Group();
    const coolantTankMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      metalness: 0.55,
      roughness: 0.2,
      emissive: 0x0369a1,
      emissiveIntensity: 0.85,
    });
    const coolantCanisterGeo = new THREE.CapsuleGeometry(0.14, 0.95, 8, 16);
    coolantCanisterGeo.rotateX(Math.PI / 2);
    const coolantCanister = new THREE.Mesh(coolantCanisterGeo, coolantTankMat);
    coolantCanister.position.set(sideSign * 0.34, 0.44, -1.5);
    coolantCanister.castShadow = true;
    modCoolantGroup.add(coolantCanister);
    const cryoPipeGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.7, 8);
    cryoPipeGeo.rotateX(Math.PI / 2);
    const cryoPipe = new THREE.Mesh(cryoPipeGeo, mats.steel);
    cryoPipe.position.set(sideSign * 0.42, 0.32, -0.85);
    modCoolantGroup.add(cryoPipe);
    modCoolantGroup.visible = false;
    root.add(modCoolantGroup);

    const modFlyingGroup = new THREE.Group();
    const aeroFinMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      metalness: 0.45,
      roughness: 0.32,
      emissive: 0x7c2d12,
      emissiveIntensity: 0.45,
    });
    const finGroup = new THREE.Group();
    finGroup.position.set(sideSign * 0.43, 0.03, -1.35);
    finGroup.rotation.z = sideSign * (Math.PI / 4);

    const wingGeo = new THREE.BoxGeometry(0.72, 0.045, 1.35);
    wingGeo.rotateY(sideSign * -0.26);
    const wingMesh = new THREE.Mesh(wingGeo, mats.cabinOrange);
    wingMesh.position.set(sideSign * 0.36, 0, 0);
    wingMesh.castShadow = true;
    finGroup.add(wingMesh);

    const tipGeo = new THREE.BoxGeometry(0.12, 0.055, 1.05);
    tipGeo.rotateY(sideSign * -0.26);
    const tipMesh = new THREE.Mesh(tipGeo, aeroFinMat);
    tipMesh.position.set(sideSign * 0.70, 0, -0.07);
    tipMesh.castShadow = true;
    finGroup.add(tipMesh);

    modFlyingGroup.add(finGroup);
    modFlyingGroup.visible = false;
    root.add(modFlyingGroup);

    return {
      root,
      bellyGroup,
      intakeGroup,
      fanGroup,
      flaps,
      exhaustCore,
      exhaustOuter,
      reversePuff,
      emitterWorldDummy,
      pylonDummy,
      heatMaterials,
      modNitroGroup,
      modCoolantGroup,
      modFlyingGroup,
    };
  }

  private buildCockpit(mats: ReturnType<PodMeshBuilder['createMaterials']>): void {
    // Proposal 2B (High-Poly): Wingless Unpowered Fighter-Jet Interceptor Canopy
    // (smooth beveled stealth fuselage, opaque mirror-tinted canopy, no interior pilot, zero wings/thruster)

    // 1. Main high-poly beveled stealth-fighter fuselage
    const hullShape = new THREE.Shape();
    hullShape.moveTo(0, -1.54);
    hullShape.lineTo(0.24, -1.02);
    hullShape.lineTo(0.46, -0.34);
    hullShape.lineTo(0.48, 0.42);
    hullShape.lineTo(0.32, 1.04);
    hullShape.lineTo(0.22, 1.28);
    hullShape.lineTo(-0.22, 1.28);
    hullShape.lineTo(-0.32, 1.04);
    hullShape.lineTo(-0.48, 0.42);
    hullShape.lineTo(-0.46, -0.34);
    hullShape.lineTo(-0.24, -1.02);
    hullShape.closePath();

    const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
      depth: 0.22,
      curveSegments: 24,
      steps: 2,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 6,
    });
    hullGeo.rotateX(Math.PI / 2);
    hullGeo.translate(0, 0.16, 0);
    const hullMesh = new THREE.Mesh(hullGeo, mats.cockpitSilver);
    hullMesh.castShadow = true;
    this.cockpitGroup.add(hullMesh);

    // 2. Dark gunmetal lower belly chine (high bevel smoothness)
    const bellyShape = new THREE.Shape();
    bellyShape.moveTo(0, -1.40);
    bellyShape.lineTo(0.20, -0.92);
    bellyShape.lineTo(0.37, -0.28);
    bellyShape.lineTo(0.38, 0.40);
    bellyShape.lineTo(0.24, 1.02);
    bellyShape.lineTo(0.16, 1.20);
    bellyShape.lineTo(-0.16, 1.20);
    bellyShape.lineTo(-0.24, 1.02);
    bellyShape.lineTo(-0.38, 0.40);
    bellyShape.lineTo(-0.37, -0.28);
    bellyShape.lineTo(-0.20, -0.92);
    bellyShape.closePath();

    const bellyGeo = new THREE.ExtrudeGeometry(bellyShape, {
      depth: 0.12,
      curveSegments: 20,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.04,
      bevelSegments: 5,
    });
    bellyGeo.rotateX(Math.PI / 2);
    bellyGeo.translate(0, -0.09, 0);
    const bellyMesh = new THREE.Mesh(bellyGeo, mats.gunmetal);
    bellyMesh.castShadow = true;
    this.cockpitGroup.add(bellyMesh);

    // 3. Sculpted upper nose deck + twin cobalt-blue racing stripes & amber trim accents
    const noseCapShape = new THREE.Shape();
    noseCapShape.moveTo(0, -1.46);
    noseCapShape.lineTo(0.21, -0.95);
    noseCapShape.lineTo(0.34, -0.44);
    noseCapShape.lineTo(-0.34, -0.44);
    noseCapShape.lineTo(-0.21, -0.95);
    noseCapShape.closePath();

    const noseCapGeo = new THREE.ExtrudeGeometry(noseCapShape, {
      depth: 0.045,
      curveSegments: 16,
      bevelEnabled: true,
      bevelThickness: 0.024,
      bevelSize: 0.024,
      bevelSegments: 5,
    });
    noseCapGeo.rotateX(Math.PI / 2);
    noseCapGeo.translate(0, 0.248, 0);
    const noseCapMesh = new THREE.Mesh(noseCapGeo, mats.cabinSlate);
    noseCapMesh.castShadow = true;
    this.cockpitGroup.add(noseCapMesh);

    // Bold racing-orange nose chevron plate
    const noseOrangeGeo = new THREE.BoxGeometry(0.18, 0.032, 0.44);
    noseOrangeGeo.translate(0, 0.272, -1.04);
    this.cockpitGroup.add(new THREE.Mesh(noseOrangeGeo, mats.cabinOrange));

    for (const s of [-1, 1] as const) {
      // Twin cobalt-blue nose-to-canopy racing stripes
      const frontStripeGeo = new THREE.BoxGeometry(0.085, 0.022, 0.62, 2, 1, 8);
      frontStripeGeo.rotateY(s * -0.14);
      frontStripeGeo.translate(s * 0.14, 0.268, -0.78);
      this.cockpitGroup.add(new THREE.Mesh(frontStripeGeo, mats.blue));

      // Crisp racing-orange & amber forward trim slashes near canopy sill
      const orangeTrimGeo = new THREE.BoxGeometry(0.08, 0.03, 0.32, 2, 1, 4);
      orangeTrimGeo.rotateY(s * -0.18);
      orangeTrimGeo.translate(s * 0.28, 0.258, -0.46);
      this.cockpitGroup.add(new THREE.Mesh(orangeTrimGeo, mats.cabinOrange));

      // Weathered desert-dust lower flank skirt strips (where canyon dust builds up)
      const dustSkirtGeo = new THREE.BoxGeometry(0.06, 0.075, 1.38);
      dustSkirtGeo.rotateY(s * -0.04);
      dustSkirtGeo.translate(s * 0.46, -0.055, 0.12);
      this.cockpitGroup.add(new THREE.Mesh(dustSkirtGeo, mats.cabinDust));
    }

    // 4. High-poly beveled side intake cheeks & nose tether shackles (no wings/fins; grouped for breakup debris)
    const cheekProfile = new THREE.Shape();
    cheekProfile.moveTo(-0.08, -0.10);
    cheekProfile.lineTo(0.08, -0.10);
    cheekProfile.lineTo(0.10, 0.06);
    cheekProfile.lineTo(0.04, 0.11);
    cheekProfile.lineTo(-0.08, 0.10);
    cheekProfile.closePath();

    for (const s of [-1, 1] as const) {
      const cheekGroup = new THREE.Group();
      cheekGroup.position.set(s * 0.44, 0.06, 0.02);

      // Smoothly beveled weathered blue-slate side intake shroud
      const podGeo = new THREE.ExtrudeGeometry(cheekProfile, {
        depth: 0.84,
        curveSegments: 16,
        steps: 2,
        bevelEnabled: true,
        bevelThickness: 0.035,
        bevelSize: 0.028,
        bevelSegments: 5,
      });
      podGeo.translate(0, 0, -0.42);
      if (s < 0) podGeo.scale(-1, 1, 1);
      podGeo.rotateZ(s * -0.18);
      podGeo.rotateY(s * -0.05);
      const podMesh = new THREE.Mesh(podGeo, mats.cabinSlate);
      podMesh.castShadow = true;
      cheekGroup.add(podMesh);

      // Recessed dark intake throat + 3 horizontal louver vanes
      const scoopGeo = new THREE.BoxGeometry(0.12, 0.14, 0.06);
      scoopGeo.rotateZ(s * -0.18);
      scoopGeo.translate(s * 0.02, 0.0, -0.44);
      cheekGroup.add(new THREE.Mesh(scoopGeo, mats.gunmetal));

      for (let v = -1; v <= 1; v++) {
        const louverGeo = new THREE.BoxGeometry(0.11, 0.014, 0.05);
        louverGeo.rotateZ(s * -0.18);
        louverGeo.translate(s * 0.02, v * 0.036, -0.455);
        cheekGroup.add(new THREE.Mesh(louverGeo, mats.copper));
      }

      // Bold racing-orange upper intake armor plate
      const sideOrangeGeo = new THREE.BoxGeometry(0.042, 0.085, 0.52);
      sideOrangeGeo.rotateZ(s * -0.18);
      sideOrangeGeo.translate(s * 0.108, 0.042, -0.06);
      cheekGroup.add(new THREE.Mesh(sideOrangeGeo, mats.cabinOrange));

      // Cobalt-blue rear flank stripe + dusty sand-scuffed lower lip
      const sideBlueGeo = new THREE.BoxGeometry(0.036, 0.065, 0.34);
      sideBlueGeo.rotateZ(s * -0.18);
      sideBlueGeo.translate(s * 0.106, -0.032, 0.22);
      cheekGroup.add(new THREE.Mesh(sideBlueGeo, mats.blue));

      const sideDustGeo = new THREE.BoxGeometry(0.05, 0.045, 0.78);
      sideDustGeo.rotateZ(s * -0.18);
      sideDustGeo.translate(s * 0.095, -0.095, 0.02);
      cheekGroup.add(new THREE.Mesh(sideDustGeo, mats.cabinDust));

      this.cockpitGroup.add(cheekGroup);
      if (s < 0) this.cockpitLeftWingGroup = cheekGroup;
      else this.cockpitRightWingGroup = cheekGroup;

      // Reinforced beveled gunmetal & steel tether clevis yoke integrated into forward nose chine
      const armGroup = new THREE.Group();
      armGroup.position.set(s * 0.34, 0.06, -0.82);
      armGroup.rotation.y = s * -0.22;

      const mountFlangeGeo = new THREE.BoxGeometry(0.14, 0.12, 0.24);
      const mountFlange = new THREE.Mesh(mountFlangeGeo, mats.gunmetal);
      mountFlange.castShadow = true;
      armGroup.add(mountFlange);

      for (const jaw of [-1, 1] as const) {
        const jawGeo = new THREE.BoxGeometry(0.032, 0.11, 0.18);
        jawGeo.translate(jaw * 0.052, 0.0, -0.14);
        const jawMesh = new THREE.Mesh(jawGeo, mats.steel);
        jawMesh.castShadow = true;
        armGroup.add(jawMesh);
      }

      const clevisPinGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.17, 12);
      clevisPinGeo.rotateZ(Math.PI / 2);
      clevisPinGeo.translate(0, 0, -0.15);
      armGroup.add(new THREE.Mesh(clevisPinGeo, mats.copper));

      const fairleadGeo = new THREE.CylinderGeometry(0.044, 0.06, 0.15, 12);
      fairleadGeo.rotateX(Math.PI / 2);
      fairleadGeo.translate(0, 0, -0.22);
      const fairlead = new THREE.Mesh(fairleadGeo, mats.gunmetal);
      fairlead.castShadow = true;
      armGroup.add(fairlead);

      const collarRingGeo = new THREE.TorusGeometry(0.052, 0.011, 8, 16);
      collarRingGeo.translate(0, 0, -0.26);
      armGroup.add(new THREE.Mesh(collarRingGeo, mats.copper));

      // Auxiliary conduit quick-disconnect sockets under the main fairlead
      for (const ps of [-1, 1] as const) {
        const sockGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.12, 8);
        sockGeo.rotateX(Math.PI / 2);
        sockGeo.translate(ps * 0.035, -0.058, -0.18);
        armGroup.add(new THREE.Mesh(sockGeo, ps < 0 ? mats.copper : mats.steel));
      }

      this.cockpitGroup.add(armGroup);
      if (s < 0) this.cockpitLeftArmGroup = armGroup;
      else this.cockpitRightArmGroup = armGroup;
    }

    // 5. High-poly opaque mirror-tinted fighter canopy + smooth framing ribs (no interior pilot)
    const canopyGeo = new THREE.SphereGeometry(0.34, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.52);
    canopyGeo.scale(0.86, 1.16, 1.86);
    canopyGeo.translate(0, 0.24, -0.02);
    const canopyMesh = new THREE.Mesh(canopyGeo, mats.hudGlass);
    canopyMesh.castShadow = true;
    this.cockpitGroup.add(canopyMesh);

    // Smooth high-segment gunmetal canopy sill collar & twin structural canopy bows
    const sillGeo = new THREE.TorusGeometry(0.34, 0.034, 16, 48);
    sillGeo.rotateX(Math.PI / 2);
    sillGeo.scale(0.88, 1.0, 1.88);
    sillGeo.translate(0, 0.245, -0.02);
    this.cockpitGroup.add(new THREE.Mesh(sillGeo, mats.gunmetal));

    const frontBowGeo = new THREE.TorusGeometry(0.346, 0.022, 14, 36, Math.PI);
    frontBowGeo.scale(0.87, 1.15, 1.0);
    frontBowGeo.rotateX(-0.26);
    frontBowGeo.translate(0, 0.24, -0.22);
    this.cockpitGroup.add(new THREE.Mesh(frontBowGeo, mats.gunmetal));

    const rearBowGeo = new THREE.TorusGeometry(0.344, 0.024, 14, 36, Math.PI);
    rearBowGeo.scale(0.86, 1.10, 1.0);
    rearBowGeo.rotateX(0.20);
    rearBowGeo.translate(0, 0.24, 0.22);
    this.cockpitGroup.add(new THREE.Mesh(rearBowGeo, mats.gunmetal));

    // 6. High-poly beveled dorsal spine fairing with orange crest, copper rail & blue stripes
    const spineProfile = new THREE.Shape();
    spineProfile.moveTo(0.42, 0.20);
    spineProfile.lineTo(0.46, 0.52);
    spineProfile.lineTo(0.68, 0.46);
    spineProfile.lineTo(1.24, 0.22);
    spineProfile.lineTo(1.24, 0.14);
    spineProfile.lineTo(0.42, 0.14);
    spineProfile.closePath();

    const spineGeo = new THREE.ExtrudeGeometry(spineProfile, {
      depth: 0.34,
      curveSegments: 20,
      steps: 2,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.04,
      bevelSegments: 6,
    });
    spineGeo.rotateY(-Math.PI / 2);
    spineGeo.translate(0.17, 0, 0);
    const spineMesh = new THREE.Mesh(spineGeo, mats.cabinSlate);
    spineMesh.castShadow = true;
    this.cockpitGroup.add(spineMesh);

    // Bold racing-orange dorsal hood & copper center ridge rail along rear deck
    const dorsalOrangeGeo = new THREE.BoxGeometry(0.22, 0.036, 0.48);
    dorsalOrangeGeo.rotateX(0.38);
    dorsalOrangeGeo.translate(0, 0.44, 0.78);
    this.cockpitGroup.add(new THREE.Mesh(dorsalOrangeGeo, mats.cabinOrange));

    const centerRidgeGeo = new THREE.BoxGeometry(0.055, 0.038, 0.66);
    centerRidgeGeo.rotateX(0.38);
    centerRidgeGeo.translate(0, 0.43, 0.88);
    this.cockpitGroup.add(new THREE.Mesh(centerRidgeGeo, mats.copper));

    for (const s of [-1, 1] as const) {
      const rearStripeGeo = new THREE.BoxGeometry(0.08, 0.028, 0.58);
      rearStripeGeo.rotateX(0.38);
      rearStripeGeo.translate(s * 0.13, 0.385, 0.90);
      this.cockpitGroup.add(new THREE.Mesh(rearStripeGeo, mats.blue));
    }

    // 7. Twin canted V-tail upper stabilizer fins & compact lower ventral fins (varied orange/blue/dust trim)
    const upperFinShape = new THREE.Shape();
    upperFinShape.moveTo(0.0, 0.0);    // front root
    upperFinShape.lineTo(0.68, 0.0);   // rear root
    upperFinShape.lineTo(0.92, 0.72);  // swept trailing tip
    upperFinShape.lineTo(0.62, 0.72);  // swept leading tip
    upperFinShape.closePath();

    const lowerFinShape = new THREE.Shape();
    lowerFinShape.moveTo(0.0, 0.0);
    lowerFinShape.lineTo(0.46, 0.0);
    lowerFinShape.lineTo(0.62, -0.34);
    lowerFinShape.lineTo(0.38, -0.34);
    lowerFinShape.closePath();

    for (const s of [-1, 1] as const) {
      // Canted upper V-tail fin
      const upperFinGroup = new THREE.Group();
      upperFinGroup.position.set(s * 0.25, 0.18, 0.56);
      upperFinGroup.rotation.z = s * -0.38; // cant outward ~22 deg
      upperFinGroup.rotation.y = s * -0.04;

      const uFinGeo = new THREE.ExtrudeGeometry(upperFinShape, {
        depth: 0.036,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.012,
        bevelSegments: 4,
      });
      // Rotate so shape X -> +Z (rear), shape Y -> +Y (up), centered on thickness
      uFinGeo.rotateY(-Math.PI / 2);
      uFinGeo.translate(0.018, 0, 0);
      const uFinMesh = new THREE.Mesh(uFinGeo, mats.cockpitSilver);
      uFinMesh.castShadow = true;
      upperFinGroup.add(uFinMesh);

      // Bold racing-orange fin tip accent & cobalt-blue leading-edge stripe
      const uTipOrangeGeo = new THREE.BoxGeometry(0.068, 0.16, 0.30);
      uTipOrangeGeo.translate(0, 0.62, 0.74);
      upperFinGroup.add(new THREE.Mesh(uTipOrangeGeo, mats.cabinOrange));

      const uStripeGeo = new THREE.BoxGeometry(0.066, 0.52, 0.13);
      uStripeGeo.rotateX(0.62);
      uStripeGeo.translate(0, 0.30, 0.39);
      upperFinGroup.add(new THREE.Mesh(uStripeGeo, mats.blue));

      // Dusty sand-weathered fin root collar
      const uRootDustGeo = new THREE.BoxGeometry(0.072, 0.11, 0.56);
      uRootDustGeo.translate(0, 0.05, 0.34);
      upperFinGroup.add(new THREE.Mesh(uRootDustGeo, mats.cabinDust));
      this.cockpitGroup.add(upperFinGroup);

      // Compact lower ventral stabilizer fin
      const lowerFinGroup = new THREE.Group();
      lowerFinGroup.position.set(s * 0.26, -0.08, 0.68);
      lowerFinGroup.rotation.z = s * 0.42;

      const lFinGeo = new THREE.ExtrudeGeometry(lowerFinShape, {
        depth: 0.028,
        bevelEnabled: true,
        bevelThickness: 0.009,
        bevelSize: 0.009,
        bevelSegments: 3,
      });
      lFinGeo.rotateY(-Math.PI / 2);
      lFinGeo.translate(0.014, 0, 0);
      const lFinMesh = new THREE.Mesh(lFinGeo, mats.cabinSlate);
      lFinMesh.castShadow = true;
      lowerFinGroup.add(lFinMesh);

      const lStripeGeo = new THREE.BoxGeometry(0.052, 0.24, 0.11);
      lStripeGeo.rotateX(-0.46);
      lStripeGeo.translate(0, -0.17, 0.34);
      lowerFinGroup.add(new THREE.Mesh(lStripeGeo, mats.cabinOrange));
      this.cockpitGroup.add(lowerFinGroup);
    }

    // 8. Clean closed stealth stern bezel with weathered dust & orange corner plates (ZERO thruster/lights)
    const sternShape = new THREE.Shape();
    sternShape.moveTo(-0.22, -0.09);
    sternShape.lineTo(0.22, -0.09);
    sternShape.lineTo(0.19, 0.09);
    sternShape.lineTo(-0.19, 0.09);
    sternShape.closePath();
    const sternBezelGeo = new THREE.ExtrudeGeometry(sternShape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.018,
      bevelSegments: 4,
    });
    sternBezelGeo.translate(0, 0.06, 1.27);
    this.cockpitGroup.add(new THREE.Mesh(sternBezelGeo, mats.gunmetal));

    const sternDustPlateGeo = new THREE.BoxGeometry(0.36, 0.05, 0.03);
    sternDustPlateGeo.translate(0, -0.015, 1.325);
    this.cockpitGroup.add(new THREE.Mesh(sternDustPlateGeo, mats.cabinDust));

    for (const s of [-1, 1] as const) {
      const sternOrangeTabGeo = new THREE.BoxGeometry(0.09, 0.075, 0.032);
      sternOrangeTabGeo.translate(s * 0.14, 0.09, 1.325);
      this.cockpitGroup.add(new THREE.Mesh(sternOrangeTabGeo, mats.cabinOrange));
    }

    // 8. Compact centered under-belly cyan repulsor hover pad (smooth rounded-octagonal emitter)
    const repulsorHousingGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.055, 24);
    repulsorHousingGeo.scale(0.85, 1.0, 1.15);
    repulsorHousingGeo.translate(0, -0.23, 0.08);
    this.cockpitGroup.add(new THREE.Mesh(repulsorHousingGeo, mats.gunmetal));

    this.cockpitRepulsorMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.35,
      roughness: 0.15,
    });
    const repulsorPadGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.025, 24);
    repulsorPadGeo.scale(0.85, 1.0, 1.15);
    repulsorPadGeo.translate(0, -0.262, 0.08);
    this.cockpitGroup.add(new THREE.Mesh(repulsorPadGeo, this.cockpitRepulsorMat));

    // Keep empty pilot group attached for telemetry compatibility
    this.cockpitGroup.add(this.cockpitPilotGroup);

    // 9. Tether attachment dummies aligned to integrated nose fairlead tips
    this.cockpitLeftArmDummy.position.set(-0.40, 0.06, -1.08);
    this.cockpitRightArmDummy.position.set(0.40, 0.06, -1.08);
    this.cockpitGroup.add(this.cockpitLeftArmDummy, this.cockpitRightArmDummy);
  }

  private createCableBuffer(
    material: THREE.Material,
    rings: number,
    sides: number,
    uvRepeatU: number,
    uvRepeatV: number
  ): CableBuffer {
    const cols = sides + 1;
    const vertCount = (rings + 1) * cols;
    const positions = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);
    const indices: number[] = [];

    let uvPtr = 0;
    for (let r = 0; r <= rings; r++) {
      const v = (r / rings) * uvRepeatV;
      for (let s = 0; s <= sides; s++) {
        uvs[uvPtr++] = (s / sides) * uvRepeatU;
        uvs[uvPtr++] = v;
      }
    }

    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < sides; s++) {
        const a = r * cols + s;
        const b = r * cols + (s + 1);
        const c = (r + 1) * cols + s;
        const d = (r + 1) * cols + (s + 1);
        indices.push(a, b, c, b, d, c);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    return { mesh, geometry, positions, rings, sides };
  }

  private createCableHardwareMount(
    kind: 'engine_turnbuckle' | 'mid_damper' | 'cockpit_ferrule' | 'spacer_clamp',
    mats: ReturnType<PodMeshBuilder['createMaterials']>
  ): THREE.Group {
    const g = new THREE.Group();

    if (kind === 'engine_turnbuckle') {
      // Heavy stepped hydraulic tensioner sleeve near engine pylon
      const bodyGeo = new THREE.CylinderGeometry(0.068, 0.072, 0.30, 12);
      bodyGeo.rotateX(Math.PI / 2);
      g.add(new THREE.Mesh(bodyGeo, mats.gunmetal));

      for (const zOff of [-0.14, 0.14]) {
        const nutGeo = new THREE.CylinderGeometry(0.082, 0.082, 0.055, 6);
        nutGeo.rotateX(Math.PI / 2);
        nutGeo.translate(0, 0, zOff);
        g.add(new THREE.Mesh(nutGeo, mats.copper));
      }

      const bandGeo = new THREE.CylinderGeometry(0.074, 0.074, 0.06, 12);
      bandGeo.rotateX(Math.PI / 2);
      g.add(new THREE.Mesh(bandGeo, mats.yellow));

      // Lower dual-conduit bundling cradle
      const cradleGeo = new THREE.BoxGeometry(0.11, 0.06, 0.12);
      cradleGeo.translate(0, -0.058, 0);
      g.add(new THREE.Mesh(cradleGeo, mats.steel));
    } else if (kind === 'mid_damper') {
      // Mid-span inline load-damper / telemetry junction coupler
      const coreGeo = new THREE.CylinderGeometry(0.076, 0.076, 0.36, 12);
      coreGeo.rotateX(Math.PI / 2);
      g.add(new THREE.Mesh(coreGeo, mats.gunmetal));

      for (const zOff of [-0.17, 0.17]) {
        const capGeo = new THREE.CylinderGeometry(0.064, 0.08, 0.07, 12);
        capGeo.rotateX(Math.PI / 2);
        capGeo.translate(0, 0, zOff);
        g.add(new THREE.Mesh(capGeo, mats.steel));
      }

      for (const zOff of [-0.085, 0.085]) {
        const ringGeo = new THREE.TorusGeometry(0.078, 0.013, 8, 16);
        ringGeo.translate(0, 0, zOff);
        g.add(new THREE.Mesh(ringGeo, mats.copper));
      }

      // Subtle glowing load-telemetry band around center of coupler
      const glowRingGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.036, 14);
      glowRingGeo.rotateX(Math.PI / 2);
      g.add(new THREE.Mesh(glowRingGeo, mats.couplerGlow));

      // Twin side cooling ribs & lower conduit bridge
      const bridgeGeo = new THREE.BoxGeometry(0.12, 0.065, 0.24);
      bridgeGeo.translate(0, -0.062, 0);
      g.add(new THREE.Mesh(bridgeGeo, mats.gunmetal));
    } else if (kind === 'cockpit_ferrule') {
      // Cockpit-side swage ferrule & locking nut
      const bodyGeo = new THREE.CylinderGeometry(0.066, 0.058, 0.24, 12);
      bodyGeo.rotateX(Math.PI / 2);
      g.add(new THREE.Mesh(bodyGeo, mats.steel));

      const nutGeo = new THREE.CylinderGeometry(0.076, 0.076, 0.055, 6);
      nutGeo.rotateX(Math.PI / 2);
      nutGeo.translate(0, 0, -0.09);
      g.add(new THREE.Mesh(nutGeo, mats.copper));

      const cradleGeo = new THREE.BoxGeometry(0.105, 0.055, 0.11);
      cradleGeo.translate(0, -0.055, 0);
      g.add(new THREE.Mesh(cradleGeo, mats.gunmetal));
    } else {
      // Intermediate bundling P-clamp / spacer collar
      const ringGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.09, 10);
      ringGeo.rotateX(Math.PI / 2);
      g.add(new THREE.Mesh(ringGeo, mats.gunmetal));

      const accentGeo = new THREE.TorusGeometry(0.063, 0.01, 6, 12);
      g.add(new THREE.Mesh(accentGeo, mats.copper));

      // Bottom conduit bundler clip holding both companion lines snug to main cable
      const clipGeo = new THREE.BoxGeometry(0.098, 0.058, 0.072);
      clipGeo.translate(0, -0.054, 0);
      g.add(new THREE.Mesh(clipGeo, mats.steel));
    }

    return g;
  }

  private createDetailedCableAssembly(
    sideSign: -1 | 1,
    mats: ReturnType<PodMeshBuilder['createMaterials']>
  ): DetailedCableAssembly {
    const group = new THREE.Group();

    const mainCable = this.createCableBuffer(
      mats.cable,
      MAIN_CABLE_RINGS,
      MAIN_CABLE_SIDES,
      2,
      26
    );
    const energyConduit = this.createCableBuffer(
      mats.conduitEnergy,
      AUX_CABLE_RINGS,
      AUX_CABLE_SIDES,
      1,
      22
    );
    const dataConduit = this.createCableBuffer(
      mats.conduitData,
      AUX_CABLE_RINGS,
      AUX_CABLE_SIDES,
      1,
      22
    );
    group.add(mainCable.mesh, energyConduit.mesh, dataConduit.mesh);

    const mounts: CableHardwareMount[] = [];
    for (let i = 0; i < CABLE_MOUNT_US.length; i++) {
      const u = CABLE_MOUNT_US[i];
      const kind =
        i === 0
          ? 'engine_turnbuckle'
          : i === CABLE_MOUNT_US.length - 1
            ? 'cockpit_ferrule'
            : i === 3
              ? 'mid_damper'
              : 'spacer_clamp';
      const node = this.createCableHardwareMount(kind, mats);
      group.add(node);
      mounts.push({ node, u });
    }

    return {
      group,
      mainCable,
      energyConduit,
      dataConduit,
      mounts,
      sideSign,
    };
  }

  private computeBetweenClampFactor(u: number): number {
    let minDist = Math.min(u, 1 - u);
    for (let i = 0; i < CABLE_MOUNT_US.length; i++) {
      const d = Math.abs(u - CABLE_MOUNT_US[i]);
      if (d < minDist) minDist = d;
    }
    const norm = THREE.MathUtils.clamp(minDist / 0.075, 0, 1);
    return Math.sin(norm * Math.PI * 0.5);
  }

  private updateDetailedCable(
    assembly: DetailedCableAssembly,
    start: THREE.Vector3,
    end: THREE.Vector3,
    engineLocalQuat: THREE.Quaternion,
    cockpitLocalQuat: THREE.Quaternion,
    t: PodTelemetry,
    sidePower: number,
    elapsedTime: number
  ): void {
    // Per-side tension: engine forward thrust + speed + boost + opposite-side lateral pull
    const fwdThrust = Math.max(0, sidePower);
    const reverseSlack = sidePower < -0.05 ? 0.38 : 0;
    const stretchBias = THREE.MathUtils.clamp(
      -assembly.sideSign * t.cockpitLatOffset * 0.28,
      -0.22,
      0.35
    );
    const speedTaut = THREE.MathUtils.clamp(t.speedMs / 72, 0, 1);
    const tension = THREE.MathUtils.clamp(
      0.1 +
        speedTaut * 0.42 +
        fwdThrust * 0.46 +
        t.landingBoost * 0.35 +
        (t.nitroActive ? 0.3 : 0) +
        stretchBias -
        reverseSlack -
        (!t.isGrounded && fwdThrust < 0.05 ? 0.22 : 0),
      0.04,
      1.0
    );

    const chord = this.tmpChord.copy(end).sub(start);
    const dist = Math.max(0.5, chord.length());
    chord.divideScalar(dist);

    // Smoothly align exit & entry tangents with the live rotated engine pylon (+Z) and cockpit shackle (-Z)
    this.tmpExitDir
      .set(0, -0.04, 1)
      .applyQuaternion(engineLocalQuat)
      .lerp(chord, 0.58)
      .normalize();
    this.tmpEntryDir
      .set(0, -0.02, -1)
      .applyQuaternion(cockpitLocalQuat)
      .lerp(this.tmpMid.copy(chord).negate(), 0.64)
      .normalize();

    const sag = THREE.MathUtils.lerp(0.56, 0.045, tension);
    const whipLat =
      -t.cockpitLatVel * 0.042 * (1.15 - tension * 0.55) +
      Math.sin(elapsedTime * (7.5 + speedTaut * 18.0) + assembly.sideSign * 1.4) *
        (0.018 + (1 - tension) * 0.032 + speedTaut * 0.015);
    const whipVert =
      -t.cockpitVertVel * 0.038 * (1.15 - tension * 0.5) +
      Math.cos(elapsedTime * (9.2 + speedTaut * 16.0) + assembly.sideSign * 0.9) *
        (0.014 + (1 - tension) * 0.024);

    const handleLen = dist * 0.34;
    this.tmpP1
      .copy(start)
      .addScaledVector(this.tmpExitDir, handleLen);
    this.tmpP1.x += whipLat * 0.85;
    this.tmpP1.y -= sag * 1.05 - whipVert * 0.8;

    this.tmpP2
      .copy(end)
      .addScaledVector(this.tmpEntryDir, handleLen);
    this.tmpP2.x += whipLat * 1.15;
    this.tmpP2.y -= sag * 1.18 - whipVert * 1.15;

    this.tmpCurve.v0.copy(start);
    this.tmpCurve.v1.copy(this.tmpP1);
    this.tmpCurve.v2.copy(this.tmpP2);
    this.tmpCurve.v3.copy(end);

    this.updateCableBundleFromCurve(assembly, 1 - tension, elapsedTime);
  }

  private updateCableBundleFromCurve(
    assembly: DetailedCableAssembly,
    slackness: number,
    elapsedTime: number
  ): void {
    // 1. Primary thick braided steel control cable
    const main = assembly.mainCable;
    const mainPos = main.positions;
    let ptr = 0;
    for (let r = 0; r <= main.rings; r++) {
      const u = r / main.rings;
      const pt = this.tmpCurve.getPoint(u, this.tmpMid);
      const tan = this.tmpCurve.getTangent(u, this.tmpTan);
      if (tan.lengthSq() < 1e-6) tan.set(0, 0, 1);
      else tan.normalize();

      this.tmpNorm.crossVectors(this.tmpUp, tan);
      if (this.tmpNorm.lengthSq() < 1e-5) this.tmpNorm.set(1, 0, 0);
      else this.tmpNorm.normalize();
      this.tmpBinorm.crossVectors(tan, this.tmpNorm).normalize();

      // Subtle ferrule flare at both sockets
      const endFlare = u < 0.05 || u > 0.95 ? 1.14 : 1.0;
      const rad = MAIN_CABLE_RADIUS * endFlare;

      for (let s = 0; s <= main.sides; s++) {
        const ang = (s / main.sides) * Math.PI * 2;
        const ca = Math.cos(ang) * rad;
        const sa = Math.sin(ang) * rad;
        mainPos[ptr++] = pt.x + this.tmpNorm.x * ca + this.tmpBinorm.x * sa;
        mainPos[ptr++] = pt.y + this.tmpNorm.y * ca + this.tmpBinorm.y * sa;
        mainPos[ptr++] = pt.z + this.tmpNorm.z * ca + this.tmpBinorm.z * sa;
      }
    }
    main.geometry.attributes.position.needsUpdate = true;
    main.geometry.computeVertexNormals();

    // 2. Twin companion conduits (copper hydraulic-power line & dark ribbed data umbilical)
    // Clamped tight at every P-clamp/coupler and bowing organically in the spans between clamps
    const auxSpecs: Array<{
      buf: CableBuffer;
      radius: number;
      latDir: number;
      droopBase: number;
      phase: number;
    }> = [
      {
        buf: assembly.energyConduit,
        radius: ENERGY_CONDUIT_RADIUS,
        latDir: -assembly.sideSign,
        droopBase: 0.054,
        phase: 0.0,
      },
      {
        buf: assembly.dataConduit,
        radius: DATA_CONDUIT_RADIUS,
        latDir: assembly.sideSign,
        droopBase: 0.05,
        phase: 2.3,
      },
    ];

    for (let c = 0; c < auxSpecs.length; c++) {
      const spec = auxSpecs[c];
      const buf = spec.buf;
      const pos = buf.positions;
      let aPtr = 0;
      for (let r = 0; r <= buf.rings; r++) {
        const u = r / buf.rings;
        const pt = this.tmpCurve.getPoint(u, this.tmpMid);
        const tan = this.tmpCurve.getTangent(u, this.tmpTan);
        if (tan.lengthSq() < 1e-6) tan.set(0, 0, 1);
        else tan.normalize();

        this.tmpNorm.crossVectors(this.tmpUp, tan);
        if (this.tmpNorm.lengthSq() < 1e-5) this.tmpNorm.set(1, 0, 0);
        else this.tmpNorm.normalize();
        this.tmpBinorm.crossVectors(tan, this.tmpNorm).normalize();

        const between = this.computeBetweenClampFactor(u);
        const flutter =
          Math.sin(elapsedTime * 11.5 + u * 18.0 + spec.phase) *
          (0.004 + slackness * 0.008) *
          between;
        const latOff = spec.latDir * (0.024 + between * (0.016 + slackness * 0.014)) + flutter;
        const downOff =
          -(spec.droopBase + between * (0.026 + slackness * 0.048));

        this.tmpAuxPt
          .copy(pt)
          .addScaledVector(this.tmpNorm, latOff)
          .addScaledVector(this.tmpBinorm, downOff);

        for (let s = 0; s <= buf.sides; s++) {
          const ang = (s / buf.sides) * Math.PI * 2;
          const ca = Math.cos(ang) * spec.radius;
          const sa = Math.sin(ang) * spec.radius;
          pos[aPtr++] = this.tmpAuxPt.x + this.tmpNorm.x * ca + this.tmpBinorm.x * sa;
          pos[aPtr++] = this.tmpAuxPt.y + this.tmpNorm.y * ca + this.tmpBinorm.y * sa;
          pos[aPtr++] = this.tmpAuxPt.z + this.tmpNorm.z * ca + this.tmpBinorm.z * sa;
        }
      }
      buf.geometry.attributes.position.needsUpdate = true;
      buf.geometry.computeVertexNormals();
    }

    // 3. Position & orient articulated turnbuckles, mid-span damper & bundling P-clamps
    for (let i = 0; i < assembly.mounts.length; i++) {
      const m = assembly.mounts[i];
      this.tmpCurve.getPoint(m.u, m.node.position);
      const tan = this.tmpCurve.getTangent(m.u, this.tmpTan);
      if (tan.lengthSq() < 1e-6) tan.set(0, 0, 1);
      else tan.normalize();

      // Basis: X = right (tmpNorm), Y = up (tmpBinorm), Z = tangent along cable
      this.tmpNorm.crossVectors(this.tmpUp, tan);
      if (this.tmpNorm.lengthSq() < 1e-5) this.tmpNorm.set(1, 0, 0);
      else this.tmpNorm.normalize();
      this.tmpBinorm.crossVectors(tan, this.tmpNorm).normalize();

      this.tmpBasisMat.makeBasis(this.tmpNorm, this.tmpBinorm, tan);
      m.node.quaternion.setFromRotationMatrix(this.tmpBasisMat);
    }
  }

  public getDetachableParts(): DetachablePartDescriptor[] {
    const parts: DetachablePartDescriptor[] = [
      {
        id: 'left_engine_core',
        node: this.leftEngine.root,
        parentKind: 'root',
        comOffsetLocal: new THREE.Vector3(0, 0, -1.55),
        radius: 0.54,
        mass: 420,
        restitution: 0.34,
        friction: 0.42,
        drag: 0.14,
        flutter: 0.05,
        kind: 'left_engine',
        side: -1,
      },
      {
        id: 'right_engine_core',
        node: this.rightEngine.root,
        parentKind: 'root',
        comOffsetLocal: new THREE.Vector3(0, 0, -1.55),
        radius: 0.54,
        mass: 420,
        restitution: 0.34,
        friction: 0.42,
        drag: 0.14,
        flutter: 0.05,
        kind: 'right_engine',
        side: 1,
      },
      {
        id: 'cockpit_pod',
        node: this.cockpitGroup,
        parentKind: 'root',
        comOffsetLocal: new THREE.Vector3(0, 0.22, 0.1),
        radius: 0.58,
        mass: 260,
        restitution: 0.3,
        friction: 0.46,
        drag: 0.16,
        flutter: 0.08,
        kind: 'cockpit',
        side: 0,
      },
    ];

    const engineSides: Array<{
      eng: EngineVisualRefs;
      side: -1 | 1;
      parentKind: 'left_engine' | 'right_engine';
      prefix: string;
    }> = [
      { eng: this.leftEngine, side: -1, parentKind: 'left_engine', prefix: 'left' },
      { eng: this.rightEngine, side: 1, parentKind: 'right_engine', prefix: 'right' },
    ];

    for (const { eng, side, parentKind, prefix } of engineSides) {
      parts.push(
        {
          id: `${prefix}_belly_tank`,
          node: eng.bellyGroup,
          parentKind,
          comOffsetLocal: new THREE.Vector3(0, 0, 0),
          radius: 0.32,
          mass: 65,
          restitution: 0.42,
          friction: 0.36,
          drag: 0.26,
          flutter: 0.22,
          kind: 'belly_tank',
          side,
        },
        {
          id: `${prefix}_intake_rotor`,
          node: eng.intakeGroup,
          parentKind,
          comOffsetLocal: new THREE.Vector3(0, 0, -0.08),
          radius: 0.4,
          mass: 52,
          restitution: 0.46,
          friction: 0.3,
          drag: 0.24,
          flutter: 0.18,
          kind: 'intake_rotor',
          side,
        }
      );

      eng.flaps.forEach((flap, idx) => {
        parts.push({
          id: `${prefix}_flap_${idx}`,
          node: flap.hingeOffset,
          parentKind,
          comOffsetLocal: new THREE.Vector3(0, 0, -0.88),
          radius: 0.26,
          mass: 22,
          restitution: 0.48,
          friction: 0.34,
          drag: 0.48,
          flutter: 0.85,
          kind: 'air_flap',
          side,
        });
      });

      if (eng.modNitroGroup.visible) {
        parts.push({
          id: `${prefix}_mod_nitro`,
          node: eng.modNitroGroup,
          parentKind,
          comOffsetLocal: new THREE.Vector3(side * 0.34, 0.44, -1.5),
          radius: 0.22,
          mass: 38,
          restitution: 0.45,
          friction: 0.32,
          drag: 0.28,
          flutter: 0.3,
          kind: 'mod_part',
          side,
        });
      }
      if (eng.modCoolantGroup.visible) {
        parts.push({
          id: `${prefix}_mod_coolant`,
          node: eng.modCoolantGroup,
          parentKind,
          comOffsetLocal: new THREE.Vector3(side * 0.36, 0.41, -1.35),
          radius: 0.22,
          mass: 38,
          restitution: 0.44,
          friction: 0.32,
          drag: 0.28,
          flutter: 0.3,
          kind: 'mod_part',
          side,
        });
      }
      if (eng.modFlyingGroup.visible) {
        parts.push({
          id: `${prefix}_mod_flying`,
          node: eng.modFlyingGroup,
          parentKind,
          comOffsetLocal: new THREE.Vector3(side * 0.72, 0.3, -1.38),
          radius: 0.28,
          mass: 28,
          restitution: 0.42,
          friction: 0.36,
          drag: 0.54,
          flutter: 0.92,
          kind: 'mod_part',
          side,
        });
      }
    }

    parts.push(
      {
        id: 'cockpit_left_wing',
        node: this.cockpitLeftWingGroup,
        parentKind: 'cockpit',
        comOffsetLocal: new THREE.Vector3(0, 0, 0),
        radius: 0.22,
        mass: 18,
        restitution: 0.44,
        friction: 0.36,
        drag: 0.5,
        flutter: 0.78,
        kind: 'winglet',
        side: -1,
      },
      {
        id: 'cockpit_right_wing',
        node: this.cockpitRightWingGroup,
        parentKind: 'cockpit',
        comOffsetLocal: new THREE.Vector3(0, 0, 0),
        radius: 0.22,
        mass: 18,
        restitution: 0.44,
        friction: 0.36,
        drag: 0.5,
        flutter: 0.78,
        kind: 'winglet',
        side: 1,
      },
      {
        id: 'cockpit_left_arm',
        node: this.cockpitLeftArmGroup,
        parentKind: 'cockpit',
        comOffsetLocal: new THREE.Vector3(0, 0, 0),
        radius: 0.16,
        mass: 14,
        restitution: 0.4,
        friction: 0.4,
        drag: 0.35,
        flutter: 0.35,
        kind: 'outrigger',
        side: -1,
      },
      {
        id: 'cockpit_right_arm',
        node: this.cockpitRightArmGroup,
        parentKind: 'cockpit',
        comOffsetLocal: new THREE.Vector3(0, 0, 0),
        radius: 0.16,
        mass: 14,
        restitution: 0.4,
        friction: 0.4,
        drag: 0.35,
        flutter: 0.35,
        kind: 'outrigger',
        side: 1,
      }
    );

    return parts;
  }

  public detachCablesAndPlasmaToGroup(targetGroup: THREE.Group): void {
    this.damperLight.intensity = 0;
    this.leftCable.group.position.set(0, 0, 0);
    this.leftCable.group.rotation.set(0, 0, 0);
    this.leftCable.group.scale.set(1, 1, 1);
    this.rightCable.group.position.set(0, 0, 0);
    this.rightCable.group.rotation.set(0, 0, 0);
    this.rightCable.group.scale.set(1, 1, 1);
    targetGroup.add(this.leftCable.group, this.rightCable.group);

    for (const arc of this.plasmaLines) {
      arc.line.position.set(0, 0, 0);
      arc.line.rotation.set(0, 0, 0);
      arc.line.scale.set(1, 1, 1);
      targetGroup.add(arc.line);
    }
  }

  public updateSeveredWorldCable(
    side: 'left' | 'right',
    worldStart: THREE.Vector3,
    worldEnd: THREE.Vector3,
    whipMidWorld: THREE.Vector3
  ): void {
    const assembly = side === 'left' ? this.leftCable : this.rightCable;
    // Exact degree elevation from Quadratic Bezier (start, mid, end) to Cubic Bezier
    this.tmpP1.copy(worldStart).lerp(whipMidWorld, 2 / 3);
    this.tmpP2.copy(worldEnd).lerp(whipMidWorld, 2 / 3);
    this.tmpCurve.v0.copy(worldStart);
    this.tmpCurve.v1.copy(this.tmpP1);
    this.tmpCurve.v2.copy(this.tmpP2);
    this.tmpCurve.v3.copy(worldEnd);

    this.updateCableBundleFromCurve(assembly, 0.95, performance.now() * 0.001);
  }

  public updateSeveringPlasmaWorld(
    leftWorld: THREE.Vector3,
    rightWorld: THREE.Vector3,
    snapProgress: number
  ): void {
    if (snapProgress >= 1) {
      for (const arc of this.plasmaLines) {
        arc.line.visible = false;
      }
      return;
    }

    for (let l = 0; l < this.plasmaLines.length; l++) {
      const arc = this.plasmaLines[l];
      arc.line.visible = true;
      const mat = arc.line.material as THREE.LineBasicMaterial;
      mat.opacity = (l === 2 ? 1.0 : 0.85) * Math.pow(1 - snapProgress, 1.3);

      const pos = arc.positions;
      const wildScale = arc.jitterScale * (1.8 + snapProgress * 9.5);
      for (let i = 0; i <= PLASMA_SEGMENTS; i++) {
        const u = i / PLASMA_SEGMENTS;
        const env = Math.sin(u * Math.PI);
        // Whip outward as binder snaps
        const whipY = env * snapProgress * 1.6 * (l - 1 + (Math.random() - 0.5));
        const jx = (Math.random() - 0.5) * wildScale * env;
        const jy = (Math.random() - 0.5) * wildScale * env + whipY;
        const jz = (Math.random() - 0.5) * wildScale * env;
        pos[i * 3] = THREE.MathUtils.lerp(leftWorld.x, rightWorld.x, u) + jx;
        pos[i * 3 + 1] = THREE.MathUtils.lerp(leftWorld.y, rightWorld.y, u) + jy;
        pos[i * 3 + 2] = THREE.MathUtils.lerp(leftWorld.z, rightWorld.z, u) + jz;
      }
      arc.line.geometry.attributes.position.needsUpdate = true;
    }
  }

  public updateDetachedEngineVisuals(
    side: 'left' | 'right',
    roguePower: number,
    heat: number,
    fanSpinRate: number,
    dt: number,
    elapsedTime: number
  ): void {
    const eng = side === 'left' ? this.leftEngine : this.rightEngine;
    eng.reversePuff.visible = false;
    eng.fanGroup.rotation.z += dt * fanSpinRate;

    const heatFrac = THREE.MathUtils.clamp(heat / 100, 0, 1);
    for (let i = 0; i < eng.heatMaterials.length; i++) {
      const entry = eng.heatMaterials[i];
      entry.mat.color.copy(entry.baseColor).lerp(this.heatColor, heatFrac * 0.78);
      entry.mat.emissive.copy(entry.baseEmissive).lerp(this.heatEmissiveColor, heatFrac * 0.9);
      entry.mat.emissiveIntensity = 1.0 + heatFrac * 2.0;
    }

    if (roguePower > 0.02) {
      eng.exhaustCore.visible = true;
      eng.exhaustOuter.visible = true;
      const sputter = 0.35 + Math.random() * 1.1;
      const flicker = (0.85 + Math.sin(elapsedTime * 52) * 0.15) * sputter;
      const lenScale = (0.3 + roguePower * 1.5) * flicker;
      const radScale = 0.6 + roguePower * 0.5;
      eng.exhaustCore.scale.set(radScale, lenScale * 0.85, radScale);
      eng.exhaustOuter.scale.set(radScale * 1.2, lenScale, radScale * 1.2);
      const outerMat = eng.exhaustOuter.material as THREE.MeshBasicMaterial;
      outerMat.color.copy(Math.random() < 0.4 ? this.overloadOuterColor : this.normalOuterColor);
    } else {
      eng.exhaustCore.visible = false;
      eng.exhaustOuter.visible = false;
    }
  }

  public getEngineWorldEmitter(side: 'left' | 'right', out: THREE.Vector3): THREE.Vector3 {
    const eng = side === 'left' ? this.leftEngine : this.rightEngine;
    eng.root.updateMatrixWorld(true);
    return eng.emitterWorldDummy.getWorldPosition(out);
  }

  public getCockpitWorldArm(side: 'left' | 'right', out: THREE.Vector3): THREE.Vector3 {
    this.cockpitGroup.updateMatrixWorld(true);
    const dummy = side === 'left' ? this.cockpitLeftArmDummy : this.cockpitRightArmDummy;
    return dummy.getWorldPosition(out);
  }

  public restoreAfterDisassembly(mod: PodModificationId): void {
    this.damperLight.intensity = 0;
    this.podRoot.add(this.leftCable.group, this.rightCable.group);
    for (let i = 0; i < this.plasmaLines.length; i++) {
      const arc = this.plasmaLines[i];
      arc.line.visible = true;
      (arc.line.material as THREE.LineBasicMaterial).opacity = i === 2 ? 0.95 : 0.72;
      this.podRoot.add(arc.line);
    }
    for (const eng of [this.leftEngine, this.rightEngine]) {
      eng.exhaustCore.visible = false;
      eng.exhaustOuter.visible = false;
      eng.reversePuff.visible = false;
    }
    this.setModification(mod);
  }
}
