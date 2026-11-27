import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PodModificationId, PodTelemetry } from '../types';

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
}

const PLASMA_SEGMENTS = 14;
const CABLE_RINGS = 20;
const CABLE_SIDES = 6;
const CABLE_RADIUS = 0.028;
const COCKPIT_BASE_Z = 5.325;
const COCKPIT_SCALE = 0.72;

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
  private cockpitBrakeLightMat!: THREE.MeshStandardMaterial;
  private cockpitStatusLightMat!: THREE.MeshStandardMaterial;
  private cockpitRepulsorMat!: THREE.MeshStandardMaterial;

  private readonly plasmaLines: Array<{
    line: THREE.Line;
    positions: Float32Array;
    jitterScale: number;
  }> = [];

  private readonly leftCable: CableBuffer;
  private readonly rightCable: CableBuffer;

  // Reusable scratch objects (zero per-frame allocations)
  private readonly tmpA = new THREE.Vector3();
  private readonly tmpB = new THREE.Vector3();
  private readonly tmpMid = new THREE.Vector3();
  private readonly tmpTan = new THREE.Vector3();
  private readonly tmpNorm = new THREE.Vector3();
  private readonly tmpBinorm = new THREE.Vector3();
  private readonly tmpUp = new THREE.Vector3(0, 1, 0);
  private readonly tmpCurve = new THREE.QuadraticBezierCurve3();

  private flapFlareLeft = 0;
  private flapFlareRight = 0;
  private readonly normalOuterColor = new THREE.Color(0xff7711);
  private readonly boostOuterColor = new THREE.Color(0x38bdf8);
  private readonly nitroOuterColor = new THREE.Color(0xf43f5e);
  private readonly overloadOuterColor = new THREE.Color(0xef4444);
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

    // Pre-allocate twin flexible control tether cables
    this.leftCable = this.createCableBuffer(mats.cable);
    this.rightCable = this.createCableBuffer(mats.cable);
    this.podRoot.add(this.leftCable.mesh, this.rightCable.mesh);
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
    const overloadVib = t.airborneOverload ? 0.055 : 0;
    const overheatVib = t.overheatedLeft || t.overheatedRight ? 0.032 : 0;
    const nitroVib = t.nitroActive ? 0.028 : 0;
    const vib =
      (Math.abs(t.pLeft) + Math.abs(t.pRight)) * 0.008 +
      overloadVib +
      overheatVib +
      nitroVib;
    this.enginesGroup.position.set(
      (Math.random() - 0.5) * vib,
      (Math.random() - 0.5) * vib,
      0
    );
    this.enginesGroup.rotation.x = 0;

    this.cockpitGroup.position.set(
      t.cockpitYawOffset * 1.4,
      0.85 + t.cockpitVertOffset,
      COCKPIT_BASE_Z
    );
    this.cockpitGroup.rotation.set(
      0,
      t.cockpitYawOffset,
      t.cockpitRollOffset,
      'YXZ'
    );
    this.cockpitPilotGroup.rotation.z = t.roll * 0.3;

    // Reactive cabin stern light bars & under-belly repulsor pad
    const isBraking = t.pLeft < -0.05 || t.pRight < -0.05;
    this.cockpitBrakeLightMat.emissiveIntensity = isBraking ? 3.2 : 0.85;
    if (t.nitroActive) {
      this.cockpitStatusLightMat.color.setHex(0xf97316);
      this.cockpitStatusLightMat.emissive.setHex(0xf97316);
      this.cockpitStatusLightMat.emissiveIntensity = 2.6;
    } else if (t.coolantActive) {
      this.cockpitStatusLightMat.color.setHex(0x67e8f9);
      this.cockpitStatusLightMat.emissive.setHex(0x67e8f9);
      this.cockpitStatusLightMat.emissiveIntensity = 2.4;
    } else if (t.landingBoost > 0.02) {
      this.cockpitStatusLightMat.color.setHex(0x38bdf8);
      this.cockpitStatusLightMat.emissive.setHex(0x38bdf8);
      this.cockpitStatusLightMat.emissiveIntensity = 1.4 + t.landingBoost * 2.0;
    } else {
      this.cockpitStatusLightMat.color.setHex(0x38bdf8);
      this.cockpitStatusLightMat.emissive.setHex(0x0ea5e9);
      this.cockpitStatusLightMat.emissiveIntensity = 1.1;
    }
    const repulsorPulse = 0.9 + Math.sin(elapsedTime * 7.5) * 0.12;
    this.cockpitRepulsorMat.emissiveIntensity =
      (1.25 + t.landingBoost * 1.9 + (t.nitroActive ? 0.6 : 0)) * repulsorPulse;

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
      dt,
      elapsedTime
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
      dt,
      elapsedTime
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
    const invRoot = this.podRoot.matrixWorld.clone().invert();

    // Update Plasma Binder Arc
    this.leftEngine.emitterWorldDummy.getWorldPosition(this.tmpA).applyMatrix4(invRoot);
    this.rightEngine.emitterWorldDummy.getWorldPosition(this.tmpB).applyMatrix4(invRoot);
    for (let l = 0; l < this.plasmaLines.length; l++) {
      const arc = this.plasmaLines[l];
      const pos = arc.positions;
      for (let i = 0; i <= PLASMA_SEGMENTS; i++) {
        const u = i / PLASMA_SEGMENTS;
        const env = Math.sin(u * Math.PI);
        const jx = (Math.random() - 0.5) * arc.jitterScale * env;
        const jy = (Math.random() - 0.5) * arc.jitterScale * env;
        const jz = (Math.random() - 0.5) * arc.jitterScale * env;
        pos[i * 3] = THREE.MathUtils.lerp(this.tmpA.x, this.tmpB.x, u) + jx;
        pos[i * 3 + 1] = THREE.MathUtils.lerp(this.tmpA.y, this.tmpB.y, u) + jy;
        pos[i * 3 + 2] = THREE.MathUtils.lerp(this.tmpA.z, this.tmpB.z, u) + jz;
      }
      arc.line.geometry.attributes.position.needsUpdate = true;
    }

    // Update Twin Control Tether Cables
    this.leftEngine.pylonDummy.getWorldPosition(this.tmpA).applyMatrix4(invRoot);
    this.cockpitLeftArmDummy.getWorldPosition(this.tmpB).applyMatrix4(invRoot);
    this.updateCableGeometry(this.leftCable, this.tmpA, this.tmpB, t.speedMs);

    this.rightEngine.pylonDummy.getWorldPosition(this.tmpA).applyMatrix4(invRoot);
    this.cockpitRightArmDummy.getWorldPosition(this.tmpB).applyMatrix4(invRoot);
    this.updateCableGeometry(this.rightCable, this.tmpA, this.tmpB, t.speedMs);
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
    dt: number,
    elapsedTime: number
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

    // Spin 28-blade intake fan
    eng.fanGroup.rotation.z +=
      dt * (4.0 + Math.abs(power) * 32.0 + landingBoost * 24.0 + (nitroActive ? 22.0 : 0));

    // Flare forward yellow airbrake flaps on reverse (-30%)
    const flareRad = flare * THREE.MathUtils.degToRad(26);
    for (const f of eng.flaps) {
      f.pivot.setRotationFromAxisAngle(f.axis, f.sign * flareRad);
    }

    // Rear exhaust jet plumes (supercharged during landing boost or nitro, sputtering on overload)
    const posP = Math.max(0, power);
    const effPlume = Math.max(posP, landingBoost * 0.85, nitroActive ? 1.15 : 0);
    if (effPlume > 0.02) {
      eng.exhaustCore.visible = true;
      eng.exhaustOuter.visible = true;
      const sputter = airborneOverload ? 0.65 + Math.random() * 0.7 : 1.0;
      const flicker = (0.9 + Math.sin(elapsedTime * 45 * Math.PI * 2) * 0.12) * sputter;
      const boostScale = 1 + landingBoost * 0.75 + (nitroActive ? 0.45 : 0);
      const lenScale = (0.35 + effPlume * 1.45) * flicker * boostScale;
      const radScale = (0.65 + Math.min(1.4, effPlume) * 0.45) * (1 + landingBoost * 0.3 + (nitroActive ? 0.22 : 0));
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
      } else {
        outerMat.color.copy(this.normalOuterColor);
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

  private createMaterials() {
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
        color: 0xaab4c0,
        metalness: 0.78,
        roughness: 0.34,
      }),
      hudGlass: new THREE.MeshStandardMaterial({
        color: 0x0b1220,
        emissive: 0x071426,
        emissiveIntensity: 0.25,
        metalness: 0.85,
        roughness: 0.08,
        transparent: true,
        opacity: 0.78,
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
        color: 0x353b45,
        metalness: 0.8,
        roughness: 0.35,
      }),
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

    // 7. Top-Rear Tether Pylon Dummy
    const pylonDummy = new THREE.Object3D();
    pylonDummy.position.set(-sideSign * 0.13, 0.50, -1.05);
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
      color: 0x10b981,
      metalness: 0.5,
      roughness: 0.28,
      emissive: 0x065f46,
      emissiveIntensity: 0.7,
    });
    const wingGeo = new THREE.BoxGeometry(0.72, 0.045, 1.35);
    wingGeo.rotateY(sideSign * -0.26);
    wingGeo.rotateZ(sideSign * 0.14);
    const wingMesh = new THREE.Mesh(wingGeo, mats.steel);
    wingMesh.position.set(sideSign * 0.78, 0.08, -1.35);
    wingMesh.castShadow = true;
    modFlyingGroup.add(wingMesh);
    const tipGeo = new THREE.BoxGeometry(0.12, 0.055, 1.05);
    tipGeo.rotateY(sideSign * -0.26);
    tipGeo.rotateZ(sideSign * 0.14);
    const tipMesh = new THREE.Mesh(tipGeo, aeroFinMat);
    tipMesh.position.set(sideSign * 1.12, 0.13, -1.42);
    modFlyingGroup.add(tipMesh);
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
    // Proposal 2B: Wingless Unpowered Fighter-Jet Interceptor Canopy
    // (faceted stealth fuselage, enclosed dark-tinted fighter canopy, zero wings/fins, zero rear thruster)

    // 1. Main faceted stealth-fighter fuselage (sharp nose-to-tail chined planform)
    const hullShape = new THREE.Shape();
    hullShape.moveTo(0, -1.54);      // sharp needle nose tip
    hullShape.lineTo(0.24, -1.02);   // nose chine right
    hullShape.lineTo(0.46, -0.34);   // forward shoulder right
    hullShape.lineTo(0.48, 0.42);    // mid-fuselage right
    hullShape.lineTo(0.32, 1.04);    // rear taper right
    hullShape.lineTo(0.22, 1.28);    // chiseled stern right
    hullShape.lineTo(-0.22, 1.28);   // chiseled stern left
    hullShape.lineTo(-0.32, 1.04);   // rear taper left
    hullShape.lineTo(-0.48, 0.42);   // mid-fuselage left
    hullShape.lineTo(-0.46, -0.34);  // forward shoulder left
    hullShape.lineTo(-0.24, -1.02);  // nose chine left
    hullShape.closePath();

    const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.075,
      bevelSize: 0.055,
      bevelSegments: 2,
    });
    hullGeo.rotateX(Math.PI / 2);
    hullGeo.translate(0, 0.16, 0);
    const hullMesh = new THREE.Mesh(hullGeo, mats.cockpitSilver);
    hullMesh.castShadow = true;
    this.cockpitGroup.add(hullMesh);

    // 2. Dark gunmetal stealth lower belly chine
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
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.035,
      bevelSegments: 1,
    });
    bellyGeo.rotateX(Math.PI / 2);
    bellyGeo.translate(0, -0.09, 0);
    const bellyMesh = new THREE.Mesh(bellyGeo, mats.gunmetal);
    bellyMesh.castShadow = true;
    this.cockpitGroup.add(bellyMesh);

    // 3. Faceted upper nose deck + twin cobalt-blue racing stripes & amber trim accents
    const noseCapShape = new THREE.Shape();
    noseCapShape.moveTo(0, -1.46);
    noseCapShape.lineTo(0.21, -0.95);
    noseCapShape.lineTo(0.34, -0.44);
    noseCapShape.lineTo(-0.34, -0.44);
    noseCapShape.lineTo(-0.21, -0.95);
    noseCapShape.closePath();

    const noseCapGeo = new THREE.ExtrudeGeometry(noseCapShape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 1,
    });
    noseCapGeo.rotateX(Math.PI / 2);
    noseCapGeo.translate(0, 0.245, 0);
    const noseCapMesh = new THREE.Mesh(noseCapGeo, mats.gunmetal);
    noseCapMesh.castShadow = true;
    this.cockpitGroup.add(noseCapMesh);

    for (const s of [-1, 1] as const) {
      // Twin cobalt-blue nose-to-canopy racing stripes
      const frontStripeGeo = new THREE.BoxGeometry(0.085, 0.022, 0.62);
      frontStripeGeo.rotateY(s * -0.14);
      frontStripeGeo.translate(s * 0.14, 0.265, -0.78);
      this.cockpitGroup.add(new THREE.Mesh(frontStripeGeo, mats.blue));

      // Crisp amber-yellow forward trim slash near canopy sill
      const amberTrimGeo = new THREE.BoxGeometry(0.075, 0.028, 0.28);
      amberTrimGeo.rotateY(s * -0.18);
      amberTrimGeo.translate(s * 0.28, 0.255, -0.46);
      this.cockpitGroup.add(new THREE.Mesh(amberTrimGeo, mats.yellow));
    }

    // 4. Compact faceted side intake cheeks & nose tether shackles (no wings/fins; grouped for breakup debris)
    for (const s of [-1, 1] as const) {
      const cheekGroup = new THREE.Group();
      cheekGroup.position.set(s * 0.44, 0.06, 0.02);

      // Angled stealth side intake pod hugging the fuselage
      const podGeo = new THREE.BoxGeometry(0.18, 0.22, 0.88);
      podGeo.rotateZ(s * -0.22);
      podGeo.rotateY(s * -0.06);
      const podMesh = new THREE.Mesh(podGeo, mats.cockpitSilver);
      podMesh.castShadow = true;
      cheekGroup.add(podMesh);

      // Recessed dark front intake scoop opening
      const scoopGeo = new THREE.BoxGeometry(0.13, 0.15, 0.08);
      scoopGeo.rotateZ(s * -0.22);
      scoopGeo.translate(s * 0.02, 0.0, -0.43);
      cheekGroup.add(new THREE.Mesh(scoopGeo, mats.gunmetal));

      // Cobalt-blue & amber-yellow side flank stripes
      const sideBlueGeo = new THREE.BoxGeometry(0.04, 0.10, 0.54);
      sideBlueGeo.rotateZ(s * -0.22);
      sideBlueGeo.translate(s * 0.085, 0.02, 0.08);
      cheekGroup.add(new THREE.Mesh(sideBlueGeo, mats.blue));

      const sideYellowGeo = new THREE.BoxGeometry(0.04, 0.07, 0.22);
      sideYellowGeo.rotateZ(s * -0.22);
      sideYellowGeo.translate(s * 0.09, -0.04, -0.24);
      cheekGroup.add(new THREE.Mesh(sideYellowGeo, mats.yellow));

      this.cockpitGroup.add(cheekGroup);
      if (s < 0) this.cockpitLeftWingGroup = cheekGroup;
      else this.cockpitRightWingGroup = cheekGroup;

      // Compact gunmetal tether mount integrated into forward nose chine
      const armGroup = new THREE.Group();
      armGroup.position.set(s * 0.34, 0.06, -0.82);
      const shackleGeo = new THREE.BoxGeometry(0.14, 0.10, 0.20);
      shackleGeo.rotateY(s * -0.32);
      const shackle = new THREE.Mesh(shackleGeo, mats.gunmetal);
      shackle.castShadow = true;
      armGroup.add(shackle);
      this.cockpitGroup.add(armGroup);
      if (s < 0) this.cockpitLeftArmGroup = armGroup;
      else this.cockpitRightArmGroup = armGroup;
    }

    // 5. Recessed cockpit interior + pilot silhouette + glowing cyan HUD instrument panel
    const tubGeo = new THREE.BoxGeometry(0.50, 0.14, 0.86);
    tubGeo.translate(0, 0.18, -0.02);
    this.cockpitGroup.add(new THREE.Mesh(tubGeo, mats.gunmetal));

    const seatGeo = new THREE.BoxGeometry(0.34, 0.34, 0.36);
    seatGeo.rotateX(-0.22);
    seatGeo.translate(0, 0.30, 0.18);
    this.cockpitGroup.add(new THREE.Mesh(seatGeo, mats.seat));

    const hudScreenMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    const hudScreenGeo = new THREE.BoxGeometry(0.20, 0.07, 0.02);
    hudScreenGeo.rotateX(-0.35);
    hudScreenGeo.translate(0, 0.33, -0.32);
    this.cockpitGroup.add(new THREE.Mesh(hudScreenGeo, hudScreenMat));

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.18), mats.gunmetal);
    torso.position.set(0, 0.34, 0.10);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 10), mats.cockpitSilver);
    helmet.position.set(0, 0.52, 0.08);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.07, 0.12), mats.visor);
    visor.position.set(0, 0.52, -0.01);
    this.cockpitPilotGroup.add(torso, helmet, visor);
    this.cockpitGroup.add(this.cockpitPilotGroup);

    // 6. Enclosed dark-tinted fighter-jet canopy + angular stealth framing ribs
    const canopyGeo = new THREE.SphereGeometry(0.34, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52);
    canopyGeo.scale(0.86, 1.15, 1.85);
    canopyGeo.translate(0, 0.24, -0.02);
    const canopyMesh = new THREE.Mesh(canopyGeo, mats.hudGlass);
    this.cockpitGroup.add(canopyMesh);

    // Gunmetal canopy sill collar & angled canopy bow frame
    const sillGeo = new THREE.TorusGeometry(0.34, 0.032, 8, 20);
    sillGeo.rotateX(Math.PI / 2);
    sillGeo.scale(0.88, 1.0, 1.88);
    sillGeo.translate(0, 0.245, -0.02);
    this.cockpitGroup.add(new THREE.Mesh(sillGeo, mats.gunmetal));

    const bowGeo = new THREE.TorusGeometry(0.345, 0.024, 6, 16, Math.PI);
    bowGeo.scale(0.87, 1.14, 1.0);
    bowGeo.rotateX(-0.22);
    bowGeo.translate(0, 0.24, -0.18);
    this.cockpitGroup.add(new THREE.Mesh(bowGeo, mats.gunmetal));

    // 7. Faceted dorsal spine fairing tapering cleanly behind canopy to stern (NO V-tail wings)
    const spineProfile = new THREE.Shape();
    spineProfile.moveTo(0.42, 0.20);
    spineProfile.lineTo(0.46, 0.52);  // merges behind canopy arch
    spineProfile.lineTo(0.68, 0.46);
    spineProfile.lineTo(1.24, 0.22);  // clean low stealth taper to stern
    spineProfile.lineTo(1.24, 0.14);
    spineProfile.lineTo(0.42, 0.14);
    spineProfile.closePath();

    const spineGeo = new THREE.ExtrudeGeometry(spineProfile, {
      depth: 0.34,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.035,
      bevelSegments: 2,
    });
    spineGeo.rotateY(-Math.PI / 2);
    spineGeo.translate(0.17, 0, 0);
    const spineMesh = new THREE.Mesh(spineGeo, mats.cockpitSilver);
    spineMesh.castShadow = true;
    this.cockpitGroup.add(spineMesh);

    // Twin cobalt-blue dorsal racing stripes along rear deck
    for (const s of [-1, 1] as const) {
      const rearStripeGeo = new THREE.BoxGeometry(0.085, 0.028, 0.62);
      rearStripeGeo.rotateX(0.38);
      rearStripeGeo.translate(s * 0.11, 0.39, 0.88);
      this.cockpitGroup.add(new THREE.Mesh(rearStripeGeo, mats.blue));
    }

    // 8. Clean closed stealth stern bezel + stacked cyan/red interceptor light bar (ZERO rear thruster)
    const sternBezelGeo = new THREE.BoxGeometry(0.46, 0.20, 0.07);
    sternBezelGeo.translate(0, 0.06, 1.29);
    this.cockpitGroup.add(new THREE.Mesh(sternBezelGeo, mats.gunmetal));

    this.cockpitStatusLightMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });
    const statusBarGeo = new THREE.BoxGeometry(0.36, 0.032, 0.025);
    statusBarGeo.translate(0, 0.105, 1.325);
    this.cockpitGroup.add(new THREE.Mesh(statusBarGeo, this.cockpitStatusLightMat));

    this.cockpitBrakeLightMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xef4444,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const brakeBarGeo = new THREE.BoxGeometry(0.38, 0.038, 0.025);
    brakeBarGeo.translate(0, 0.048, 1.325);
    this.cockpitGroup.add(new THREE.Mesh(brakeBarGeo, this.cockpitBrakeLightMat));

    // 9. Compact centered under-belly cyan repulsor hover pad
    const repulsorHousingGeo = new THREE.BoxGeometry(0.38, 0.055, 0.50);
    repulsorHousingGeo.translate(0, -0.23, 0.08);
    this.cockpitGroup.add(new THREE.Mesh(repulsorHousingGeo, mats.gunmetal));

    this.cockpitRepulsorMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.35,
      roughness: 0.15,
    });
    const repulsorPadGeo = new THREE.BoxGeometry(0.30, 0.028, 0.42);
    repulsorPadGeo.translate(0, -0.262, 0.08);
    this.cockpitGroup.add(new THREE.Mesh(repulsorPadGeo, this.cockpitRepulsorMat));

    // 10. Tether attachment dummies aligned to integrated nose shackles
    this.cockpitLeftArmDummy.position.set(-0.38, 0.06, -0.90);
    this.cockpitRightArmDummy.position.set(0.38, 0.06, -0.90);
    this.cockpitGroup.add(this.cockpitLeftArmDummy, this.cockpitRightArmDummy);
  }

  private createCableBuffer(material: THREE.Material): CableBuffer {
    const vertCount = (CABLE_RINGS + 1) * CABLE_SIDES;
    const positions = new Float32Array(vertCount * 3);
    const indices: number[] = [];

    for (let r = 0; r < CABLE_RINGS; r++) {
      for (let s = 0; s < CABLE_SIDES; s++) {
        const nextS = (s + 1) % CABLE_SIDES;
        const a = r * CABLE_SIDES + s;
        const b = r * CABLE_SIDES + nextS;
        const c = (r + 1) * CABLE_SIDES + s;
        const d = (r + 1) * CABLE_SIDES + nextS;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(indices);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    return { mesh, geometry, positions };
  }

  private updateCableGeometry(
    cable: CableBuffer,
    start: THREE.Vector3,
    end: THREE.Vector3,
    speedMs: number
  ): void {
    // Midpoint sags slightly at rest, pulls taut at high speed
    const tautness = Math.min(1, speedMs / 65);
    const sag = THREE.MathUtils.lerp(0.32, 0.05, tautness);
    this.tmpMid.copy(start).lerp(end, 0.5);
    this.tmpMid.y -= sag;

    this.tmpCurve.v0.copy(start);
    this.tmpCurve.v1.copy(this.tmpMid);
    this.tmpCurve.v2.copy(end);

    const pos = cable.positions;
    let ptr = 0;
    for (let r = 0; r <= CABLE_RINGS; r++) {
      const u = r / CABLE_RINGS;
      const pt = this.tmpCurve.getPoint(u, this.tmpMid);
      const tan = this.tmpCurve.getTangent(u, this.tmpTan).normalize();
      this.tmpNorm.crossVectors(tan, this.tmpUp).normalize();
      this.tmpBinorm.crossVectors(this.tmpNorm, tan).normalize();

      for (let s = 0; s < CABLE_SIDES; s++) {
        const ang = (s / CABLE_SIDES) * Math.PI * 2;
        const ca = Math.cos(ang) * CABLE_RADIUS;
        const sa = Math.sin(ang) * CABLE_RADIUS;
        pos[ptr++] = pt.x + this.tmpNorm.x * ca + this.tmpBinorm.x * sa;
        pos[ptr++] = pt.y + this.tmpNorm.y * ca + this.tmpBinorm.y * sa;
        pos[ptr++] = pt.z + this.tmpNorm.z * ca + this.tmpBinorm.z * sa;
      }
    }

    cable.geometry.attributes.position.needsUpdate = true;
    cable.geometry.computeVertexNormals();
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
          comOffsetLocal: new THREE.Vector3(side * 0.85, 0.1, -1.38),
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
    this.leftCable.mesh.position.set(0, 0, 0);
    this.leftCable.mesh.rotation.set(0, 0, 0);
    this.leftCable.mesh.scale.set(1, 1, 1);
    this.rightCable.mesh.position.set(0, 0, 0);
    this.rightCable.mesh.rotation.set(0, 0, 0);
    this.rightCable.mesh.scale.set(1, 1, 1);
    targetGroup.add(this.leftCable.mesh, this.rightCable.mesh);

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
    const cable = side === 'left' ? this.leftCable : this.rightCable;
    this.tmpCurve.v0.copy(worldStart);
    this.tmpCurve.v1.copy(whipMidWorld);
    this.tmpCurve.v2.copy(worldEnd);

    const pos = cable.positions;
    let ptr = 0;
    for (let r = 0; r <= CABLE_RINGS; r++) {
      const u = r / CABLE_RINGS;
      const pt = this.tmpCurve.getPoint(u, this.tmpMid);
      const tan = this.tmpCurve.getTangent(u, this.tmpTan);
      if (tan.lengthSq() < 1e-6) {
        tan.set(0, 0, 1);
      } else {
        tan.normalize();
      }
      this.tmpNorm.crossVectors(tan, this.tmpUp);
      if (this.tmpNorm.lengthSq() < 1e-5) {
        this.tmpNorm.set(1, 0, 0);
      } else {
        this.tmpNorm.normalize();
      }
      this.tmpBinorm.crossVectors(this.tmpNorm, tan).normalize();

      for (let s = 0; s < CABLE_SIDES; s++) {
        const ang = (s / CABLE_SIDES) * Math.PI * 2;
        const ca = Math.cos(ang) * CABLE_RADIUS;
        const sa = Math.sin(ang) * CABLE_RADIUS;
        pos[ptr++] = pt.x + this.tmpNorm.x * ca + this.tmpBinorm.x * sa;
        pos[ptr++] = pt.y + this.tmpNorm.y * ca + this.tmpBinorm.y * sa;
        pos[ptr++] = pt.z + this.tmpNorm.z * ca + this.tmpBinorm.z * sa;
      }
    }
    cable.geometry.attributes.position.needsUpdate = true;
    cable.geometry.computeVertexNormals();
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
    this.podRoot.add(this.leftCable.mesh, this.rightCable.mesh);
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
