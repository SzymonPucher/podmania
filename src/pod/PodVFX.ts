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

const DUST_COUNT = 220;
const SPARK_COUNT = 180;
const FLAME_COUNT = 220;
const SMOKE_COUNT = 260;
const COOLANT_COUNT = 120;

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
  private readonly blastRing: THREE.Mesh;
  private blastAge = -1;
  private wreckFlameAccum = 0;
  private wreckSmokeAccum = 0;
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

    // Fiery orange-amber RUD shockwave ring
    const blastGeo = new THREE.RingGeometry(1.1, 2.5, 36);
    blastGeo.rotateX(-Math.PI / 2);
    const blastMat = new THREE.MeshBasicMaterial({
      color: 0xff6b1a,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.blastRing = new THREE.Mesh(blastGeo, blastMat);
    this.blastRing.visible = false;
    this.group.add(this.blastRing);
  }

  public setBiomeDustColor(biome: MapBiome): void {
    const mat = this.dustMesh.material as THREE.MeshBasicMaterial;
    const colors: Record<MapBiome, number> = {
      desert: 0xd9a873,
      volcanic: 0x573b36,
      glacier: 0xdbeafe,
      skyway: 0xe2e8f0,
      desert_geode: 0xeab36b,
      badlands: 0xa3b18a,
      starlight: 0x818cf8,
    };
    mat.color.setHex(colors[biome] ?? 0xd9a873);
  }

  public triggerShockwave(pos: THREE.Vector3, groundY: number): void {
    this.shockRing.position.set(pos.x, groundY + 0.25, pos.z);
    this.shockRing.scale.set(1, 1, 1);
    this.shockRing.visible = true;
    this.shockAge = 0;
  }

  public triggerSparks(pos: THREE.Vector3, count = 24, baseVel?: THREE.Vector3, speedScale = 1): void {
    const vx = baseVel ? baseVel.x * 0.45 : 0;
    const vy = baseVel ? baseVel.y * 0.35 : 0;
    const vz = baseVel ? baseVel.z * 0.45 : 0;
    for (let i = 0; i < count; i++) {
      const p = this.sparkPool[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % SPARK_COUNT;
      p.active = true;
      p.age = 0;
      p.life = 0.32 + Math.random() * 0.34;
      p.pos.copy(pos);
      p.vel.set(
        vx + (Math.random() - 0.5) * 26 * speedScale,
        vy + (4 + Math.random() * 15) * speedScale,
        vz + (Math.random() - 0.5) * 26 * speedScale
      );
      p.scale = (0.8 + Math.random() * 0.9) * Math.min(1.5, 0.75 + speedScale * 0.3);
    }
  }

  public triggerExplosionBurst(
    pos: THREE.Vector3,
    baseVel: THREE.Vector3,
    groundY: number,
    intensity = 1.0,
    emitCoolant = false
  ): void {
    // Fiery blast shockwave
    this.blastRing.position.set(pos.x, Math.max(groundY + 0.35, pos.y - 0.3), pos.z);
    this.blastRing.scale.set(1, 1, 1);
    this.blastRing.visible = true;
    this.blastAge = 0;

    // Dense fireball core
    const flameCount = Math.min(90, Math.round(48 * intensity));
    for (let i = 0; i < flameCount; i++) {
      const p = this.flamePool[this.flameCursor];
      this.flameCursor = (this.flameCursor + 1) % FLAME_COUNT;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const spd = (4 + Math.random() * 18) * intensity;
      p.active = true;
      p.age = 0;
      p.life = 0.38 + Math.random() * 0.48;
      p.pos.set(
        pos.x + (Math.random() - 0.5) * 1.8,
        pos.y + (Math.random() - 0.5) * 1.2,
        pos.z + (Math.random() - 0.5) * 1.8
      );
      p.vel.set(
        baseVel.x * 0.55 + Math.sin(phi) * Math.cos(theta) * spd,
        baseVel.y * 0.45 + Math.abs(Math.cos(phi)) * spd * 0.9 + 3.5,
        baseVel.z * 0.55 + Math.sin(phi) * Math.sin(theta) * spd
      );
      p.scale = (1.35 + Math.random() * 1.6) * Math.min(1.6, 0.8 + intensity * 0.35);
    }

    // Thick billowing dark smoke cloud
    const smokeCount = Math.min(90, Math.round(52 * intensity));
    for (let i = 0; i < smokeCount; i++) {
      const p = this.smokePool[this.smokeCursor];
      this.smokeCursor = (this.smokeCursor + 1) % SMOKE_COUNT;
      const theta = Math.random() * Math.PI * 2;
      const rSpd = (3 + Math.random() * 13) * intensity;
      p.active = true;
      p.age = 0;
      p.life = 0.85 + Math.random() * 1.15;
      p.pos.set(
        pos.x + (Math.random() - 0.5) * 2.2,
        pos.y + (Math.random() - 0.4) * 1.4,
        pos.z + (Math.random() - 0.5) * 2.2
      );
      p.vel.set(
        baseVel.x * 0.48 + Math.cos(theta) * rSpd,
        baseVel.y * 0.35 + 3.5 + Math.random() * 7.5,
        baseVel.z * 0.48 + Math.sin(theta) * rSpd
      );
      p.scale = (1.2 + Math.random() * 1.5) * Math.min(1.6, 0.85 + intensity * 0.3);
    }

    // High-energy spark shower
    this.triggerSparks(pos, Math.round(56 * intensity), baseVel, 1.35);

    // Ruptured cryo-coolant tank vapor burst if Cooled Engines equipped
    if (emitCoolant) {
      for (let i = 0; i < 48; i++) {
        const p = this.coolantPool[this.coolantCursor];
        this.coolantCursor = (this.coolantCursor + 1) % COOLANT_COUNT;
        p.active = true;
        p.age = 0;
        p.life = 0.55 + Math.random() * 0.55;
        p.pos.copy(pos);
        p.vel.set(
          baseVel.x * 0.5 + (Math.random() - 0.5) * 22,
          baseVel.y * 0.4 + 2 + Math.random() * 12,
          baseVel.z * 0.5 + (Math.random() - 0.5) * 22
        );
        p.scale = 1.1 + Math.random() * 1.2;
      }
    }
  }

  public emitWreckTrail(
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    flameRate: number,
    smokeRate: number,
    dt: number
  ): void {
    this.wreckFlameAccum += flameRate * dt;
    while (this.wreckFlameAccum >= 1) {
      this.wreckFlameAccum -= 1;
      const p = this.flamePool[this.flameCursor];
      this.flameCursor = (this.flameCursor + 1) % FLAME_COUNT;
      p.active = true;
      p.age = 0;
      p.life = 0.22 + Math.random() * 0.26;
      p.pos.set(
        pos.x + (Math.random() - 0.5) * 0.55,
        pos.y + (Math.random() - 0.5) * 0.55,
        pos.z + (Math.random() - 0.5) * 0.55
      );
      p.vel.set(
        vel.x * 0.35 + (Math.random() - 0.5) * 4.5,
        vel.y * 0.3 + 2.5 + Math.random() * 4.0,
        vel.z * 0.35 + (Math.random() - 0.5) * 4.5
      );
      p.scale = 0.75 + Math.random() * 0.75;
    }

    this.wreckSmokeAccum += smokeRate * dt;
    while (this.wreckSmokeAccum >= 1) {
      this.wreckSmokeAccum -= 1;
      const p = this.smokePool[this.smokeCursor];
      this.smokeCursor = (this.smokeCursor + 1) % SMOKE_COUNT;
      p.active = true;
      p.age = 0;
      p.life = 0.75 + Math.random() * 0.85;
      p.pos.set(
        pos.x + (Math.random() - 0.5) * 0.65,
        pos.y + 0.15 + (Math.random() - 0.5) * 0.5,
        pos.z + (Math.random() - 0.5) * 0.65
      );
      p.vel.set(
        vel.x * 0.28 + (Math.random() - 0.5) * 3.6,
        vel.y * 0.22 + 3.0 + Math.random() * 3.8,
        vel.z * 0.28 + (Math.random() - 0.5) * 3.6
      );
      p.scale = 0.9 + Math.random() * 0.85;
    }
  }

  public triggerGroundBounceVfx(
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    groundY: number,
    impactSpeed: number
  ): void {
    const sparkCnt = Math.min(22, Math.max(4, Math.round(impactSpeed * 0.65)));
    this.triggerSparks(pos, sparkCnt, vel, Math.min(1.3, 0.55 + impactSpeed * 0.03));

    const dustCnt = Math.min(14, Math.max(3, Math.round(impactSpeed * 0.45)));
    for (let i = 0; i < dustCnt; i++) {
      const p = this.dustPool[this.dustCursor];
      this.dustCursor = (this.dustCursor + 1) % DUST_COUNT;
      p.active = true;
      p.age = 0;
      p.life = 0.5 + Math.random() * 0.4;
      p.pos.set(
        pos.x + (Math.random() - 0.5) * 1.1,
        groundY + 0.28,
        pos.z + (Math.random() - 0.5) * 1.1
      );
      p.vel.set(
        vel.x * 0.25 + (Math.random() - 0.5) * 7,
        2.0 + Math.random() * 4.5,
        vel.z * 0.25 + (Math.random() - 0.5) * 7
      );
      p.scale = 0.85 + Math.random() * 0.95;
    }
  }

  public clearAll(): void {
    this.dummy.scale.set(0, 0, 0);
    this.dummy.updateMatrix();
    const pools: Array<{ pool: Particle[]; mesh: THREE.InstancedMesh }> = [
      { pool: this.dustPool, mesh: this.dustMesh },
      { pool: this.sparkPool, mesh: this.sparkMesh },
      { pool: this.flamePool, mesh: this.flameMesh },
      { pool: this.smokePool, mesh: this.smokeMesh },
      { pool: this.coolantPool, mesh: this.coolantMesh },
    ];
    for (const { pool, mesh } of pools) {
      for (let i = 0; i < pool.length; i++) {
        pool[i].active = false;
        mesh.setMatrixAt(i, this.dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    this.shockAge = -1;
    this.shockRing.visible = false;
    this.blastAge = -1;
    this.blastRing.visible = false;
    this.wreckFlameAccum = 0;
    this.wreckSmokeAccum = 0;
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

    this.stepParticlesOnly(dt);
  }

  public stepParticlesOnly(dt: number): void {
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

    // Update RUD fiery blast ring
    if (this.blastAge >= 0) {
      this.blastAge += dt;
      const dur = 0.58;
      if (this.blastAge >= dur) {
        this.blastAge = -1;
        this.blastRing.visible = false;
      } else {
        const u = this.blastAge / dur;
        const s = 1 + Math.pow(u, 0.72) * 7.8;
        this.blastRing.scale.set(s, s, s);
        (this.blastRing.material as THREE.MeshBasicMaterial).opacity =
          Math.pow(1 - u, 1.35) * 0.92;
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
