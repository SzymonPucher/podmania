import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PodTelemetry } from '../types';

interface EngineVisualRefs {
  root: THREE.Group;
  fanGroup: THREE.Group;
  flaps: Array<{ pivot: THREE.Group; axis: THREE.Vector3; sign: number }>;
  exhaustCore: THREE.Mesh;
  exhaustOuter: THREE.Mesh;
  reversePuff: THREE.Mesh;
  emitterWorldDummy: THREE.Object3D;
  pylonDummy: THREE.Object3D;
  damperCone: THREE.Mesh;
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
  private readonly cockpitDamperCones: THREE.Mesh[] = [];
  private readonly damperLight: THREE.PointLight;

  private readonly cockpitLeftArmDummy = new THREE.Object3D();
  private readonly cockpitRightArmDummy = new THREE.Object3D();

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
  private engineDamperLift = 0;
  private damperGlideBlend = 0;

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

  public update(t: PodTelemetry, dt: number, elapsedTime: number): void {
    const glideRate = t.damperFiring ? 3 : 4;
    this.damperGlideBlend = THREE.MathUtils.lerp(
      this.damperGlideBlend,
      t.damperFiring ? 1 : 0,
      1 - Math.exp(-glideRate * dt)
    );

    this.podRoot.position.copy(t.pos);
    this.podRoot.rotation.set(t.pitch + this.damperGlideBlend * 0.18, t.yaw, t.roll, 'YXZ');

    // Subtle engine vibration, damper upward lift & plane-landing glide pitch
    this.engineDamperLift = this.damperGlideBlend * 1.15;
    const vib = (Math.abs(t.pLeft) + Math.abs(t.pRight)) * 0.008;
    this.enginesGroup.position.set(
      (Math.random() - 0.5) * vib,
      this.engineDamperLift + (Math.random() - 0.5) * vib,
      0
    );
    this.enginesGroup.rotation.x = this.damperGlideBlend * 0.12;

    this.cockpitGroup.position.set(
      t.cockpitYawOffset * 1.4,
      0.85 - this.damperGlideBlend * 0.35 + t.cockpitVertOffset,
      COCKPIT_BASE_Z
    );
    this.cockpitGroup.rotation.set(
      -this.damperGlideBlend * 0.06,
      t.cockpitYawOffset,
      t.cockpitRollOffset,
      'YXZ'
    );
    this.cockpitPilotGroup.rotation.z = t.roll * 0.25;

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

    this.updateEngineVisuals(this.leftEngine, t.pLeft, this.flapFlareLeft, t.damperFiring, dt, elapsedTime);
    this.updateEngineVisuals(this.rightEngine, t.pRight, this.flapFlareRight, t.damperFiring, dt, elapsedTime);

    // Cockpit ventral damper cones
    for (const cone of this.cockpitDamperCones) {
      cone.visible = t.damperFiring;
      if (t.damperFiring) {
        const pulse = 0.88 + Math.sin(elapsedTime * 55) * 0.14;
        cone.scale.set(1, pulse, 1);
      }
    }
    this.damperLight.intensity = t.damperFiring ? 18 : 0;

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
    damperFiring: boolean,
    dt: number,
    elapsedTime: number
  ): void {
    // Spin 28-blade intake fan
    eng.fanGroup.rotation.z += dt * (4.0 + Math.abs(power) * 32.0);

    // Flare forward yellow airbrake flaps on reverse (-30%)
    const flareRad = flare * THREE.MathUtils.degToRad(26);
    for (const f of eng.flaps) {
      f.pivot.setRotationFromAxisAngle(f.axis, f.sign * flareRad);
    }

    // Rear exhaust jet plumes
    const posP = Math.max(0, power);
    if (posP > 0.02) {
      eng.exhaustCore.visible = true;
      eng.exhaustOuter.visible = true;
      const flicker = 0.9 + Math.sin(elapsedTime * 45 * Math.PI * 2) * 0.12;
      const lenScale = (0.35 + posP * 1.45) * flicker;
      const radScale = 0.65 + posP * 0.45;
      eng.exhaustCore.scale.set(radScale, lenScale * 0.85, radScale);
      eng.exhaustOuter.scale.set(radScale * 1.15, lenScale, radScale * 1.15);
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

    // Ventral damper cone
    eng.damperCone.visible = damperFiring;
    if (damperFiring) {
      const pulse = 0.88 + Math.sin(elapsedTime * 55) * 0.14;
      eng.damperCone.scale.set(1, pulse, 1);
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
        color: 0xb8c8d8,
        metalness: 0.92,
        roughness: 0.16,
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
    // 16 angled rear exhaust nozzle petals
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const petal = new THREE.BoxGeometry(0.11, 0.035, 0.36);
      petal.rotateX(0.16);
      petal.rotateZ(ang);
      petal.translate(Math.cos(ang) * 0.37, Math.sin(ang) * 0.37, -0.02);
      gunmetalGeos.push(petal);
    }
    const greebleMerged = mergeGeometries(gunmetalGeos);
    if (greebleMerged) {
      const gm = new THREE.Mesh(greebleMerged, mats.gunmetal);
      gm.castShadow = true;
      root.add(gm);
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

    // Ventral Maroon Belly Tank
    const bellyGeo = new THREE.SphereGeometry(0.45, 18, 12);
    bellyGeo.scale(0.68, 0.52, 1.85);
    bellyGeo.translate(0, -0.44, -2.2);
    const bellyMesh = new THREE.Mesh(bellyGeo, mats.maroon);
    bellyMesh.castShadow = true;
    root.add(bellyMesh);

    // 3. Intake Spinning Fan (28 angled blades) & Amber Bullet Nose Cone (z = -3.15 to -3.65)
    const fanGroup = new THREE.Group();
    fanGroup.position.set(0, 0, -3.1);
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
    root.add(fanGroup);

    const spinnerPts = [
      new THREE.Vector2(0.001, 0.55),
      new THREE.Vector2(0.11, 0.45),
      new THREE.Vector2(0.19, 0.25),
      new THREE.Vector2(0.21, 0.0),
    ];
    const spinnerGeo = new THREE.LatheGeometry(spinnerPts, 24);
    spinnerGeo.rotateX(-Math.PI / 2);
    spinnerGeo.translate(0, 0, -3.12);
    root.add(new THREE.Mesh(spinnerGeo, mats.spinner));

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
      flaps.push({ pivot, axis, sign: 1 });
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
    const tailSpike = new THREE.Mesh(tailSpikeGeo, mats.steel);
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

    // 8. Ventral Damping Thruster Nozzle & Cyan Cone
    const dampNozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.14, 0.12, 12),
      mats.gunmetal
    );
    dampNozzle.position.set(0, -0.52, -1.5);
    root.add(dampNozzle);

    const dampConeGeo = new THREE.ConeGeometry(0.28, 1.5, 14, 1, true);
    dampConeGeo.rotateX(Math.PI);
    dampConeGeo.translate(0, -0.75, 0);
    const damperCone = new THREE.Mesh(dampConeGeo, mats.damperJet);
    damperCone.position.set(0, -0.56, -1.5);
    damperCone.visible = false;
    root.add(damperCone);

    return {
      root,
      fanGroup,
      flaps,
      exhaustCore,
      exhaustOuter,
      reversePuff,
      emitterWorldDummy,
      pylonDummy,
      damperCone,
    };
  }

  private buildCockpit(mats: ReturnType<PodMeshBuilder['createMaterials']>): void {
    // Manta/teardrop silver-blue hull
    const hullPts = [
      new THREE.Vector2(0.001, -1.15),
      new THREE.Vector2(0.42, -0.9),
      new THREE.Vector2(0.68, -0.4),
      new THREE.Vector2(0.72, 0.25),
      new THREE.Vector2(0.48, 0.85),
      new THREE.Vector2(0.16, 1.15),
      new THREE.Vector2(0.001, 1.2),
    ];
    const hullGeo = new THREE.LatheGeometry(hullPts, 28);
    hullGeo.rotateX(Math.PI / 2);
    hullGeo.scale(1.12, 0.52, 1.0);
    const hullMesh = new THREE.Mesh(hullGeo, mats.cockpitSilver);
    hullMesh.castShadow = true;
    this.cockpitGroup.add(hullMesh);

    // Flared side winglets + yellow accents
    for (const s of [-1, 1]) {
      const wingGeo = new THREE.BoxGeometry(0.46, 0.07, 1.15);
      wingGeo.rotateZ(s * 0.42);
      wingGeo.rotateY(s * -0.18);
      wingGeo.translate(s * 0.72, 0.14, 0.05);
      const wing = new THREE.Mesh(wingGeo, mats.cockpitSilver);
      wing.castShadow = true;
      this.cockpitGroup.add(wing);

      const accentGeo = new THREE.BoxGeometry(0.16, 0.08, 0.55);
      accentGeo.rotateZ(s * 0.42);
      accentGeo.translate(s * 0.84, 0.20, 0.12);
      this.cockpitGroup.add(new THREE.Mesh(accentGeo, mats.yellow));

      // Two stern micro-antennas
      const antGeo = new THREE.CylinderGeometry(0.01, 0.015, 0.52, 6);
      antGeo.rotateX(-0.22);
      antGeo.translate(s * 0.24, 0.36, 0.92);
      this.cockpitGroup.add(new THREE.Mesh(antGeo, mats.steel));

      // Outrigger spreader arms for tethers
      const armGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.45, 8);
      armGeo.rotateZ(Math.PI / 2);
      armGeo.translate(s * 0.45, 0.02, -0.95);
      this.cockpitGroup.add(new THREE.Mesh(armGeo, mats.gunmetal));

      // Ventral cockpit damper cones
      const dampGeo = new THREE.ConeGeometry(0.22, 1.25, 12, 1, true);
      dampGeo.rotateX(Math.PI);
      dampGeo.translate(0, -0.62, 0);
      const dCone = new THREE.Mesh(dampGeo, mats.damperJet);
      dCone.position.set(s * 0.38, -0.25, 0.15);
      dCone.visible = false;
      this.cockpitGroup.add(dCone);
      this.cockpitDamperCones.push(dCone);
    }

    // Cobalt-blue nose chevron
    const chevGeo = new THREE.BoxGeometry(0.46, 0.09, 0.48);
    chevGeo.translate(0, 0.24, -0.62);
    this.cockpitGroup.add(new THREE.Mesh(chevGeo, mats.blue));

    // Bucket seat + windscreen lip
    const seatGeo = new THREE.BoxGeometry(0.42, 0.38, 0.48);
    seatGeo.translate(0, 0.22, 0.25);
    this.cockpitGroup.add(new THREE.Mesh(seatGeo, mats.seat));

    const screenGeo = new THREE.BoxGeometry(0.48, 0.16, 0.06);
    screenGeo.rotateX(-0.45);
    screenGeo.translate(0, 0.36, -0.24);
    this.cockpitGroup.add(new THREE.Mesh(screenGeo, mats.visor));

    // Pilot figure (torso + helmet + goggles)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.22), mats.maroon);
    torso.position.set(0, 0.42, 0.18);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 12), mats.cockpitSilver);
    helmet.position.set(0, 0.68, 0.15);
    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.14), mats.visor);
    goggles.position.set(0, 0.69, 0.05);
    this.cockpitPilotGroup.add(torso, helmet, goggles);
    this.cockpitGroup.add(this.cockpitPilotGroup);

    // Tether attachment dummies
    this.cockpitLeftArmDummy.position.set(-0.58, 0.02, -0.95);
    this.cockpitRightArmDummy.position.set(0.58, 0.02, -0.95);
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
}
