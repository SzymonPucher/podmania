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

export class PodVFX {
  public readonly group = new THREE.Group();

  private readonly dustMesh: THREE.InstancedMesh;
  private readonly dustPool: Particle[] = [];
  private dustCursor = 0;
  private dustSpawnAccum = 0;

  private readonly sparkMesh: THREE.InstancedMesh;
  private readonly sparkPool: Particle[] = [];
  private sparkCursor = 0;

  private readonly shockRing: THREE.Mesh;
  private shockAge = -1;
  private overloadSparkAccum = 0;

  private readonly dummy = new THREE.Object3D();
  private readonly tmpRight = new THREE.Vector3();
  private readonly tmpSparkPos = new THREE.Vector3();

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
}
