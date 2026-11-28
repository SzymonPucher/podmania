import * as THREE from 'three';
import type { PodTelemetry } from '../types';
import type { TrackBuilder } from './TrackBuilder';

export class ChaseCamera {
  private readonly currentPos = new THREE.Vector3();
  private readonly currentLook = new THREE.Vector3();
  private readonly desiredPos = new THREE.Vector3();
  private readonly desiredLook = new THREE.Vector3();
  private readonly wreckTrailDir = new THREE.Vector3(0, 0, 1);
  private readonly dummyVel = new THREE.Vector3();
  private trauma = 0;
  private wreckDirInitialized = false;

  public snapToPod(t: PodTelemetry): void {
    const fwdX = -Math.sin(t.yaw);
    const fwdZ = -Math.cos(t.yaw);
    this.currentPos.set(
      t.pos.x - fwdX * 12.6,
      t.pos.y + 4.6,
      t.pos.z - fwdZ * 12.6
    );
    this.currentLook.set(
      t.pos.x + fwdX * 14.0,
      t.pos.y + 1.4,
      t.pos.z + fwdZ * 14.0
    );
    this.trauma = 0;
    this.wreckDirInitialized = false;
  }

  public addTrauma(amount: number): void {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  public update(camera: THREE.PerspectiveCamera, t: PodTelemetry, dt: number): void {
    const fwdX = -Math.sin(t.yaw);
    const fwdZ = -Math.cos(t.yaw);
    const rightX = Math.cos(t.yaw);
    const rightZ = -Math.sin(t.yaw);

    // Subtle lateral lag when carving corners + vertical drop lookahead
    const latOffset = -t.roll * 1.35;
    const dropLook = THREE.MathUtils.clamp(t.vel.y * 0.14, -4.5, 2.5);

    this.desiredPos.set(
      t.pos.x - fwdX * 12.4 + rightX * latOffset,
      t.pos.y + 4.55 - dropLook * 0.25,
      t.pos.z - fwdZ * 12.4 + rightZ * latOffset
    );

    this.desiredLook.set(
      t.pos.x + fwdX * 16.0,
      t.pos.y + 1.35 + dropLook,
      t.pos.z + fwdZ * 16.0
    );

    const posAlpha = 1 - Math.exp(-10.5 * dt);
    const lookAlpha = 1 - Math.exp(-14.0 * dt);
    this.currentPos.lerp(this.desiredPos, posAlpha);
    this.currentLook.lerp(this.desiredLook, lookAlpha);
    this.wreckDirInitialized = false;

    camera.position.copy(this.currentPos);

    // Trauma shake
    if (this.trauma > 0.001) {
      const shake = this.trauma * this.trauma * 0.75;
      camera.position.x += (Math.random() - 0.5) * 2 * shake;
      camera.position.y += (Math.random() - 0.5) * 2 * shake;
      camera.position.z += (Math.random() - 0.5) * 2 * shake;
      this.trauma = Math.max(0, this.trauma - dt * 2.2);
    }

    camera.lookAt(this.currentLook);

    // Dynamic speed-driven FOV (62 deg at rest -> 84 deg at 288 km/h -> 93 deg during vector boost / nitro!)
    const speedFrac = THREE.MathUtils.clamp(t.speedMs / 80, 0, 1);
    const overSpeedFrac = THREE.MathUtils.clamp((t.speedMs - 80) / 34, 0, 1);
    const boostFovFactor = Math.max(
      overSpeedFrac,
      t.landingBoost * 0.75,
      t.nitroActive ? 0.85 : 0
    );
    const portraitFovBoost =
      camera.aspect < 1 ? THREE.MathUtils.clamp((1 - camera.aspect) * 28, 0, 18) : 0;
    const targetFov = Math.min(
      104,
      THREE.MathUtils.lerp(62, 84, speedFrac) + boostFovFactor * 9.0 + portraitFovBoost
    );
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.exp(-7.5 * dt));
      camera.updateProjectionMatrix();
    }
  }

  public updateWreckCamera(
    camera: THREE.PerspectiveCamera,
    focusPos: THREE.Vector3,
    focusVel: THREE.Vector3,
    track: TrackBuilder,
    wreckElapsed: number,
    dt: number
  ): void {
    if (!this.wreckDirInitialized) {
      this.wreckTrailDir.copy(this.currentPos).sub(focusPos);
      this.wreckTrailDir.y = 0;
      if (this.wreckTrailDir.lengthSq() < 0.01) {
        this.wreckTrailDir.set(0, 0, 1);
      } else {
        this.wreckTrailDir.normalize();
      }
      this.wreckDirInitialized = true;
    }

    const horizSpd = Math.hypot(focusVel.x, focusVel.z);
    if (horizSpd > 6.0) {
      // Trail smoothly behind the moving debris field
      this.desiredPos.set(-focusVel.x / horizSpd, 0, -focusVel.z / horizSpd);
      this.wreckTrailDir.lerp(this.desiredPos, 1 - Math.exp(-2.8 * dt)).normalize();
    } else {
      // Gentle cinematic survey orbit as wreckage settles
      const orbitAng = 0.34 * dt;
      const ca = Math.cos(orbitAng);
      const sa = Math.sin(orbitAng);
      const nx = this.wreckTrailDir.x * ca - this.wreckTrailDir.z * sa;
      const nz = this.wreckTrailDir.x * sa + this.wreckTrailDir.z * ca;
      this.wreckTrailDir.set(nx, 0, nz).normalize();
    }

    const pullBack = THREE.MathUtils.lerp(13.5, 17.5, Math.min(1, wreckElapsed / 2.4));
    const liftHeight = THREE.MathUtils.lerp(5.2, 7.6, Math.min(1, wreckElapsed / 2.4));

    this.desiredPos.set(
      focusPos.x + this.wreckTrailDir.x * pullBack,
      focusPos.y + liftHeight - THREE.MathUtils.clamp(focusVel.y * 0.12, -4.5, 1.5),
      focusPos.z + this.wreckTrailDir.z * pullBack
    );

    // Keep crash camera safely inside canyon walls, below cave roofs, and above terrain
    this.dummyVel.set(0, 0, 0);
    track.resolveWallAndCeilingCollision(this.desiredPos, this.dummyVel, 1.8);
    const camGround = track.sampleGround(
      this.desiredPos.x,
      this.desiredPos.y,
      this.desiredPos.z
    );
    if (
      camGround.found &&
      this.desiredPos.y < camGround.groundY + 2.2 &&
      camGround.groundY - focusPos.y < 14.0
    ) {
      this.desiredPos.y = camGround.groundY + 2.2;
    }

    this.desiredLook.set(
      focusPos.x + focusVel.x * 0.08,
      focusPos.y + 0.65,
      focusPos.z + focusVel.z * 0.08
    );

    this.currentPos.lerp(this.desiredPos, 1 - Math.exp(-5.5 * dt));
    this.currentLook.lerp(this.desiredLook, 1 - Math.exp(-9.5 * dt));

    camera.position.copy(this.currentPos);

    if (this.trauma > 0.001) {
      const shake = this.trauma * this.trauma * 0.85;
      camera.position.x += (Math.random() - 0.5) * 2.2 * shake;
      camera.position.y += (Math.random() - 0.5) * 2.2 * shake;
      camera.position.z += (Math.random() - 0.5) * 2.2 * shake;
      this.trauma = Math.max(0, this.trauma - dt * 1.85);
    }

    camera.lookAt(this.currentLook);

    const targetFov = 68;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.exp(-4.5 * dt));
      camera.updateProjectionMatrix();
    }
  }
}
