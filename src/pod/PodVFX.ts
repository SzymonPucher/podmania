import * as THREE from 'three';
import type { MapBiome, PodTelemetry } from '../types';

interface Particle {
  active: boolean;
  age: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  scale: number;
}

const DUST_COUNT = 160;
const SPARK_COUNT = 80;
const FLAME_COUNT = 120;
const SMOKE_COUNT = 120;
const COOLANT_COUNT = 100;

export class PodVFX {
  public readonly group = new THREE.Group();

  private readonly dustMesh: THREE.InstancedMesh;
  private readonly dustPool: Particle[] = [];
  private dustCursor = 0;
  private dustSpawnAccum = 0;

  private readonly sparkMesh: THREE.InstancedMesh;
  private readonly sparkPool: Particle[] = [];
  private sparkCursor = 0;

  private readonly flameMesh: THREE.InstancedMesh;
  private readonly flamePool: Particle[] = [];
  private flameCursor = 0;
  private flameAccumLeft = 0;
  private flameAccumRight = 0;

  private readonly smokeMesh: THREE.InstancedMesh;
  private readonly smokePool: Particle[] = [];
  private smokeCursor = 0;
  private smokeAccumLeft = 0;
  private smokeAccumRight = 0;

  private readonly coolantMesh: THREE.InstancedMesh;
  private readonly coolantPool: Particle[] = [];
  private coolantCursor = 0;
  private coolantAccum = 0;
  private nitroSparkAccum = 0;

  private readonly shockRing: THREE.Mesh;
  private shockAge = -1;
  private overloadSparkAccum = 0;

  private readonly dummy = new THREE.Object3D();
  private readonly tmpRight = new THREE.Vector3();
  private readonly tmpSparkPos = new THREE.Vector3();
  private readonly tmpFlameColor = new THREE.Color();
  private readonly flameHotColor = new THREE.Color(0xffee66);
  private readonly flameMidColor = new THREE.Color(0xff5500);
  private readonly flameCoolColor = new THREE.Color(0x991100);

  constructor() {
    const dustGeo = new THREE.DodecahedronGeometry(0.45, 0);
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0xd9a873,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.dustMesh = new THREE.InstancedMesh(dustGeo, dustMat, DUST_COUNT);
    this.dustMesh.frustumCulled = false;
    this.group.add(this.dustMesh);

    for (let i = 0; i < DUST_COUNT; i++) {
      this.dustPool.push({
        active: false,
        age: 0,
        life: 0.6,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        scale: 1,
      });
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.dustMesh.setMatrixAt(i, this.dummy.matrix);
    }

    const sparkGeo = new THREE.BoxGeometry(0.1, 0.1, 0.45);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    this.sparkMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, SPARK_COUNT);
    this.sparkMesh.frustumCulled = false;
    this.group.add(this.sparkMesh);

    for (let i = 0; i < SPARK_COUNT; i++) {
      this.sparkPool.push({
        active: false,
        age: 0,
        life: 0.45,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        scale: 1,
      });
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
    }

    const flameGeo = new THREE.DodecahedronGeometry(0.32, 0);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    this.flameMesh = new THREE.InstancedMesh(flameGeo, flameMat, FLAME_COUNT);
    this.flameMesh.frustumCulled = false;
    this.group.add(this.flameMesh);

    for (let i = 0; i < FLAME_COUNT; i++) {
      this.flamePool.push({
        active: false,
        age: 0,
        life: 0.35,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        scale: 1,
      });
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.flameMesh.setMatrixAt(i, this.dummy.matrix);
      this.flameMesh.setColorAt(i, this.flameHotColor);
    }

    const smokeGeo = new THREE.DodecahedronGeometry(0.42, 0);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0x383d46,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });
    this.smokeMesh = new THREE.InstancedMesh(smokeGeo, smokeMat, SMOKE_COUNT);
    this.smokeMesh.frustumCulled = false;
    this.group.add(this.smokeMesh);

    for (let i = 0; i < SMOKE_COUNT; i++) {
      this.smokePool.push({
        active: false,
        age: 0,
        life: 0.7,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        scale: 1,
      });
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.smokeMesh.setMatrixAt(i, this.dummy.matrix);
    }

    // Icy cyan cryo-coolant vapor mist
    const coolantGeo = new THREE.DodecahedronGeometry(0.36, 0);
    const coolantMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });
    this.coolantMesh = new THREE.InstancedMesh(coolantGeo, coolantMat, COOLANT_COUNT);
    this.coolantMesh.frustumCulled = false;
    this.group.add(this.coolantMesh);

    for (let i = 0; i < COOLANT_COUNT; i++) {
      this.coolantPool.push({
        active: false,
        age: 0,
        life: 0.5,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        scale: 1,
      });
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.coolantMesh.setMatrixAt(i, this.dummy.matrix);
    }

    // Cyan landing shockwave ring
    const ringGeo = new THREE.RingGeometry(1.4, 2.3, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.shockRing = new THREE.Mesh(ringGeo, ringMat);
    this.shockRing.visible = false;
    this.group.add(this.shockRing);
  }

  public setBiomeDustColor(biome: MapBiome): void {
    const mat = this.dustMesh.material as THREE.MeshBasicMaterial;
    const colors: Record<MapBiome, number> = {
      desert: 0xd9a873,
      volcanic: 0x573b36,
      glacier: 0xdbeafe,
      skyway: 0xe2e8f0,
      desert_geode: 0xeab36b,
    };
    mat.color.setHex(colors[biome] ?? 0xd9a873);
  }

  public triggerShockwave(pos: THREE.Vector3, groundY: number): void {
    this.shockRing.position.set(pos.x, groundY + 0.25, pos.z);
    this.shockRing.scale.set(1, 1, 1);
    this.shockRing.visible = true;
    this.shockAge = 0;
  }

  public triggerSparks(pos: THREE.Vector3, count = 24): void {
    for (let i = 0; i < count; i++) {
      const p = this.sparkPool[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % SPARK_COUNT;
      p.active = true;
      p.age = 0;
      p.life = 0.3 + Math.random() * 0.25;
      p.pos.copy(pos);
      p.vel.set(
        (Math.random() - 0.5) * 24,
        4 + Math.random() * 14,
        (Math.random() - 0.5) * 24
      );
      p.scale = 0.8 + Math.random() * 0.8;
    }
  }

  public update(t: PodTelemetry, dt: number): void {
    // Overheated engine flame-spitting bursts (per engine)
    this.flameAccumLeft = this.updateEngineOverheatFlames(
      t,
      -1.35,
      t.overheatedLeft,
      this.flameAccumLeft,
      dt
    );
    this.flameAccumRight = this.updateEngineOverheatFlames(
      t,
      1.35,
      t.overheatedRight,
      this.flameAccumRight,
      dt
    );

    // Dark smoke when engine heat is above 80%
    this.smokeAccumLeft = this.updateEngineHeatSmoke(
      t,
      -1.35,
      t.heatLeft,
      this.smokeAccumLeft,
      dt
    );
    this.smokeAccumRight = this.updateEngineHeatSmoke(
      t,
      1.35,
      t.heatRight,
      this.smokeAccumRight,
      dt
    );

    // Cryo-coolant vapor mist from engine vents while coolant is active
    if (t.coolantActive) {
      this.coolantAccum += dt * 42;
      this.tmpRight.set(Math.cos(t.yaw), 0, -Math.sin(t.yaw));
      const fwdX = -Math.sin(t.yaw);
      const fwdZ = -Math.cos(t.yaw);
      while (this.coolantAccum >= 1) {
        this.coolantAccum -= 1;
        for (const side of [-1.35, 1.35]) {
          const p = this.coolantPool[this.coolantCursor];
          this.coolantCursor = (this.coolantCursor + 1) % COOLANT_COUNT;
          p.active = true;
          p.age = 0;
          p.life = 0.35 + Math.random() * 0.2;
          p.pos.set(
            t.pos.x + this.tmpRight.x * side + fwdX * 1.2 + (Math.random() - 0.5) * 0.4,
            t.pos.y + 0.35 + (Math.random() - 0.5) * 0.25,
            t.pos.z + this.tmpRight.z * side + fwdZ * 1.2 + (Math.random() - 0.5) * 0.4
          );
          p.vel.set(
            t.vel.x * 0.5 - fwdX * (5 + Math.random() * 4) + (Math.random() - 0.5) * 4,
            t.vel.y * 0.4 + 2.2 + Math.random() * 2.4,
            t.vel.z * 0.5 - fwdZ * (5 + Math.random() * 4) + (Math.random() - 0.5) * 4
          );
          p.scale = 0.65 + Math.random() * 0.55;
        }
      }
    } else {
      this.coolantAccum = 0;
    }

    // Nitro exhaust spark embers while nitro is burning
    if (t.nitroActive) {
      this.nitroSparkAccum += dt * 34;
      this.tmpRight.set(Math.cos(t.yaw), 0, -Math.sin(t.yaw));
      const fwdX = -Math.sin(t.yaw);
      const fwdZ = -Math.cos(t.yaw);
      while (this.nitroSparkAccum >= 1) {
        this.nitroSparkAccum -= 1;
        const side = Math.random() < 0.5 ? -1.35 : 1.35;
        this.tmpSparkPos.set(
          t.pos.x + this.tmpRight.x * side - fwdX * 0.4,
          t.pos.y + (Math.random() - 0.5) * 0.3,
          t.pos.z + this.tmpRight.z * side - fwdZ * 0.4
        );
        this.triggerSparks(this.tmpSparkPos, 1);
      }
    } else {
      this.nitroSparkAccum = 0;
    }

    // Mid-air engine overload sparks when player applies thrust high up
    if (t.airborneOverload) {
      this.overloadSparkAccum += dt * 38;
      this.tmpRight.set(Math.cos(t.yaw), 0, -Math.sin(t.yaw));
      const fwdX = -Math.sin(t.yaw);
      const fwdZ = -Math.cos(t.yaw);
      while (this.overloadSparkAccum >= 1) {
        this.overloadSparkAccum -= 1;
        const side = Math.random() < 0.5 ? -1.35 : 1.35;
        this.tmpSparkPos.set(
          t.pos.x + this.tmpRight.x * side + fwdX * 1.5,
          t.pos.y + 0.2,
          t.pos.z + this.tmpRight.z * side + fwdZ * 1.5
        );
        this.triggerSparks(this.tmpSparkPos, 2);
      }
    } else {
      this.overloadSparkAccum = 0;
    }

    // Spawn twin dust ribbons beneath engines when hovering close to dirt
    if (t.clearance < 3.0 && t.speedMs > 8) {
      this.dustSpawnAccum += dt * (20 + t.speedMs * 0.8);
      this.tmpRight.set(Math.cos(t.yaw), 0, -Math.sin(t.yaw));
      const fwdX = -Math.sin(t.yaw);
      const fwdZ = -Math.cos(t.yaw);

      while (this.dustSpawnAccum >= 1) {
        this.dustSpawnAccum -= 1;
        for (const side of [-1.35, 1.35]) {
          const p = this.dustPool[this.dustCursor];
          this.dustCursor = (this.dustCursor + 1) % DUST_COUNT;
          p.active = true;
          p.age = 0;
          p.life = 0.45 + Math.random() * 0.25;
          p.pos.set(
            t.pos.x + this.tmpRight.x * side + fwdX * 1.4 + (Math.random() - 0.5) * 0.6,
            t.groundHeight + 0.3,
            t.pos.z + this.tmpRight.z * side + fwdZ * 1.4 + (Math.random() - 0.5) * 0.6
          );
          p.vel.set(
            (Math.random() - 0.5) * 4,
            1.6 + Math.random() * 2.2,
            (Math.random() - 0.5) * 4
          );
          p.scale = 0.7 + Math.random() * 0.7;
        }
      }
    }

    // Update dust pool
    for (let i = 0; i < DUST_COUNT; i++) {
      const p = this.dustPool[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        this.dummy.scale.set(0, 0, 0);
      } else {
        p.pos.addScaledVector(p.vel, dt);
        const u = p.age / p.life;
        const s = p.scale * (1 + u * 2.1) * (1 - u);
        this.dummy.position.copy(p.pos);
        this.dummy.rotation.set(u * 2, u * 3, 0);
        this.dummy.scale.set(s, s, s);
      }
      this.dummy.updateMatrix();
      this.dustMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.dustMesh.instanceMatrix.needsUpdate = true;

    // Update spark pool
    for (let i = 0; i < SPARK_COUNT; i++) {
      const p = this.sparkPool[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        this.dummy.scale.set(0, 0, 0);
      } else {
        p.vel.y -= 26 * dt;
        p.pos.addScaledVector(p.vel, dt);
        const u = p.age / p.life;
        const s = p.scale * (1 - u);
        this.dummy.position.copy(p.pos);
        this.dummy.lookAt(
          p.pos.x + p.vel.x,
          p.pos.y + p.vel.y,
          p.pos.z + p.vel.z
        );
        this.dummy.scale.set(s, s, s);
      }
      this.dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.sparkMesh.instanceMatrix.needsUpdate = true;

    // Update flame pool
    for (let i = 0; i < FLAME_COUNT; i++) {
      const p = this.flamePool[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        this.dummy.scale.set(0, 0, 0);
      } else {
        p.vel.y += 6.5 * dt;
        p.pos.addScaledVector(p.vel, dt);
        const u = p.age / p.life;
        const s = p.scale * (0.75 + u * 1.1) * (1 - u * 0.88);
        this.dummy.position.copy(p.pos);
        this.dummy.rotation.set(u * 4, u * 5, u * 2);
        this.dummy.scale.set(s, s, s);
        if (u < 0.45) {
          this.tmpFlameColor.copy(this.flameHotColor).lerp(this.flameMidColor, u / 0.45);
        } else {
          this.tmpFlameColor.copy(this.flameMidColor).lerp(this.flameCoolColor, (u - 0.45) / 0.55);
        }
        this.flameMesh.setColorAt(i, this.tmpFlameColor);
      }
      this.dummy.updateMatrix();
      this.flameMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.flameMesh.instanceMatrix.needsUpdate = true;
    if (this.flameMesh.instanceColor) {
      this.flameMesh.instanceColor.needsUpdate = true;
    }

    // Update smoke pool
    for (let i = 0; i < SMOKE_COUNT; i++) {
      const p = this.smokePool[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        this.dummy.scale.set(0, 0, 0);
      } else {
        p.vel.y += 4.5 * dt;
        p.pos.addScaledVector(p.vel, dt);
        const u = p.age / p.life;
        const s = p.scale * (0.8 + u * 2.1) * (1 - u * 0.9);
        this.dummy.position.copy(p.pos);
        this.dummy.rotation.set(u * 1.8, u * 2.4, 0);
        this.dummy.scale.set(s, s, s);
      }
      this.dummy.updateMatrix();
      this.smokeMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.smokeMesh.instanceMatrix.needsUpdate = true;

    // Update coolant vapor pool
    for (let i = 0; i < COOLANT_COUNT; i++) {
      const p = this.coolantPool[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        this.dummy.scale.set(0, 0, 0);
      } else {
        p.pos.addScaledVector(p.vel, dt);
        const u = p.age / p.life;
        const s = p.scale * (0.7 + u * 2.0) * (1 - u);
        this.dummy.position.copy(p.pos);
        this.dummy.rotation.set(u * 2.5, u * 3.1, 0);
        this.dummy.scale.set(s, s, s);
      }
      this.dummy.updateMatrix();
      this.coolantMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.coolantMesh.instanceMatrix.needsUpdate = true;

    // Update shockwave ring
    if (this.shockAge >= 0) {
      this.shockAge += dt;
      const dur = 0.42;
      if (this.shockAge >= dur) {
        this.shockAge = -1;
        this.shockRing.visible = false;
      } else {
        const u = this.shockAge / dur;
        const s = 1 + u * 5.2;
        this.shockRing.scale.set(s, s, s);
        (this.shockRing.material as THREE.MeshBasicMaterial).opacity = (1 - u) * 0.9;
      }
    }
  }

  private updateEngineOverheatFlames(
    t: PodTelemetry,
    sideX: number,
    overheated: boolean,
    accum: number,
    dt: number
  ): number {
    if (!overheated) {
      return 0;
    }

    let nextAccum = accum + dt * 44;
    this.tmpRight.set(Math.cos(t.yaw), 0, -Math.sin(t.yaw));
    const fwdX = -Math.sin(t.yaw);
    const fwdZ = -Math.cos(t.yaw);
    const cosR = Math.cos(t.roll);
    const sinR = Math.sin(t.roll);
    const latOffset = sideX * cosR;
    const vertOffset = sideX * sinR;

    while (nextAccum >= 1) {
      nextAccum -= 1;
      const p = this.flamePool[this.flameCursor];
      this.flameCursor = (this.flameCursor + 1) % FLAME_COUNT;

      // Alternate between spitting out the rear exhaust and side/top cooling vents
      const fromVent = Math.random() < 0.35;
      const zLocal = fromVent ? -1.4 - Math.random() * 0.9 : 0.15;

      p.active = true;
      p.age = 0;
      p.life = 0.24 + Math.random() * 0.22;
      p.pos.set(
        t.pos.x + this.tmpRight.x * latOffset - fwdX * zLocal + (Math.random() - 0.5) * 0.35,
        t.pos.y + vertOffset + (fromVent ? 0.35 : 0) + (Math.random() - 0.5) * 0.3,
        t.pos.z + this.tmpRight.z * latOffset - fwdZ * zLocal + (Math.random() - 0.5) * 0.35
      );

      const spitBackSpeed = fromVent ? 4 + Math.random() * 6 : 12 + Math.random() * 14;
      p.vel.set(
        t.vel.x * 0.65 - fwdX * spitBackSpeed + (Math.random() - 0.5) * 6,
        t.vel.y * 0.5 + (fromVent ? 4 + Math.random() * 5 : (Math.random() - 0.3) * 4),
        t.vel.z * 0.65 - fwdZ * spitBackSpeed + (Math.random() - 0.5) * 6
      );
      p.scale = fromVent ? 0.75 + Math.random() * 0.6 : 1.05 + Math.random() * 0.85;

      if (Math.random() < 0.2) {
        this.triggerSparks(p.pos, 1);
      }
    }

    return nextAccum;
  }

  private updateEngineHeatSmoke(
    t: PodTelemetry,
    sideX: number,
    heat: number,
    accum: number,
    dt: number
  ): number {
    if (heat <= 80) {
      return 0;
    }

    const intensity = Math.min(1, (heat - 80) / 20);
    let nextAccum = accum + dt * (20 + intensity * 24);
    this.tmpRight.set(Math.cos(t.yaw), 0, -Math.sin(t.yaw));
    const fwdX = -Math.sin(t.yaw);
    const fwdZ = -Math.cos(t.yaw);
    const cosR = Math.cos(t.roll);
    const sinR = Math.sin(t.roll);
    const latOffset = sideX * cosR;
    const vertOffset = sideX * sinR;

    while (nextAccum >= 1) {
      nextAccum -= 1;
      const p = this.smokePool[this.smokeCursor];
      this.smokeCursor = (this.smokeCursor + 1) % SMOKE_COUNT;

      const zLocal = -0.35 - Math.random() * 1.6;
      p.active = true;
      p.age = 0;
      p.life = 0.55 + Math.random() * 0.35;
      p.pos.set(
        t.pos.x + this.tmpRight.x * latOffset - fwdX * zLocal + (Math.random() - 0.5) * 0.4,
        t.pos.y + vertOffset + 0.28 + (Math.random() - 0.5) * 0.25,
        t.pos.z + this.tmpRight.z * latOffset - fwdZ * zLocal + (Math.random() - 0.5) * 0.4
      );
      p.vel.set(
        t.vel.x * 0.55 - fwdX * (4 + Math.random() * 5) + (Math.random() - 0.5) * 3.5,
        t.vel.y * 0.45 + 2.8 + Math.random() * 3.2,
        t.vel.z * 0.55 - fwdZ * (4 + Math.random() * 5) + (Math.random() - 0.5) * 3.5
      );
      p.scale = (0.75 + Math.random() * 0.65) * (0.7 + intensity * 0.5);
    }

    return nextAccum;
  }
}
