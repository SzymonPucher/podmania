import * as THREE from 'three';
import type { GroundSample, MapBiome, MapDefinition, TrackFeature, TrackStationDef } from '../types';

export interface SampledSlice {
  distance: number;
  center: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  canyonWidth: number;
  wallHeight: number;
  bankingRad: number;
  feature: TrackFeature;
  terraceHeight?: number;
}

export interface CheckpointMarkerData {
  index: number;
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  canyonWidth: number;
  distance: number;
  isFinish: boolean;
}

interface Tri2D {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  cx: number;
  cy: number;
  cz: number;
  nx: number;
  ny: number;
  nz: number;
}

const CELL_SIZE = 8;

function hash2D(x: number, z: number): number {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface BiomePalette {
  groove: number;
  dirtEdge: number;
  terra: number;
  sandstone: number;
  rim: number;
  caveDark: number;
  caveInner: number;
  crystalColors: [number, number];
  propColor: number;
}

const BIOME_PALETTES: Record<MapBiome, BiomePalette> = {
  desert: {
    groove: 0xb87c4c,
    dirtEdge: 0xd49b62,
    terra: 0xa85a3a,
    sandstone: 0xc9834f,
    rim: 0xdfad7a,
    caveDark: 0x4a3b34,
    caveInner: 0x634b3d,
    crystalColors: [0xf59e0b, 0x38bdf8],
    propColor: 0xb76f45,
  },
  volcanic: {
    groove: 0x2b2124,
    dirtEdge: 0x4a2c2a,
    terra: 0x3a1816,
    sandstone: 0x6e261b,
    rim: 0x8c3522,
    caveDark: 0x1c1214,
    caveInner: 0x381916,
    crystalColors: [0xff5500, 0xfbbf24],
    propColor: 0x3b1d1a,
  },
  glacier: {
    groove: 0x5ba3c9,
    dirtEdge: 0x9cc5e0,
    terra: 0x2c7da0,
    sandstone: 0x629cc4,
    rim: 0xb0d3e8,
    caveDark: 0x164e63,
    caveInner: 0x0e7490,
    crystalColors: [0x22d3ee, 0x93c5fd],
    propColor: 0x4ea8c9,
  },
  skyway: {
    groove: 0x64748b,
    dirtEdge: 0x8fa0b5,
    terra: 0x475569,
    sandstone: 0x8f7552,
    rim: 0xb39a74,
    caveDark: 0x334155,
    caveInner: 0x475569,
    crystalColors: [0x38bdf8, 0xfbbf24],
    propColor: 0x64748b,
  },
  desert_geode: {
    groove: 0xb07c3e,
    dirtEdge: 0xc99c5d,
    terra: 0x7c3e24,
    sandstone: 0xab6c37,
    rim: 0xc9a56e,
    caveDark: 0x2e1065,
    caveInner: 0x4c1d95,
    crystalColors: [0xc084fc, 0x2dd4bf],
    propColor: 0x92400e,
  },
};

export class TrackBuilder {
  public readonly group = new THREE.Group();
  public readonly slices: SampledSlice[] = [];
  public readonly checkpoints: CheckpointMarkerData[] = [];
  public readonly startSlice!: SampledSlice;
  public readonly totalLength: number;
  public readonly biome: MapBiome;

  private readonly groundGrid = new Map<string, Tri2D[]>();
  private readonly ceilingGrid = new Map<string, Tri2D[]>();

  constructor(map: MapDefinition) {
    this.biome = map.biome ?? 'desert';
    const curvePoints = map.stations.map((s) => new THREE.Vector3(...s.pos));
    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.35);

    const approxLen = curve.getLength();
    const numSlices = Math.max(120, Math.round(approxLen / 4.0));
    this.totalLength = approxLen;

    // Sample spline slices every ~4m
    for (let i = 0; i <= numSlices; i++) {
      const u = i / numSlices;
      const center = curve.getPointAt(u);
      const tangent = curve.getTangentAt(u).normalize();
      const horizTan = new THREE.Vector3(tangent.x, 0, tangent.z).normalize();
      const right = new THREE.Vector3(-horizTan.z, 0, horizTan.x).normalize();

      const stationProps = this.interpolateStationProps(map.stations, u);

      this.slices.push({
        distance: u * approxLen,
        center,
        tangent,
        right,
        canyonWidth: stationProps.canyonWidth,
        wallHeight: stationProps.wallHeight,
        bankingRad: THREE.MathUtils.degToRad(stationProps.bankingDeg),
        feature: stationProps.feature,
      });
    }

    this.computeFeatureProfiles();
    this.startSlice = this.slices[2];
    this.buildCheckpointList(map.stations, curve, approxLen);
    this.buildTerrainMesh();
    this.buildCaveCeilings();
    this.buildFeatureProps();
    this.buildDecorativeProps();
  }

  public sampleGround(x: number, _y: number, z: number): GroundSample {
    const cx = Math.floor(x / CELL_SIZE);
    const cz = Math.floor(z / CELL_SIZE);
    const tris = this.groundGrid.get(`${cx},${cz}`);
    if (tris) {
      for (let i = 0; i < tris.length; i++) {
        const t = tris[i];
        const yHit = this.barycentricY(x, z, t);
        if (yHit !== null) {
          return {
            groundY: yHit,
            normal: new THREE.Vector3(t.nx, t.ny, t.nz),
            found: true,
          };
        }
      }
    }

    // Fallback: nearest slice center
    const nearest = this.findNearestSlice(x, z);
    return {
      groundY: nearest.center.y,
      normal: new THREE.Vector3(0, 1, 0),
      found: false,
    };
  }

  public sampleCeiling(x: number, z: number): number | null {
    const cx = Math.floor(x / CELL_SIZE);
    const cz = Math.floor(z / CELL_SIZE);
    const tris = this.ceilingGrid.get(`${cx},${cz}`);
    if (!tris) return null;
    let lowestY: number | null = null;
    for (let i = 0; i < tris.length; i++) {
      const yHit = this.barycentricY(x, z, tris[i]);
      if (yHit !== null && (lowestY === null || yHit < lowestY)) {
        lowestY = yHit;
      }
    }
    return lowestY;
  }

  public resolveWallAndCeilingCollision(
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    radius: number
  ): { hitWall: boolean; impactSpeed: number } {
    const slice = this.findNearestSlice(pos.x, pos.z);
    const relX = pos.x - slice.center.x;
    const relZ = pos.z - slice.center.z;
    const lateralDist = relX * slice.right.x + relZ * slice.right.z;
    const maxOffset = slice.canyonWidth * 0.5 - radius;

    let hitWall = false;
    let impactSpeed = 0;

    if (Math.abs(lateralDist) > maxOffset) {
      const sign = Math.sign(lateralDist);
      const excess = Math.abs(lateralDist) - maxOffset;
      // Push pod smoothly back into canyon corridor
      pos.x -= slice.right.x * sign * excess;
      pos.z -= slice.right.z * sign * excess;

      const vIntoWall = (vel.x * slice.right.x + vel.z * slice.right.z) * sign;
      if (vIntoWall > 0) {
        impactSpeed = vIntoWall;
        // Deflect velocity parallel to canyon wall + scrub speed
        vel.x -= slice.right.x * sign * vIntoWall * 1.25;
        vel.z -= slice.right.z * sign * vIntoWall * 1.25;
        vel.x *= 0.88;
        vel.z *= 0.88;
        hitWall = true;
      }
    }

    const ceilingY = this.sampleCeiling(pos.x, pos.z);
    if (ceilingY !== null && pos.y + radius > ceilingY) {
      pos.y = ceilingY - radius;
      if (vel.y > 0) {
        impactSpeed = Math.max(impactSpeed, vel.y);
        vel.y = -vel.y * 0.25;
        hitWall = true;
      }
    }

    return { hitWall, impactSpeed };
  }

  public findNearestSlice(x: number, z: number): SampledSlice {
    let best = this.slices[0];
    let bestD2 = Infinity;
    for (let i = 0; i < this.slices.length; i++) {
      const s = this.slices[i];
      const dx = x - s.center.x;
      const dz = z - s.center.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = s;
      }
    }
    return best;
  }

  private computeFeatureProfiles(): void {
    // Hold cliff_drop spans level at their entry height so the drop into chasm_floor is a sheer vertical cliff
    let i = 0;
    while (i < this.slices.length) {
      if (this.slices[i].feature === 'cliff_drop') {
        const start = i;
        while (i < this.slices.length && this.slices[i].feature === 'cliff_drop') i++;
        const end = i - 1;
        const cliffTopY = this.slices[Math.max(0, start - 1)].center.y;
        for (let k = start; k <= end; k++) {
          this.slices[k].center.y = cliffTopY;
        }
      } else if (this.slices[i].feature === 'split_terrace') {
        const start = i;
        while (i < this.slices.length && this.slices[i].feature === 'split_terrace') i++;
        const end = i - 1;
        const span = Math.max(1, end - start);
        for (let k = start; k <= end; k++) {
          const p = (k - start) / span;
          this.slices[k].terraceHeight = Math.pow(p, 1.35) * 24.0;
        }
      } else {
        i++;
      }
    }
  }

  private interpolateStationProps(
    stations: TrackStationDef[],
    u: number
  ): { canyonWidth: number; wallHeight: number; bankingDeg: number; feature: TrackFeature } {
    const fIdx = u * (stations.length - 1);
    const i0 = Math.min(stations.length - 1, Math.floor(fIdx));
    const i1 = Math.min(stations.length - 1, i0 + 1);
    const t = fIdx - i0;
    const s0 = stations[i0];
    const s1 = stations[i1];

    return {
      canyonWidth: lerp(s0.canyonWidth, s1.canyonWidth, t),
      wallHeight: lerp(s0.wallHeight, s1.wallHeight, t),
      bankingDeg: lerp(s0.bankingDeg, s1.bankingDeg, t),
      feature: (t < 0.5 ? s0.feature : s1.feature) ?? 'normal',
    };
  }

  private buildCheckpointList(
    stations: TrackStationDef[],
    curve: THREE.CatmullRomCurve3,
    totalLen: number
  ): void {
    let cpIdx = 1;
    stations.forEach((st, idx) => {
      if (!st.checkpoint) return;
      const u = idx / (stations.length - 1);
      const pos = curve.getPointAt(u);
      const tangent = curve.getTangentAt(u).normalize();
      this.checkpoints.push({
        index: cpIdx++,
        position: pos,
        tangent,
        canyonWidth: st.canyonWidth,
        distance: u * totalLen,
        isFinish: false,
      });
    });

    // Finish gate near last station
    const finishU = (stations.length - 1.5) / (stations.length - 1);
    const fPos = curve.getPointAt(finishU);
    const fTan = curve.getTangentAt(finishU).normalize();
    this.checkpoints.push({
      index: cpIdx,
      position: fPos,
      tangent: fTan,
      canyonWidth: stations[stations.length - 1].canyonWidth,
      distance: finishU * totalLen,
      isFinish: true,
    });
  }

  private buildTerrainMesh(): void {
    const lateralSteps = 32;
    const cols = lateralSteps + 1;
    const rows = this.slices.length;

    const positions = new Float32Array(rows * cols * 3);
    const colors = new Float32Array(rows * cols * 3);

    const pal = BIOME_PALETTES[this.biome];
    const colGroove = new THREE.Color(pal.groove);
    const colDirtEdge = new THREE.Color(pal.dirtEdge);
    const colTerra = new THREE.Color(pal.terra);
    const colSandstone = new THREE.Color(pal.sandstone);
    const colRim = new THREE.Color(pal.rim);

    // Feature-specific accent colors
    const colIceCore = new THREE.Color(0x9bcce3);
    const colIceEdge = new THREE.Color(0x3b8db8);
    const colMagmaGlow = new THREE.Color(0xff5500);
    const colBasalt = new THREE.Color(0x1f1618);
    const colBoostDeck = new THREE.Color(0x1e293b);
    const colBoostRail = new THREE.Color(0x38bdf8);
    const colDuneCrest = new THREE.Color(0xc99c55);
    const colDuneTrough = new THREE.Color(0x9e672b);
    const colRidgeSpine = new THREE.Color(0x8c3b2b);
    const colBridgeDeck = new THREE.Color(0x475569);
    const colBridgeEdge = new THREE.Color(0xc78114);
    const colScreeDark = new THREE.Color(0x5c4738);
    const colCliffRim = new THREE.Color(0xd97706);
    const tmpCol = new THREE.Color();

    for (let r = 0; r < rows; r++) {
      const s = this.slices[r];
      const halfW = s.canyonWidth * 0.5;
      const flatRamp =
        s.feature === 'jump_lip' ||
        s.feature === 'landing_slope' ||
        s.feature === 'boost_pad' ||
        s.feature === 'bridge_deck' ||
        s.feature === 'cliff_drop';
      const isChasm = s.feature === 'chasm_floor';

      for (let c = 0; c < cols; c++) {
        const latNorm = (c / lateralSteps) * 2 - 1; // -1 to +1
        // Map [-1, 1] non-linearly so vertices concentrate in the rideable floor
        const absN = Math.abs(latNorm);
        let d = 0;
        if (absN <= 0.55) {
          d = (latNorm / 0.55) * halfW;
        } else {
          const wallFrac = (absN - 0.55) / 0.45;
          d = Math.sign(latNorm) * (halfW + wallFrac * wallFrac * 68);
        }

        const wx = s.center.x + s.right.x * d;
        const wz = s.center.z + s.right.z * d;
        const absD = Math.abs(d);
        const noise = (hash2D(wx * 0.08, wz * 0.08) - 0.5) * 2;

        let wy = s.center.y;
        if (absD <= halfW) {
          const uFloor = absD / halfW;
          const bank = d * Math.tan(s.bankingRad);

          if (s.feature === 'ice_sheet') {
            const trough = uFloor * uFloor * 0.65;
            wy += trough + bank;
            tmpCol.copy(colIceCore).lerp(colIceEdge, Math.pow(uFloor, 1.5));
          } else if (s.feature === 'magma_vent') {
            // Central molten fissure channel with raised dark basalt ledges
            const fissure = uFloor < 0.42 ? -0.45 * (1 - uFloor / 0.42) : uFloor * uFloor * 1.1;
            wy += fissure + bank + noise * 0.12;
            const glowT = Math.max(0, 1 - uFloor / 0.48);
            tmpCol.copy(colBasalt).lerp(colMagmaGlow, Math.pow(glowT, 1.4));
          } else if (s.feature === 'boost_pad') {
            const trough = uFloor * uFloor * 0.4;
            wy += trough + bank;
            const onRail = uFloor < 0.28 || (uFloor > 0.72 && uFloor < 0.84);
            tmpCol.copy(onRail ? colBoostRail : colBoostDeck);
          } else if (s.feature === 'sand_dunes') {
            // Rolling sinusoidal dune waves
            const duneWave = Math.sin(s.distance * 0.11 + d * 0.08) * 1.15;
            const trough = uFloor * uFloor * 1.2;
            wy += trough + bank + duneWave + noise * 0.15;
            const crestT = duneWave * 0.5 + 0.5;
            tmpCol.copy(colDuneTrough).lerp(colDuneCrest, crestT);
          } else if (s.feature === 'ridge_split') {
            // Raised central rock spine creating two carved side channels
            const spine = Math.max(0, 1 - uFloor / 0.34);
            const spineH = Math.pow(spine, 1.6) * 3.6;
            const trough = uFloor * uFloor * 1.3;
            wy += trough + spineH + bank + noise * 0.22;
            tmpCol.copy(colGroove).lerp(colDirtEdge, uFloor);
            if (spine > 0.05) {
              tmpCol.lerp(colRidgeSpine, spine * 0.85);
            }
          } else if (s.feature === 'bridge_deck') {
            wy += bank;
            tmpCol.copy(uFloor > 0.84 ? colBridgeEdge : colBridgeDeck);
          } else if (s.feature === 'rough_scree') {
            const trough = uFloor * uFloor * 1.5;
            const boulders = Math.sin(wx * 0.35) * Math.cos(wz * 0.35) * 0.55;
            wy += trough + bank + noise * 0.7 + boulders;
            tmpCol.copy(colScreeDark).lerp(colDirtEdge, 0.35 + noise * 0.25);
          } else if (s.feature === 'split_terrace') {
            // Left half (d < 0) rises along a long gradual slope up to +24m above right half (d > 0)
            const tStep = THREE.MathUtils.clamp((2.2 - d) / 4.4, 0, 1);
            const terraceH = tStep * tStep * (3 - 2 * tStep) * (s.terraceHeight ?? 0);
            const subU = Math.abs(Math.abs(d) - halfW * 0.5) / (halfW * 0.5);
            const subTrough = subU * subU * 0.65;
            wy += terraceH + subTrough + bank * 0.4;
            if (tStep > 0.08 && tStep < 0.92 && (s.terraceHeight ?? 0) > 1.0) {
              tmpCol.copy(colTerra).lerp(colCliffRim, 0.45);
            } else if (d < 0) {
              tmpCol.copy(colDirtEdge).lerp(colCliffRim, uFloor > 0.85 ? 0.6 : 0.15);
            } else {
              tmpCol.copy(colGroove).lerp(colDirtEdge, uFloor * 0.5);
            }
          } else if (s.feature === 'cliff_drop') {
            wy += bank;
            tmpCol.copy(uFloor > 0.78 ? colCliffRim : colSandstone);
          } else {
            // Smooth concave dirt trough + banking
            const trough = uFloor * uFloor * 1.4;
            const floorJitter = flatRamp || isChasm ? 0 : noise * 0.2;
            wy += trough + bank + floorJitter;
            tmpCol.copy(colGroove).lerp(colDirtEdge, Math.pow(uFloor, 1.3));
          }
        } else {
          const wallD = absD - halfW;
          const bank = Math.sign(d) * halfW * Math.tan(s.bankingRad);
          if (s.feature === 'bridge_deck') {
            // Elevated skyway curb then dramatic drop-off into the clouds
            if (wallD <= 3.5) {
              wy += bank + (wallD / 3.5) * 1.8;
              tmpCol.copy(colBridgeEdge);
            } else {
              wy += bank + 1.8 - (wallD - 3.5) * 1.35 + noise * 1.2;
              tmpCol.copy(colTerra).lerp(colRim, 0.5);
            }
          } else if (wallD <= 24) {
            const wFrac = wallD / 24;
            // 4 jagged strata steps
            const strata = Math.floor(wFrac * 4) * 0.12 + wFrac * 0.88;
            wy += 1.4 + bank + strata * s.wallHeight + noise * 2.2;
            tmpCol
              .copy(colTerra)
              .lerp(colSandstone, Math.min(1, wFrac * 1.4));
          } else {
            const rimFrac = Math.min(1, (wallD - 24) / 44);
            wy += 1.4 + bank + s.wallHeight + rimFrac * 5.0 + noise * 3.4;
            tmpCol.copy(colSandstone).lerp(colRim, rimFrac);
          }
        }

        const idx = (r * cols + c) * 3;
        positions[idx] = wx;
        positions[idx + 1] = wy;
        positions[idx + 2] = wz;

        colors[idx] = tmpCol.r;
        colors[idx + 1] = tmpCol.g;
        colors[idx + 2] = tmpCol.b;
      }
    }

    const indices: number[] = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = r * cols + c;
        const b = a + 1;
        const d = (r + 1) * cols + c;
        const e = d + 1;

        indices.push(a, b, d);
        indices.push(b, e, d);

        this.insertTriIntoGrid(this.groundGrid, positions, a, d, b);
        this.insertTriIntoGrid(this.groundGrid, positions, b, d, e);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.92,
      metalness: 0.04,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    this.group.add(mesh);
  }

  private buildCaveCeilings(): void {
    // Group contiguous 'cave' slices into ceiling arches
    let start = -1;
    for (let i = 0; i <= this.slices.length; i++) {
      const isCave = i < this.slices.length && this.slices[i].feature === 'cave';
      if (isCave && start === -1) {
        start = i;
      } else if (!isCave && start !== -1) {
        this.buildSingleCaveSpan(start, i - 1);
        start = -1;
      }
    }
  }

  private buildSingleCaveSpan(startIdx: number, endIdx: number): void {
    const archSteps = 10;
    const cols = archSteps + 1;
    const rows = endIdx - startIdx + 1;
    if (rows < 2) return;

    const pal = BIOME_PALETTES[this.biome];
    const positions = new Float32Array(rows * cols * 3);
    const colors = new Float32Array(rows * cols * 3);
    const colDarkRock = new THREE.Color(pal.caveDark);
    const colInnerRock = new THREE.Color(pal.caveInner);
    const tmp = new THREE.Color();

    for (let r = 0; r < rows; r++) {
      const s = this.slices[startIdx + r];
      const halfSpan = s.canyonWidth * 0.5 + 8;

      for (let c = 0; c < cols; c++) {
        const t = c / archSteps; // 0 -> 1
        const angle = t * Math.PI; // 0 (right) to PI (left)
        const d = Math.cos(angle) * halfSpan;
        const archH = Math.sin(angle) * 14.5 + 1.5;

        const wx = s.center.x + s.right.x * d;
        const wz = s.center.z + s.right.z * d;
        const jag = (hash2D(wx * 0.14, wz * 0.14) - 0.5) * 2.1;
        const wy = s.center.y + archH + jag;

        const idx = (r * cols + c) * 3;
        positions[idx] = wx;
        positions[idx + 1] = wy;
        positions[idx + 2] = wz;

        tmp.copy(colDarkRock).lerp(colInnerRock, Math.sin(angle));
        colors[idx] = tmp.r;
        colors[idx + 1] = tmp.g;
        colors[idx + 2] = tmp.b;
      }

      // Place glowing amber/cyan crystal clusters every ~28m inside cave
      if (r % 7 === 0) {
        const side = (r / 7) % 2 === 0 ? 1 : -1;
        const crystalPos = new THREE.Vector3(
          s.center.x + s.right.x * side * (s.canyonWidth * 0.48),
          s.center.y + 4.5,
          s.center.z + s.right.z * side * (s.canyonWidth * 0.48)
        );
        const crystalColor = (r / 7) % 3 === 0 ? pal.crystalColors[1] : pal.crystalColors[0];
        const crystalGeo = new THREE.OctahedronGeometry(1.1, 0);
        crystalGeo.scale(0.6, 1.8, 0.6);
        const crystalMat = new THREE.MeshStandardMaterial({
          color: crystalColor,
          emissive: crystalColor,
          emissiveIntensity: 1.8,
          flatShading: true,
        });
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.copy(crystalPos);
        crystal.rotation.z = side * 0.45;
        this.group.add(crystal);

        const pt = new THREE.PointLight(crystalColor, 26, 36, 1.6);
        pt.position.copy(crystalPos).add(new THREE.Vector3(-s.right.x * side * 2, 0, -s.right.z * side * 2));
        this.group.add(pt);
      }
    }

    const indices: number[] = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = r * cols + c;
        const b = a + 1;
        const d = (r + 1) * cols + c;
        const e = d + 1;
        // Winding facing downward into the cave
        indices.push(a, b, d);
        indices.push(b, e, d);

        this.insertTriIntoGrid(this.ceilingGrid, positions, a, b, d);
        this.insertTriIntoGrid(this.ceilingGrid, positions, b, e, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.95,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  private buildFeatureProps(): void {
    const boostMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });
    const magmaMat = new THREE.MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xff4500,
      emissiveIntensity: 2.4,
      roughness: 0.4,
    });
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.1,
      roughness: 0.3,
    });
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      flatShading: true,
      roughness: 0.2,
    });

    for (let i = 4; i < this.slices.length - 4; i++) {
      const s = this.slices[i];
      const yaw = Math.atan2(-s.tangent.x, -s.tangent.z);

      if (s.feature === 'boost_pad' && i % 4 === 0) {
        const barGeo = new THREE.BoxGeometry(s.canyonWidth * 0.42, 0.18, 1.4);
        const bar = new THREE.Mesh(barGeo, boostMat);
        bar.position.set(s.center.x, s.center.y + 0.14, s.center.z);
        bar.rotation.y = yaw;
        this.group.add(bar);
      } else if (s.feature === 'magma_vent' && i % 7 === 0) {
        const poolGeo = new THREE.CylinderGeometry(3.2, 3.6, 0.2, 8);
        const pool = new THREE.Mesh(poolGeo, magmaMat);
        pool.position.set(s.center.x, s.center.y - 0.32, s.center.z);
        this.group.add(pool);

        if (i % 14 === 0) {
          const light = new THREE.PointLight(0xff5500, 22, 34, 1.6);
          light.position.set(s.center.x, s.center.y + 2.5, s.center.z);
          this.group.add(light);
        }
      } else if (s.feature === 'bridge_deck' && i % 5 === 0) {
        const halfW = s.canyonWidth * 0.5 + 0.6;
        const pylonGeo = new THREE.BoxGeometry(0.65, 2.8, 0.65);
        for (const side of [-1, 1]) {
          const pylon = new THREE.Mesh(pylonGeo, pylonMat);
          pylon.position.set(
            s.center.x + s.right.x * side * halfW,
            s.center.y + 1.4,
            s.center.z + s.right.z * side * halfW
          );
          pylon.rotation.y = yaw;
          this.group.add(pylon);
        }
      } else if (s.feature === 'ice_sheet' && i % 11 === 0) {
        const side = i % 22 === 0 ? 1 : -1;
        const offset = s.canyonWidth * 0.5 + 10 + hash2D(i, 5) * 10;
        const shardGeo = new THREE.OctahedronGeometry(3.2, 0);
        shardGeo.scale(0.65, 2.6, 0.65);
        const shard = new THREE.Mesh(shardGeo, iceMat);
        shard.position.set(
          s.center.x + s.right.x * side * offset,
          s.center.y + 6.5,
          s.center.z + s.right.z * side * offset
        );
        shard.rotation.set(0.15 * side, hash2D(i, 9) * Math.PI, -0.2 * side);
        this.group.add(shard);
      } else if (s.feature === 'cliff_drop' && i % 4 === 0) {
        const halfW = s.canyonWidth * 0.5 - 0.8;
        const pylonGeo = new THREE.BoxGeometry(0.7, 3.2, 0.7);
        for (const side of [-1, 1]) {
          const pylon = new THREE.Mesh(pylonGeo, pylonMat);
          pylon.position.set(
            s.center.x + s.right.x * side * halfW,
            s.center.y + 1.6,
            s.center.z + s.right.z * side * halfW
          );
          pylon.rotation.y = yaw;
          this.group.add(pylon);
        }
      } else if (s.feature === 'split_terrace' && i % 5 === 0) {
        // Edge beacons along the elevated left terrace's middle drop-off
        const markerGeo = new THREE.BoxGeometry(0.55, 2.0, 0.55);
        const marker = new THREE.Mesh(markerGeo, pylonMat);
        marker.position.set(
          s.center.x - s.right.x * 2.4,
          s.center.y + (s.terraceHeight ?? 0) + 1.0,
          s.center.z - s.right.z * 2.4
        );
        marker.rotation.y = yaw;
        this.group.add(marker);
      }
    }
  }

  private buildDecorativeProps(): void {
    const pal = BIOME_PALETTES[this.biome];
    const rockMat = new THREE.MeshStandardMaterial({
      color: pal.propColor,
      flatShading: true,
      roughness: 0.9,
    });

    // Place towering monoliths & spires outside rideable corridor
    for (let i = 15; i < this.slices.length - 10; i += 18) {
      const s = this.slices[i];
      if (s.feature === 'cave' || s.feature === 'bridge_deck') continue;
      const side = (i % 36 === 0) ? 1 : -1;
      const offset = s.canyonWidth * 0.5 + 22 + hash2D(i, 3) * 16;

      const spireGeo = new THREE.ConeGeometry(7 + hash2D(i, 7) * 5, 28 + hash2D(i, 11) * 24, 6);
      const spire = new THREE.Mesh(spireGeo, rockMat);
      spire.position.set(
        s.center.x + s.right.x * side * offset,
        s.center.y + s.wallHeight * 0.75,
        s.center.z + s.right.z * side * offset
      );
      spire.rotation.y = hash2D(i, 19) * Math.PI;
      this.group.add(spire);
    }
  }

  private insertTriIntoGrid(
    grid: Map<string, Tri2D[]>,
    positions: Float32Array,
    ia: number,
    ib: number,
    ic: number
  ): void {
    const ax = positions[ia * 3];
    const ay = positions[ia * 3 + 1];
    const az = positions[ia * 3 + 2];
    const bx = positions[ib * 3];
    const by = positions[ib * 3 + 1];
    const bz = positions[ib * 3 + 2];
    const cx = positions[ic * 3];
    const cy = positions[ic * 3 + 1];
    const cz = positions[ic * 3 + 2];

    // Compute upward-oriented normal
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    if (ny < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }

    const tri: Tri2D = { ax, ay, az, bx, by, bz, cx, cy, cz, nx, ny, nz };
    const minX = Math.floor(Math.min(ax, bx, cx) / CELL_SIZE);
    const maxX = Math.floor(Math.max(ax, bx, cx) / CELL_SIZE);
    const minZ = Math.floor(Math.min(az, bz, cz) / CELL_SIZE);
    const maxZ = Math.floor(Math.max(az, bz, cz) / CELL_SIZE);

    for (let gx = minX; gx <= maxX; gx++) {
      for (let gz = minZ; gz <= maxZ; gz++) {
        const key = `${gx},${gz}`;
        let list = grid.get(key);
        if (!list) {
          list = [];
          grid.set(key, list);
        }
        list.push(tri);
      }
    }
  }

  private barycentricY(x: number, z: number, t: Tri2D): number | null {
    const v0x = t.cx - t.ax;
    const v0z = t.cz - t.az;
    const v1x = t.bx - t.ax;
    const v1z = t.bz - t.az;
    const v2x = x - t.ax;
    const v2z = z - t.az;

    const dot00 = v0x * v0x + v0z * v0z;
    const dot01 = v0x * v1x + v0z * v1z;
    const dot02 = v0x * v2x + v0z * v2z;
    const dot11 = v1x * v1x + v1z * v1z;
    const dot12 = v1x * v2x + v1z * v2z;

    const denom = dot00 * dot11 - dot01 * dot01;
    if (Math.abs(denom) < 1e-8) return null;
    const inv = 1 / denom;
    const u = (dot11 * dot02 - dot01 * dot12) * inv;
    const v = (dot00 * dot12 - dot01 * dot02) * inv;

    if (u >= -0.002 && v >= -0.002 && u + v <= 1.004) {
      return t.ay + u * (t.cy - t.ay) + v * (t.by - t.ay);
    }
    return null;
  }
}
