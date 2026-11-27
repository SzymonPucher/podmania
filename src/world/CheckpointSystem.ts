import * as THREE from 'three';
import type { CheckpointMarkerData, TrackBuilder } from '../world/TrackBuilder';

interface GateVisual {
  data: CheckpointMarkerData;
  group: THREE.Group;
  ringMat: THREE.MeshBasicMaterial;
  beamMat: THREE.MeshBasicMaterial;
}

export interface CheckpointSnapshot {
  pos: THREE.Vector3;
  yaw: number;
  pitch: number;
  modTankSec: number;
}

export class CheckpointSystem {
  public readonly group = new THREE.Group();
  public readonly totalCheckpoints: number;

  private readonly gates: GateVisual[] = [];
  private nextCpIndex = 0;
  private splitsMs: number[] = [];
  private lastSnapshot: CheckpointSnapshot;
  private prevPodPos = new THREE.Vector3();

  constructor(track: TrackBuilder) {
    this.totalCheckpoints = track.checkpoints.filter((c) => !c.isFinish).length;

    const start = track.startSlice;
    const startYaw = Math.atan2(-start.tangent.x, -start.tangent.z);
    this.lastSnapshot = {
      pos: new THREE.Vector3(start.center.x, start.center.y + 1.85, start.center.z),
      yaw: startYaw,
      pitch: 0,
      modTankSec: 0,
    };

    // Start arch
    this.buildStartArch(start.center, start.tangent, start.canyonWidth);

    // Checkpoints + Finish arch
    for (const cp of track.checkpoints) {
      const gate = this.buildGateArch(cp);
      this.gates.push(gate);
      this.group.add(gate.group);
    }

    this.refreshGateColors();
  }

  public reset(startPos: THREE.Vector3, startYaw: number, modTankSec = 0): void {
    this.nextCpIndex = 0;
    this.splitsMs = [];
    this.lastSnapshot = {
      pos: startPos.clone(),
      yaw: startYaw,
      pitch: 0,
      modTankSec,
    };
    this.prevPodPos.copy(startPos);
    this.refreshGateColors();
  }

  public getSnapshot(): CheckpointSnapshot {
    return {
      pos: this.lastSnapshot.pos.clone(),
      yaw: this.lastSnapshot.yaw,
      pitch: this.lastSnapshot.pitch,
      modTankSec: this.lastSnapshot.modTankSec,
    };
  }

  public getCurrentCpNumber(): number {
    return Math.min(this.nextCpIndex, this.totalCheckpoints);
  }

  public getSplits(): number[] {
    return this.splitsMs;
  }

  public update(
    podPos: THREE.Vector3,
    raceTimeMs: number,
    modTankSec = 0
  ): {
    crossedCp: number | null;
    finished: boolean;
    splitTimeMs: number | null;
  } {
    const activeGate = this.gates[this.nextCpIndex];
    if (!activeGate) {
      this.prevPodPos.copy(podPos);
      return { crossedCp: null, finished: false, splitTimeMs: null };
    }

    const cp = activeGate.data;
    // Plane crossing test against gate position & tangent
    const prevDot =
      (this.prevPodPos.x - cp.position.x) * cp.tangent.x +
      (this.prevPodPos.z - cp.position.z) * cp.tangent.z;
    const currDot =
      (podPos.x - cp.position.x) * cp.tangent.x +
      (podPos.z - cp.position.z) * cp.tangent.z;

    const lateralSq =
      (podPos.x - cp.position.x) * (podPos.x - cp.position.x) +
      (podPos.z - cp.position.z) * (podPos.z - cp.position.z);
    const maxRadius = cp.canyonWidth * 0.72;

    this.prevPodPos.copy(podPos);

    if (prevDot <= 0 && currDot > 0 && lateralSq <= maxRadius * maxRadius) {
      this.splitsMs.push(raceTimeMs);
      if (cp.isFinish) {
        return { crossedCp: null, finished: true, splitTimeMs: raceTimeMs };
      }

      const cpNum = cp.index;
      const yaw = Math.atan2(-cp.tangent.x, -cp.tangent.z);
      this.lastSnapshot = {
        pos: new THREE.Vector3(cp.position.x, cp.position.y + 1.9, cp.position.z),
        yaw,
        pitch: 0,
        modTankSec,
      };
      this.nextCpIndex++;
      this.refreshGateColors();
      return { crossedCp: cpNum, finished: false, splitTimeMs: raceTimeMs };
    }

    return { crossedCp: null, finished: false, splitTimeMs: null };
  }

  private refreshGateColors(): void {
    this.gates.forEach((g, idx) => {
      if (g.data.isFinish) {
        g.ringMat.color.setHex(0xfbbf24);
        g.beamMat.color.setHex(0xfbbf24);
        g.beamMat.opacity = idx === this.nextCpIndex ? 0.42 : 0.16;
      } else if (idx < this.nextCpIndex) {
        g.ringMat.color.setHex(0x34d399);
        g.beamMat.color.setHex(0x34d399);
        g.beamMat.opacity = 0.12;
      } else if (idx === this.nextCpIndex) {
        g.ringMat.color.setHex(0x38bdf8);
        g.beamMat.color.setHex(0x38bdf8);
        g.beamMat.opacity = 0.45;
      } else {
        g.ringMat.color.setHex(0x64748b);
        g.beamMat.color.setHex(0x64748b);
        g.beamMat.opacity = 0.14;
      }
    });
  }

  private buildStartArch(
    pos: THREE.Vector3,
    tangent: THREE.Vector3,
    width: number
  ): void {
    const grp = new THREE.Group();
    grp.position.copy(pos);
    grp.rotation.y = Math.atan2(-tangent.x, -tangent.z);

    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.35,
    });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });

    const hw = width * 0.46;
    for (const s of [-1, 1]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.2, 9.5, 1.2), pylonMat);
      pylon.position.set(s * hw, 4.5, 0);
      grp.add(pylon);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 1.2, 0.7, 0.8), glowMat);
    bar.position.set(0, 9.2, 0);
    grp.add(bar);
    this.group.add(grp);
  }

  private buildGateArch(cp: CheckpointMarkerData): GateVisual {
    const group = new THREE.Group();
    group.position.copy(cp.position);
    group.rotation.y = Math.atan2(-cp.tangent.x, -cp.tangent.z);

    const hw = cp.canyonWidth * 0.48;
    const ringMat = new THREE.MeshBasicMaterial({
      color: cp.isFinish ? 0xfbbf24 : 0x38bdf8,
    });
    const beamMat = new THREE.MeshBasicMaterial({
      color: cp.isFinish ? 0xfbbf24 : 0x38bdf8,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0x2b3038,
      metalness: 0.85,
      roughness: 0.35,
    });

    for (const s of [-1, 1]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.1, 10.5, 1.1), pylonMat);
      pylon.position.set(s * hw, 5.0, 0);
      group.add(pylon);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 9.5, 0.35), ringMat);
      strip.position.set(s * (hw - 0.55), 5.0, 0);
      group.add(strip);
    }

    const archMesh = new THREE.Mesh(
      new THREE.TorusGeometry(hw, 0.28, 8, 28, Math.PI),
      ringMat
    );
    archMesh.position.set(0, 6.2, 0);
    group.add(archMesh);

    const curtain = new THREE.Mesh(
      new THREE.PlaneGeometry(hw * 1.9, 9.0),
      beamMat
    );
    curtain.position.set(0, 5.2, 0);
    group.add(curtain);

    return { data: cp, group, ringMat, beamMat };
  }
}
