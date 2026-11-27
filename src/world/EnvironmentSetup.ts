import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export class EnvironmentSetup {
  public readonly sunLight: THREE.DirectionalLight;
  private readonly pmremTarget: THREE.WebGLRenderTarget;
  private readonly skyMesh: THREE.Mesh;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    // Environment reflections so metallic pod surfaces look bright & chrome-like
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    this.pmremTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = this.pmremTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Warm desert atmospheric fog
    scene.fog = new THREE.FogExp2(0xefd3a8, 0.00055);

    // Sky gradient dome
    const skyGeo = new THREE.SphereGeometry(2800, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
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
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(this.skyMesh);

    // Bright TMNF-style daylight illumination
    const hemi = new THREE.HemisphereLight(0x9bd0ff, 0xc98a55, 0.85);
    scene.add(hemi);

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

  public update(podPos: THREE.Vector3): void {
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
