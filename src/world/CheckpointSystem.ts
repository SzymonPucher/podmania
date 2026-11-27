import * as THREE from 'three';
import type { CheckpointMarkerData, TrackBuilder } from '../world/TrackBuilder';

interface GateVisual {
  data: CheckpointMarkerData;
  group: THREE.Group;
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
  public readonly totalLaps: number;
  public readonly isLoop: boolean;

  private readonly gates: GateVisual[] = [];
  private nextCpIndex = 0;
  private currentLap = 1;
  private splitsMs: number[] = [];
  private lastSnapshot: CheckpointSnapshot;
  private prevPodPos = new THREE.Vector3();

  constructor(track: TrackBuilder, totalLaps = 1, isLoop = false) {
    this.totalCheckpoints = track.checkpoints.filter((c) => !c.isFinish).length;
    this.totalLaps = Math.max(1, totalLaps);
    this.isLoop = isLoop;

    const start = track.startSlice;
    const startYaw = Math.atan2(-start.tangent.x, -start.tangent.z);
    this.lastSnapshot = {
      pos: new THREE.Vector3(start.center.x, start.center.y + 1.85, start.center.z),
      yaw: startYaw,
      pitch: 0,
      modTankSec: 0,
    };

    // Start arch (on open tracks; closed loops share the Start/Finish gate at u=0)
    if (!this.isLoop) {
      this.buildStartArch(start.center, start.tangent, start.canyonWidth);
    }

    // Checkpoints + Finish/Lap arch
    for (const cp of track.checkpoints) {
      const gate = this.buildGateArch(cp);
      this.gates.push(gate);
      this.group.add(gate.group);
    }

  }

  public reset(startPos: THREE.Vector3, startYaw: number, modTankSec = 0): void {
    this.nextCpIndex = 0;
    this.currentLap = 1;
    this.splitsMs = [];
    this.lastSnapshot = {
      pos: startPos.clone(),
      yaw: startYaw,
      pitch: 0,
      modTankSec,
    };
    this.prevPodPos.copy(startPos);
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

  public getCurrentLap(): number {
    return this.currentLap;
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
    completedLap: number | null;
    splitIndex: number | null;
    finished: boolean;
    splitTimeMs: number | null;
  } {
    const activeGate = this.gates[this.nextCpIndex];
    if (!activeGate) {
      this.prevPodPos.copy(podPos);
      return {
        crossedCp: null,
        completedLap: null,
        splitIndex: null,
        finished: false,
        splitTimeMs: null,
      };
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
    const maxRadius = cp.canyonWidth * 0.78;

    this.prevPodPos.copy(podPos);

    if (prevDot <= 0 && currDot > 0 && lateralSq <= maxRadius * maxRadius) {
      this.splitsMs.push(raceTimeMs);
      const splitIndex = this.splitsMs.length;

      if (cp.isFinish) {
        if (this.currentLap < this.totalLaps) {
          const completedLap = this.currentLap;
          this.currentLap++;
          const yaw = Math.atan2(-cp.tangent.x, -cp.tangent.z);
          this.lastSnapshot = {
            pos: new THREE.Vector3(cp.position.x, cp.position.y + 1.9, cp.position.z),
            yaw,
            pitch: 0,
            modTankSec,
          };
          this.nextCpIndex = 0;
                return {
            crossedCp: null,
            completedLap,
            splitIndex,
            finished: false,
            splitTimeMs: raceTimeMs,
          };
        }
        return {
          crossedCp: null,
          completedLap: this.currentLap,
          splitIndex,
          finished: true,
          splitTimeMs: raceTimeMs,
        };
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
        return {
        crossedCp: cpNum,
        completedLap: null,
        splitIndex,
        finished: false,
        splitTimeMs: raceTimeMs,
      };
    }

    return {
      crossedCp: null,
      completedLap: null,
      splitIndex: null,
      finished: false,
      splitTimeMs: null,
    };
  }

  private buildStoneArch(pos: THREE.Vector3, tangent: THREE.Vector3, width: number): THREE.Group {
    const grp = new THREE.Group();
    grp.position.copy(pos);
    grp.rotation.y = Math.atan2(-tangent.x, -tangent.z);

    const mats = [0x8a8378, 0x7b746a, 0x948c80].map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0 })
    );
    const hw = width * 0.48;
    const pillarH = 6.2;
    const blockT = 1.5;
    const depth = 2.0;

    // Pillars: stacked stone blocks
    const rows = 6;
    const rowH = pillarH / rows;
    for (const s of [-1, 1]) {
      for (let r = 0; r < rows; r++) {
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(blockT, rowH * 0.98, depth),
          mats[(r + (s > 0 ? 1 : 0)) % 3]
        );
        b.position.set(s * hw + (r % 2 ? 0.05 : -0.05), rowH * (r + 0.5), 0);
        grp.add(b);
      }
    }

    // Semicircular arch of wedge-like stone blocks
    const n = 13;
    const midR = hw;
    const arcLen = (Math.PI * midR) / n;
    for (let i = 0; i < n; i++) {
      const a = Math.PI - ((i + 0.5) * Math.PI) / n;
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(blockT, arcLen * 1.04, depth),
        mats[i % 3]
      );
      b.position.set(Math.cos(a) * midR, pillarH + Math.sin(a) * midR, 0);
      b.rotation.z = a;
      grp.add(b);
    }
    // Keystone
    const key = new THREE.Mesh(new THREE.BoxGeometry(blockT * 1.2, arcLen * 1.2, depth * 1.1), mats[1]);
    key.position.set(0, pillarH + midR + 0.05, 0);
    key.rotation.z = Math.PI / 2;
    grp.add(key);
    return grp;
  }

  private buildStartArch(pos: THREE.Vector3, tangent: THREE.Vector3, width: number): void {
    this.group.add(this.buildStoneArch(pos, tangent, width));
  }

  private buildGateArch(cp: CheckpointMarkerData): GateVisual {
    const group = this.buildStoneArch(cp.position, cp.tangent, cp.canyonWidth);
    return { data: cp, group };
  }
}

