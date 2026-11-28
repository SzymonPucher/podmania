import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { AudioEngine } from './core/AudioEngine';
import { FullscreenManager } from './core/FullscreenManager';
import { InputManager } from './core/InputManager';
import { compareMedals, StorageManager } from './core/StorageManager';
import { getMapById } from './maps/mapRegistry';
import { FIXED_DT, WRECK_ANIM_DURATION_SEC } from './pod/PodConfig';
import { PodDisassembly } from './pod/PodDisassembly';
import { PodMeshBuilder } from './pod/PodMeshBuilder';
import { PodPhysics } from './pod/PodPhysics';
import { PodVFX } from './pod/PodVFX';
import type {
  MapDefinition,
  MedalTier,
  PodModificationId,
  RaceState,
} from './types';
import { HudController } from './ui/HudController';
import { ChaseCamera } from './world/ChaseCamera';
import { CheckpointSystem } from './world/CheckpointSystem';
import { EnvironmentSetup } from './world/EnvironmentSetup';
import { TrackBuilder } from './world/TrackBuilder';

class PodManiaApp {
  private readonly appEl: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly composer: EffectComposer;
  private readonly env: EnvironmentSetup;

  private readonly storage = new StorageManager();
  private readonly audio = new AudioEngine();
  private readonly fullscreen: FullscreenManager;
  private readonly input: InputManager;
  private readonly hud: HudController;
  private resizeRafId: number | null = null;
  private fullscreenResizeTimer: number | null = null;

  private readonly physics = new PodPhysics();
  private readonly podMesh = new PodMeshBuilder();
  private readonly podVfx = new PodVFX();
  private readonly disassembly = new PodDisassembly();
  private readonly chaseCam = new ChaseCamera();

  private activeMap: MapDefinition = getMapById('map1_dustveil');
  private selectedMod: PodModificationId = 'none';
  private track: TrackBuilder | null = null;
  private checkpoints: CheckpointSystem | null = null;

  private raceState: RaceState = 'MENU';
  private countdownSec = 2.4;
  private wreckTimerSec = 0;
  private lastBeepStep = 3;
  private falseStartTriggered = false;
  private raceTimeMs = 0;
  private accumulator = 0;
  private lastFrameTime = performance.now();
  private elapsedTime = 0;

  private readonly tmpWreckFocusPos = new THREE.Vector3();
  private readonly tmpWreckFocusVel = new THREE.Vector3();
  private readonly tmpCamRight = new THREE.Vector3();

  constructor() {
    this.appEl = document.getElementById('app')!;
    const { width: initW, height: initH } = this.getViewportSize();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    const initDpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(initDpr);
    this.renderer.setSize(initW, initH, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.appEl.prepend(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      62,
      initW / initH,
      0.2,
      3600
    );

    this.env = new EnvironmentSetup(this.scene, this.renderer);
    this.scene.add(this.podMesh.podRoot);
    this.scene.add(this.disassembly.group);
    this.scene.add(this.podVfx.group);

    // Post-processing with subtle bloom for plasma binder, jets & gates
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(initDpr);
    this.composer.setSize(initW, initH);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(initW, initH),
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
    const touchEl = document.getElementById('touch-controls');
    if (touchEl) {
      this.input.attachTouchElement(touchEl);
    }

    this.fullscreen = new FullscreenManager({
      onChange: (isFullscreen, didExit) => {
        this.hud.setFullscreenState(isFullscreen, this.fullscreen.isSupported());
        this.scheduleResize();
        if (this.fullscreenResizeTimer !== null) {
          window.clearTimeout(this.fullscreenResizeTimer);
        }
        // Catch delayed Android/Firefox system bar animations
        this.fullscreenResizeTimer = window.setTimeout(() => {
          this.fullscreenResizeTimer = null;
          this.scheduleResize();
        }, 160);

        if (didExit) {
          this.pauseRace();
        }
      },
    });

    this.hud = new HudController({
      onSelectMap: (mapId) => this.loadAndStartMap(mapId),
      onSelectModification: (modId) => this.selectModification(modId),
      onPause: () => this.handleEscape(),
      onResume: () => this.resumeRace(),
      onRestart: () => this.startCountdown(),
      onRespawn: () => this.respawnAtCheckpoint(),
      onBackToMenu: () => this.showMenu(),
      onToggleFullscreen: () => this.fullscreen.toggle(),
    });
    this.hud.setFullscreenState(
      this.fullscreen.isFullscreen(),
      this.fullscreen.isSupported()
    );

    this.selectedMod = this.storage.getSelectedModification();
    this.physics.setModification(this.selectedMod);
    this.podMesh.setModification(this.selectedMod);

    // Load Map 01 in background for menu backdrop
    this.loadMapScene('map1_dustveil');
    this.showMenu();

    window.addEventListener('resize', () => this.scheduleResize());
    window.visualViewport?.addEventListener('resize', () => this.scheduleResize());
    screen.orientation?.addEventListener('change', () => this.scheduleResize());
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.scheduleResize());
      ro.observe(this.appEl);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseRace();
        this.audio.suspend();
      } else {
        this.audio.resume();
        this.scheduleResize();
      }
    });

    this.registerServiceWorker();
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
    this.checkpoints = new CheckpointSystem(
      this.track,
      this.activeMap.laps ?? 1,
      Boolean(this.activeMap.isLoop)
    );

    this.scene.add(this.track.group);
    this.scene.add(this.checkpoints.group);

    this.resetPodToStart();
  }

  private selectModification(modId: PodModificationId): void {
    this.selectedMod = modId;
    this.storage.setSelectedModification(modId);
    this.physics.setModification(modId);
    this.podMesh.setModification(modId);
    this.hud.renderModificationMenu(modId);
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
    this.disassembly.reassemble(this.podMesh, this.selectedMod);
    this.podVfx.clearAll();
    const start = this.track.startSlice;
    const startYaw = Math.atan2(-start.tangent.x, -start.tangent.z);
    const startPos = new THREE.Vector3(
      start.center.x,
      start.center.y + 1.85,
      start.center.z
    );
    this.physics.resetToPose(startPos, startYaw, 0);
    this.checkpoints.reset(startPos, startYaw, this.physics.state.modTankSec);
    this.chaseCam.snapToPod(this.physics.state);
    this.podMesh.update(this.physics.state, 0.016, 0);
  }

  private startCountdown(): void {
    if (!this.checkpoints) return;
    (document.activeElement as HTMLElement | null)?.blur();
    this.resetPodToStart();
    this.raceTimeMs = 0;
    this.countdownSec = 2.4;
    this.wreckTimerSec = 0;
    this.accumulator = 0;
    this.lastBeepStep = 3;
    this.falseStartTriggered = false;
    this.raceState = 'COUNTDOWN';
    this.hud.configureMapHud(
      this.activeMap,
      this.storage,
      this.checkpoints.totalCheckpoints,
      this.checkpoints.totalLaps,
      this.selectedMod
    );
    this.hud.setState('COUNTDOWN');
    this.hud.updateCountdown(this.countdownSec);
    this.fullscreen.setWakeLockActive(true);
    this.audio.playCountdownBeep(false);
  }

  private respawnAtCheckpoint(): void {
    if (
      !this.checkpoints ||
      (this.raceState !== 'RACING' &&
        this.raceState !== 'WRECKING' &&
        this.raceState !== 'WRECKED')
    ) {
      return;
    }
    this.disassembly.reassemble(this.podMesh, this.selectedMod);
    this.podVfx.clearAll();
    const snap = this.checkpoints.getSnapshot();
    this.physics.resetToPose(snap.pos, snap.yaw, snap.pitch, snap.modTankSec);
    this.podMesh.update(this.physics.state, 0.016, this.elapsedTime);
    this.chaseCam.snapToPod(this.physics.state);
    this.wreckTimerSec = 0;
    this.accumulator = 0;
    this.raceState = 'RACING';
    this.hud.setState('RACING');
    this.fullscreen.setWakeLockActive(true);
  }

  private showMenu(): void {
    this.input.clearAll();
    this.resetPodToStart();
    this.wreckTimerSec = 0;
    this.raceState = 'MENU';
    this.hud.renderMapMenu(this.storage, this.selectedMod);
    this.hud.setState('MENU');
    this.fullscreen.setWakeLockActive(false);
    this.audio.updateEngines(0, 0, 0, 0, false, false);
  }

  private pauseRace(): void {
    if (this.raceState !== 'RACING') return;
    this.input.clearTouch();
    this.raceState = 'PAUSED';
    this.hud.setState('PAUSED');
    this.fullscreen.setWakeLockActive(false);
    this.audio.updateEngines(0, 0, 0, 0, false, false);
  }

  private resumeRace(): void {
    if (this.raceState !== 'PAUSED') return;
    this.raceState = 'RACING';
    this.hud.setState('RACING');
    this.fullscreen.setWakeLockActive(true);
  }

  private handleEscape(): void {
    if (this.raceState === 'RACING') {
      this.pauseRace();
    } else if (this.raceState === 'PAUSED') {
      this.resumeRace();
    } else if (
      this.raceState === 'FINISHED' ||
      this.raceState === 'WRECKING' ||
      this.raceState === 'WRECKED'
    ) {
      this.showMenu();
    }
  }

  private triggerWreckSequence(): void {
    const st = this.physics.state;
    st.hullIntegrity = 0;
    this.input.clearAll();

    // Sync intact pod mesh to exact wreck pose before detaching parts into world space
    this.podMesh.update(st, FIXED_DT, this.elapsedTime);
    this.disassembly.start(
      st,
      this.physics.lastWreckInfo,
      this.podMesh,
      this.podVfx,
      this.audio
    );
    this.chaseCam.addTrauma(1.0);
    this.audio.updateEngines(0, 0, 0, 0, false, false);

    this.wreckTimerSec = WRECK_ANIM_DURATION_SEC;
    this.accumulator = 0;
    this.raceState = 'WRECKING';
    this.hud.setState('WRECKING');
    this.fullscreen.setWakeLockActive(false);
    this.hud.updateTouchControls(this.input.getTouchState(), st);
    this.hud.updateWreckSequence(
      this.wreckTimerSec,
      WRECK_ANIM_DURATION_SEC,
      this.raceTimeMs,
      st.speedKmh
    );
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
    this.input.clearTouch();
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
    this.fullscreen.setWakeLockActive(false);
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
      const nitroJumpStart = this.selectedMod === 'nitro' && inputSnap.spaceHeld;
      if (
        !this.falseStartTriggered &&
        (inputSnap.targetLeft !== 0 || inputSnap.targetRight !== 0 || nitroJumpStart)
      ) {
        this.falseStartTriggered = true;
        this.raceTimeMs += 5000;
        this.hud.showEventBadge('FALSE START! +5.0s PENALTY', 'false_start');
        this.audio.playImpact(0.45);
      }

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
      const allowDrive =
        this.raceState === 'RACING' || this.raceState === 'COUNTDOWN';
      this.accumulator += dt;

      while (this.accumulator >= FIXED_DT) {
        this.physics.step(
          FIXED_DT,
          inputSnap,
          this.track,
          allowDrive,
          this.raceState === 'RACING'
        );
        this.accumulator -= FIXED_DT;

        const st = this.physics.state;
        if (st.airborneOverload) {
          this.chaseCam.addTrauma(FIXED_DT * 1.4);
        } else if (st.nitroActive) {
          this.chaseCam.addTrauma(FIXED_DT * 0.45);
        }

        if (st.lastLandingEvent === 'vector_boost') {
          this.podVfx.triggerShockwave(st.pos, st.groundHeight);
          this.chaseCam.addTrauma(0.22);
          this.hud.showEventBadge(
            `VECTOR BOOST! +${st.lastLandingBoostKmh} KM/H`,
            'vector_boost'
          );
          this.audio.playPerfectDamp(true);
        } else if (st.lastLandingEvent === 'damped_landing') {
          this.podVfx.triggerShockwave(st.pos, st.groundHeight);
          this.hud.showEventBadge('DAMPED LANDING', 'perfect_damp');
          this.audio.playPerfectDamp(false);
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

        if (st.lastOverheatDamage > 0) {
          this.podVfx.triggerSparks(st.pos, 24);
          this.chaseCam.addTrauma(0.35);
          this.hud.showEventBadge(
            `ENGINE OVERHEAT -${Math.round(st.lastOverheatDamage)}%`,
            'hard_impact'
          );
          this.audio.playImpact(0.35);
        }

        if (allowDrive && st.hullIntegrity <= 0) {
          this.triggerWreckSequence();
          break;
        }
      }

      if (this.raceState === 'RACING') {
        this.raceTimeMs += dt * 1000;
        const cpRes = this.checkpoints.update(
          this.physics.state.pos,
          this.raceTimeMs,
          this.physics.state.modTankSec
        );
        if (cpRes.crossedCp !== null && cpRes.splitTimeMs !== null) {
          const pbSplits = this.storage.getMapRecord(this.activeMap.id)
            .checkpointSplitsMs;
          const idx = (cpRes.splitIndex ?? cpRes.crossedCp) - 1;
          const refSplit =
            pbSplits && pbSplits[idx] !== undefined ? pbSplits[idx] : null;
          const delta = refSplit !== null ? cpRes.splitTimeMs - refSplit : null;
          this.hud.showCheckpointSplit(
            cpRes.crossedCp,
            this.checkpoints.totalCheckpoints,
            delta
          );
          this.audio.playCheckpoint(delta === null || delta <= 0);
        } else if (
          cpRes.completedLap !== null &&
          !cpRes.finished &&
          cpRes.splitTimeMs !== null
        ) {
          const pbSplits = this.storage.getMapRecord(this.activeMap.id)
            .checkpointSplitsMs;
          const idx = (cpRes.splitIndex ?? 1) - 1;
          const refSplit =
            pbSplits && pbSplits[idx] !== undefined ? pbSplits[idx] : null;
          const delta = refSplit !== null ? cpRes.splitTimeMs - refSplit : null;
          this.hud.showCheckpointSplit(
            0,
            this.checkpoints.totalCheckpoints,
            delta
          );
          const nextLap = this.checkpoints.getCurrentLap();
          const lapText =
            nextLap === this.checkpoints.totalLaps
              ? `FINAL LAP! (${nextLap} / ${this.checkpoints.totalLaps})`
              : `LAP ${nextLap} / ${this.checkpoints.totalLaps}`;
          this.hud.showEventBadge(lapText, 'vector_boost');
          this.audio.playCheckpoint(true);
        } else if (cpRes.finished) {
          this.onRaceFinished();
        }
      }

      if (this.raceState === 'COUNTDOWN' || this.raceState === 'RACING') {
        const st = this.physics.state;
        this.podMesh.update(st, dt, this.elapsedTime);
        this.podVfx.update(st, dt);
        this.chaseCam.update(this.camera, st, dt);
        const nearFeat = this.track?.findNearestSlice(st.pos.x, st.pos.z, st.pos.y).feature;
        const inCave = nearFeat === 'cave' || nearFeat === 'stalactite_corridor';
        this.env.update(st.pos, inCave);
        this.audio.updateEngines(
          st.pLeft,
          st.pRight,
          st.speedMs,
          st.landingBoost,
          st.airborneOverload,
          true,
          st.nitroActive,
          st.coolantActive
        );
        this.hud.updateTelemetry(
          st,
          inputSnap,
          this.raceTimeMs,
          this.checkpoints.getCurrentCpNumber(),
          this.checkpoints.totalCheckpoints,
          this.checkpoints.getCurrentLap(),
          this.checkpoints.totalLaps
        );
        this.hud.updateTouchControls(this.input.getTouchState(), st);
      }
    } else if (this.raceState === 'WRECKING' && this.track) {
      const st = this.physics.state;
      const wreckClockDt = Math.min(0.2, Math.max(0.0001, rawDt));
      this.wreckTimerSec -= wreckClockDt;
      this.accumulator += dt;
      this.tmpCamRight.set(1, 0, 0).applyQuaternion(this.camera.quaternion);

      while (this.accumulator >= FIXED_DT) {
        const { majorImpactTrauma } = this.disassembly.step(
          FIXED_DT,
          this.elapsedTime,
          st,
          this.physics.lastWreckInfo,
          this.track,
          this.podMesh,
          this.podVfx,
          this.audio,
          this.camera.position,
          this.tmpCamRight
        );
        if (majorImpactTrauma > 0) {
          this.chaseCam.addTrauma(majorImpactTrauma);
        }
        this.accumulator -= FIXED_DT;
      }

      this.podVfx.stepParticlesOnly(dt);
      this.disassembly.getFocusTarget(this.tmpWreckFocusPos, this.tmpWreckFocusVel);

      const wreckElapsed =
        WRECK_ANIM_DURATION_SEC - Math.max(0, this.wreckTimerSec);
      this.chaseCam.updateWreckCamera(
        this.camera,
        this.tmpWreckFocusPos,
        this.tmpWreckFocusVel,
        this.track,
        wreckElapsed,
        dt
      );

      const nearFeat = this.track.findNearestSlice(
        this.tmpWreckFocusPos.x,
        this.tmpWreckFocusPos.z,
        this.tmpWreckFocusPos.y
      ).feature;
      const inCave = nearFeat === 'cave' || nearFeat === 'stalactite_corridor';
      this.env.update(this.tmpWreckFocusPos, inCave);

      this.hud.updateWreckSequence(
        this.wreckTimerSec,
        WRECK_ANIM_DURATION_SEC,
        this.raceTimeMs,
        this.disassembly.getCockpitSpeedKmh()
      );

      if (this.wreckTimerSec <= 0) {
        this.wreckTimerSec = 0;
        this.raceState = 'WRECKED';
        this.hud.setState('WRECKED');
      }
    } else if (this.raceState === 'WRECKED') {
      this.podVfx.stepParticlesOnly(dt);
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
      const nearFeat = this.track?.findNearestSlice(st.pos.x, st.pos.z, st.pos.y).feature;
      const inCave = nearFeat === 'cave' || nearFeat === 'stalactite_corridor';
      this.env.update(st.pos, inCave);
    }

    this.composer.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  private getViewportSize(): { width: number; height: number } {
    const rawW =
      this.appEl.clientWidth ||
      window.visualViewport?.width ||
      window.innerWidth;
    const rawH =
      this.appEl.clientHeight ||
      window.visualViewport?.height ||
      window.innerHeight;
    return {
      width: Math.max(1, Math.round(rawW)),
      height: Math.max(1, Math.round(rawH)),
    };
  }

  private scheduleResize(): void {
    if (this.resizeRafId !== null) return;
    this.resizeRafId = requestAnimationFrame(() => {
      this.resizeRafId = null;
      this.onResize();
    });
  }

  private onResize(): void {
    const { width: w, height: h } = this.getViewportSize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
  }

  private registerServiceWorker(): void {
    const isProd = Boolean(
      (import.meta as unknown as { env?: { PROD?: boolean } }).env?.PROD
    );
    if (!isProd || !('serviceWorker' in navigator)) {
      return;
    }
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
        /* ignore service worker registration errors */
      });
    });
  }
}

new PodManiaApp();
