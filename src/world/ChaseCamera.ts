import * as THREE from 'three';
import type { PodTelemetry } from '../types';

export class ChaseCamera {
  private readonly currentPos = new THREE.Vector3();
  private readonly currentLook = new THREE.Vector3();
  private readonly desiredPos = new THREE.Vector3();
  private readonly desiredLook = new THREE.Vector3();
  private trauma = 0;

  public snapToPod(t: PodTelemetry): void {
    const fwdX = -Math.sin(t.yaw);
    const fwdZ = -Math.cos(t.yaw);
    this.currentPos.set(
      t.pos.x - fwdX * 10.8,
      t.pos.y + 4.4,
      t.pos.z - fwdZ * 10.8
    );
    this.currentLook.set(
      t.pos.x + fwdX * 14.0,
      t.pos.y + 1.4,
      t.pos.z + fwdZ * 14.0
    );
    this.trauma = 0;
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
      t.pos.x - fwdX * 10.6 + rightX * latOffset,
      t.pos.y + 4.35 - dropLook * 0.25,
      t.pos.z - fwdZ * 10.6 + rightZ * latOffset
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

    // Dynamic speed-driven FOV (62 deg at rest -> 84 deg at 288 km/h)
    const speedFrac = THREE.MathUtils.clamp(t.speedMs / 80, 0, 1);
    const targetFov = THREE.MathUtils.lerp(62, 84, speedFrac);
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.exp(-7 * dt));
      camera.updateProjectionMatrix();
    }
  }
}
