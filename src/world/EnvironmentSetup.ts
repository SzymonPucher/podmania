import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { MapBiome } from '../types';

interface BiomeAtmosphere {
  topColor: number;
  horizonColor: number;
  bottomColor: number;
  fogColor: number;
  fogDensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  sunColor: number;
  sunIntensity: number;
  envIntensity: number;
}

const BIOME_ATMOSPHERES: Record<MapBiome, BiomeAtmosphere> = {
  desert: {
    topColor: 0x2d6cdf,
    horizonColor: 0xf3d5a5,
    bottomColor: 0xd49b62,
    fogColor: 0xefd3a8,
    fogDensity: 0.00055,
    hemiSky: 0x9bd0ff,
    hemiGround: 0xc98a55,
    hemiIntensity: 0.85,
    sunColor: 0xfff1d6,
    sunIntensity: 2.35,
    envIntensity: 0.9,
  },
  volcanic: {
    topColor: 0x1a0b12,
    horizonColor: 0x9e3218,
    bottomColor: 0x3b120c,
    fogColor: 0x5c1d14,
    fogDensity: 0.00072,
    hemiSky: 0xff8a5b,
    hemiGround: 0x451a12,
    hemiIntensity: 0.8,
    sunColor: 0xffb380,
    sunIntensity: 2.1,
    envIntensity: 0.8,
  },
  glacier: {
    topColor: 0x164e7a,
    horizonColor: 0xaad8f0,
    bottomColor: 0x629ec2,
    fogColor: 0x9bcce6,
    fogDensity: 0.0005,
    hemiSky: 0xa8d8f0,
    hemiGround: 0x4c7fa3,
    hemiIntensity: 0.36,
    sunColor: 0xd8eef8,
    sunIntensity: 0.82,
    envIntensity: 0.48,
  },
  skyway: {
    topColor: 0x1d4ed8,
    horizonColor: 0xd9be75,
    bottomColor: 0x6c9bd2,
    fogColor: 0xb6cbe6,
    fogDensity: 0.00042,
    hemiSky: 0x93c5fd,
    hemiGround: 0xb8966e,
    hemiIntensity: 0.38,
    sunColor: 0xf5e6cc,
    sunIntensity: 0.88,
    envIntensity: 0.5,
  },
  desert_geode: {
    topColor: 0x4338ca,
    horizonColor: 0xd99b5e,
    bottomColor: 0x92400e,
    fogColor: 0xc99c6d,
    fogDensity: 0.00058,
    hemiSky: 0xe6c88a,
    hemiGround: 0x854d0e,
    hemiIntensity: 0.42,
    sunColor: 0xf5dcc0,
    sunIntensity: 0.98,
    envIntensity: 0.52,
  },
};

export class EnvironmentSetup {
  public readonly sunLight: THREE.DirectionalLight;
  private readonly scene: THREE.Scene;
  private readonly hemiLight: THREE.HemisphereLight;
  private readonly fog: THREE.FogExp2;
  private readonly skyMat: THREE.ShaderMaterial;
  private readonly pmremTarget: THREE.WebGLRenderTarget;
  private readonly skyMesh: THREE.Mesh;
  private currentBiome: MapBiome = 'desert';
  private caveBlend = 0;
  private readonly caveFogColor = new THREE.Color(0x0b0e16);
  private readonly baseFogColor = new THREE.Color(0xefd3a8);

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    // Environment reflections so metallic pod surfaces look bright & chrome-like
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    this.pmremTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = this.pmremTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Atmospheric fog
    this.fog = new THREE.FogExp2(0xefd3a8, 0.00055);
    scene.fog = this.fog;

    // Sky gradient dome
    const skyGeo = new THREE.SphereGeometry(2800, 24, 16);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x2d6cdf) },
        horizonColor: { value: new THREE.Color(0xf3d5a5) },
        bottomColor: { value: new THREE.Color(0xd49b62) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y;
          vec3 col = h >= 0.0
            ? mix(horizonColor, topColor, pow(h, 0.55))
            : mix(horizonColor, bottomColor, pow(-h, 0.5));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMat);
    scene.add(this.skyMesh);

    // Bright TMNF-style daylight illumination
    this.hemiLight = new THREE.HemisphereLight(0x9bd0ff, 0xc98a55, 0.85);
    scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 2.35);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 220;
    const d = 32;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.03;

    scene.add(this.sunLight);
    scene.add(this.sunLight.target);
  }

  public setBiome(biome: MapBiome = 'desert'): void {
    this.currentBiome = biome;
    this.caveBlend = 0;
    const cfg = BIOME_ATMOSPHERES[biome] ?? BIOME_ATMOSPHERES.desert;
    this.skyMat.uniforms.topColor.value.setHex(cfg.topColor);
    this.skyMat.uniforms.horizonColor.value.setHex(cfg.horizonColor);
    this.skyMat.uniforms.bottomColor.value.setHex(cfg.bottomColor);
    this.baseFogColor.setHex(cfg.fogColor);
    this.fog.color.copy(this.baseFogColor);
    this.fog.density = cfg.fogDensity;
    this.hemiLight.color.setHex(cfg.hemiSky);
    this.hemiLight.groundColor.setHex(cfg.hemiGround);
    this.hemiLight.intensity = cfg.hemiIntensity;
    this.sunLight.color.setHex(cfg.sunColor);
    this.sunLight.intensity = cfg.sunIntensity;
    this.scene.environmentIntensity = cfg.envIntensity;
  }

  public update(podPos: THREE.Vector3, inCave = false): void {
    // Smoothly darken ambient, sun, environment, and fog inside caves so engines stand out
    const targetBlend = inCave ? 1 : 0;
    this.caveBlend += (targetBlend - this.caveBlend) * 0.12;
    const cfg = BIOME_ATMOSPHERES[this.currentBiome] ?? BIOME_ATMOSPHERES.desert;
    this.hemiLight.intensity = THREE.MathUtils.lerp(cfg.hemiIntensity, 0.11, this.caveBlend);
    this.sunLight.intensity = THREE.MathUtils.lerp(cfg.sunIntensity, 0.08, this.caveBlend);
    this.scene.environmentIntensity = THREE.MathUtils.lerp(cfg.envIntensity, 0.12, this.caveBlend);
    this.fog.color.copy(this.baseFogColor).lerp(this.caveFogColor, this.caveBlend);
    this.fog.density = THREE.MathUtils.lerp(cfg.fogDensity, 0.0024, this.caveBlend);
    // Keep sky dome centered on pod
    this.skyMesh.position.set(podPos.x, 0, podPos.z);

    // Snap shadow frustum to 0.25m world increments to eliminate shadow swimming
    const snap = 0.25;
    const sx = Math.round(podPos.x / snap) * snap;
    const sy = Math.round(podPos.y / snap) * snap;
    const sz = Math.round(podPos.z / snap) * snap;

    this.sunLight.target.position.set(sx, sy, sz);
    this.sunLight.position.set(sx + 65, sy + 95, sz + 45);
    this.sunLight.target.updateMatrixWorld();
  }

  public dispose(): void {
    this.pmremTarget.dispose();
  }
}
