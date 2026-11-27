import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { AudioEngine } from './core/AudioEngine';
import { InputManager } from './core/InputManager';
import { compareMedals, StorageManager } from './core/StorageManager';
import { getMapById } from './maps/mapRegistry';
import { FIXED_DT } from './pod/PodConfig';
import { PodMeshBuilder } from './pod/PodMeshBuilder';
import { PodPhysics } from './pod/PodPhysics';
import { PodVFX } from './pod/PodVFX';
import type { MapDefinition, MedalTier, RaceState } from './types';
import { HudController } from './ui/HudController';
import { ChaseCamera } from './world/ChaseCamera';
import { CheckpointSystem } from './world/CheckpointSystem';
import { EnvironmentSetup } from './world/EnvironmentSetup';
import { TrackBuilder } from './world/TrackBuilder';

class PodManiaApp {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly composer: EffectComposer;
  private readonly env: EnvironmentSetup;

  private readonly storage = new StorageManager();
  private readonly audio = new AudioEngine();
  private readonly input: InputManager;
  private readonly hud: HudController;

  private readonly physics = new PodPhysics();
  private readonly podMesh = new PodMeshBuilder();
  private readonly podVfx = new PodVFX();
  private readonly chaseCam = new ChaseCamera();

  private activeMap: MapDefinition = getMapById('map1_dustveil');
  private track: TrackBuilder | null = null;
  private checkpoints: CheckpointSystem | null = null;

  private raceState: RaceState = 'MENU';
  private countdownSec = 2.4;
  private lastBeepStep = 3;
  private raceTimeMs = 0;
  private accumulator = 0;
  private lastFrameTime = performance.now();
  private elapsedTime = 0;

  constructor() {
    const appEl = document.getElementById('app')!;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    appEl.prepend(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      62,
      window.innerWidth / window.innerHeight,
      0.2,
      3600
    );

    this.env = new EnvironmentSetup(this.scene, this.renderer);
    this.scene.add(this.podMesh.podRoot);
    this.scene.add(this.podVfx.group);

    // Post-processing with subtle bloom for plasma binder, jets & gates
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.35,
      0.35,
      1.05
    );
    this.composer.addPass(bloom);
    this.composer.addPass(new OutputPass());

    this.input = new InputManager({
      onAnyInteraction: () => this.audio.unlock(),
      onRespawn: () => this.respawnAtCheckpoint(),
      onRestart: () => {
        if (this.raceState !== 'MENU') this.startCountdown();
      },
      onEscape: () => this.handleEscape(),
      onToggleMute: () => this.audio.toggleMute(),
    });

    this.hud = new HudController({
      onSelectMap: (mapId) => this.loadAndStartMap(mapId),
      onResume: () => {
        if (this.raceState === 'PAUSED') {
          this.raceState = 'RACING';
          this.hud.setState('RACING');
        }
      },
      onRestart: () => this.startCountdown(),
      onRespawn: () => this.respawnAtCheckpoint(),
      onBackToMenu: () => this.showMenu(),
    });

    // Load Map 01 in background for menu backdrop
    this.loadMapScene('map1_dustveil');
    this.showMenu();

    window.addEventListener('resize', () => this.onResize());
    requestAnimationFrame((t) => this.loop(t));
  }

  private loadMapScene(mapId: string): void {
    if (this.track) {
      this.scene.remove(this.track.group);
    }
    if (this.checkpoints) {
      this.scene.remove(this.checkpoints.group);
    }

    this.activeMap = getMapById(mapId);
    const biome = this.activeMap.biome ?? 'desert';
    this.env.setBiome(biome);
    this.podVfx.setBiomeDustColor(biome);
    this.track = new TrackBuilder(this.activeMap);
    this.checkpoints = new CheckpointSystem(this.track);

    this.scene.add(this.track.group);
    this.scene.add(this.checkpoints.group);

    this.resetPodToStart();
  }

  private loadAndStartMap(mapId: string): void {
    this.audio.unlock();
    if (this.activeMap.id !== mapId || !this.track) {
      this.loadMapScene(mapId);
    }
    this.startCountdown();
  }

  private resetPodToStart(): void {
    if (!this.track || !this.checkpoints) return;
    const start = this.track.startSlice;
    const startYaw = Math.atan2(-start.tangent.x, -start.tangent.z);
    const startPos = new THREE.Vector3(
      start.center.x,
      start.center.y + 1.85,
      start.center.z
    );
    this.physics.resetToPose(startPos, startYaw, 0);
    this.checkpoints.reset(startPos, startYaw);
    this.chaseCam.snapToPod(this.physics.state);
    this.podMesh.update(this.physics.state, 0.016, 0);
  }

  private startCountdown(): void {
    if (!this.checkpoints) return;
    this.resetPodToStart();
    this.raceTimeMs = 0;
    this.countdownSec = 2.4;
    this.lastBeepStep = 3;
    this.raceState = 'COUNTDOWN';
    this.hud.configureMapHud(
      this.activeMap,
      this.storage,
      this.checkpoints.totalCheckpoints
    );
    this.hud.setState('COUNTDOWN');
    this.hud.updateCountdown(this.countdownSec);
    this.audio.playCountdownBeep(false);
  }

  private respawnAtCheckpoint(): void {
    if (
      !this.checkpoints ||
      (this.raceState !== 'RACING' && this.raceState !== 'WRECKED')
    ) {
      return;
    }
    const snap = this.checkpoints.getSnapshot();
    this.physics.resetToPose(snap.pos, snap.yaw, snap.pitch);
    this.chaseCam.snapToPod(this.physics.state);
    this.raceState = 'RACING';
    this.hud.setState('RACING');
  }

  private showMenu(): void {
    this.raceState = 'MENU';
    this.hud.renderMapMenu(this.storage);
    this.hud.setState('MENU');
    this.audio.updateEngines(0, 0, 0, false, false);
  }

  private handleEscape(): void {
    if (this.raceState === 'RACING') {
      this.raceState = 'PAUSED';
      this.hud.setState('PAUSED');
      this.audio.updateEngines(0, 0, 0, false, false);
    } else if (this.raceState === 'PAUSED') {
      this.raceState = 'RACING';
      this.hud.setState('RACING');
    } else if (this.raceState === 'FINISHED' || this.raceState === 'WRECKED') {
      this.showMenu();
    }
  }

  private computeMedalAndScore(finishMs: number): {
    medal: MedalTier;
    score: number;
  } {
    const medals = this.activeMap.medalsMs ?? {
      gold: 52000,
      silver: 61000,
      bronze: 75000,
    };

    let medal: MedalTier = 'none';
    if (finishMs <= medals.gold) medal = 'gold';
    else if (finishMs <= medals.silver) medal = 'silver';
    else if (finishMs <= medals.bronze) medal = 'bronze';

    const score = Math.max(
      500,
      Math.round(100000 * Math.pow(medals.bronze / Math.max(1000, finishMs), 1.6))
    );
    return { medal, score };
  }

  private onRaceFinished(): void {
    if (!this.checkpoints) return;
    this.raceState = 'FINISHED';
    const { medal, score } = this.computeMedalAndScore(this.raceTimeMs);
    const { isNewPB, prevBestMedal } = this.storage.recordRun(
      this.activeMap.id,
      this.raceTimeMs,
      score,
      medal,
      this.checkpoints.getSplits()
    );

    const unlockedNextMap =
      compareMedals(medal, 'silver') >= 0 &&
      compareMedals(prevBestMedal, 'silver') < 0;

    this.hud.setState('FINISHED');
    this.hud.showFinishScreen({
      timeMs: this.raceTimeMs,
      medal,
      score,
      isNewPB,
      unlockedNextMap,
    });
    this.audio.playCheckpoint(true);
  }

  private loop(now: number): void {
    const rawDt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    const dt = Math.min(0.05, Math.max(0.0001, rawDt));
    this.elapsedTime += dt;

    const inputSnap = this.input.getSnapshot();

    if (this.raceState === 'COUNTDOWN') {
      this.countdownSec -= dt;
      const step = Math.ceil(this.countdownSec / 0.8);
      if (step < this.lastBeepStep && step >= 1) {
        this.lastBeepStep = step;
        this.audio.playCountdownBeep(false);
      }
      this.hud.updateCountdown(this.countdownSec);

      if (this.countdownSec <= 0) {
        this.raceState = 'RACING';
        this.hud.setState('RACING');
        this.hud.showGoFlash();
        this.audio.playCountdownBeep(true);
      }
    }

    if (
      this.track &&
      this.checkpoints &&
      (this.raceState === 'COUNTDOWN' || this.raceState === 'RACING')
    ) {
      const allowDrive = this.raceState === 'RACING';
      this.accumulator += dt;

      while (this.accumulator >= FIXED_DT) {
        this.physics.step(FIXED_DT, inputSnap, this.track, allowDrive);
        this.accumulator -= FIXED_DT;

        const st = this.physics.state;
        if (st.lastLandingEvent === 'perfect_damp') {
          this.podVfx.triggerShockwave(st.pos, st.groundHeight);
          this.hud.showEventBadge('PERFECT DAMP!', 'perfect_damp');
          this.audio.playPerfectDamp();
        } else if (st.lastLandingEvent === 'hard_impact') {
          this.podVfx.triggerSparks(st.pos, 32);
          this.chaseCam.addTrauma(Math.min(1, st.lastLandingDamage / 30));
          this.hud.showEventBadge(
            `HARD IMPACT -${Math.round(st.lastLandingDamage)}%`,
            'hard_impact'
          );
          this.audio.playImpact(st.lastLandingDamage / 40);
        } else if (st.lastLandingEvent === 'wall_scrape') {
          this.podVfx.triggerSparks(st.pos, 16);
          this.chaseCam.addTrauma(0.35);
          this.audio.playImpact(0.3);
        }

        if (allowDrive && st.hullIntegrity <= 0) {
          this.raceState = 'WRECKED';
          this.hud.setState('WRECKED');
          break;
        }
      }

      if (this.raceState === 'RACING') {
        this.raceTimeMs += dt * 1000;
        const cpRes = this.checkpoints.update(
          this.physics.state.pos,
          this.raceTimeMs
        );
        if (cpRes.crossedCp !== null && cpRes.splitTimeMs !== null) {
          const pbSplits = this.storage.getMapRecord(this.activeMap.id)
            .checkpointSplitsMs;
          const refSplit =
            pbSplits && pbSplits[cpRes.crossedCp - 1] !== undefined
              ? pbSplits[cpRes.crossedCp - 1]
              : null;
          const delta = refSplit !== null ? cpRes.splitTimeMs - refSplit : null;
          this.hud.showCheckpointSplit(
            cpRes.crossedCp,
            this.checkpoints.totalCheckpoints,
            delta
          );
          this.audio.playCheckpoint(delta === null || delta <= 0);
        } else if (cpRes.finished) {
          this.onRaceFinished();
        }
      }

      const st = this.physics.state;
      this.podMesh.update(st, dt, this.elapsedTime);
      this.podVfx.update(st, dt);
      this.chaseCam.update(this.camera, st, dt);
      this.env.update(st.pos);
      this.audio.updateEngines(
        st.pLeft,
        st.pRight,
        st.speedMs,
        st.damperFiring,
        this.raceState === 'RACING' || this.raceState === 'COUNTDOWN'
      );
      this.hud.updateTelemetry(
        st,
        inputSnap,
        this.raceTimeMs,
        this.checkpoints.getCurrentCpNumber(),
        this.checkpoints.totalCheckpoints
      );
    } else if (this.raceState === 'MENU') {
      // Gentle scenic idle orbit around the podracer at Start
      const st = this.physics.state;
      this.podMesh.update(st, dt, this.elapsedTime);
      const angle = this.elapsedTime * 0.25;
      this.camera.position.set(
        st.pos.x + Math.sin(angle) * 11,
        st.pos.y + 3.6,
        st.pos.z + Math.cos(angle) * 11
      );
      this.camera.lookAt(st.pos.x, st.pos.y + 0.8, st.pos.z - 1.5);
      this.env.update(st.pos);
    }

    this.composer.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }
}

new PodManiaApp();
