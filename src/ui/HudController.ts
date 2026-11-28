import type { StorageManager } from '../core/StorageManager';
import {
  TOUCH_SLIDER_REV_FRAC,
  TOUCH_SLIDER_TOP_FRAC,
  TOUCH_SLIDER_ZERO_FRAC,
} from '../core/InputManager';
import { DIFFICULTY_TIERS, getMapById, MAP_REGISTRY } from '../maps/mapRegistry';
import {
  getHullPerformanceScale,
  getModificationById,
  POD_CONFIG,
  POD_MODIFICATIONS,
} from '../pod/PodConfig';
import type {
  InputSnapshot,
  MapDefinition,
  MapDifficulty,
  MedalTier,
  PodModificationId,
  PodTelemetry,
  RaceState,
  TouchControlsState,
  TouchFingerState,
} from '../types';

const RAIL_ZERO_PCT =
  ((TOUCH_SLIDER_ZERO_FRAC - TOUCH_SLIDER_TOP_FRAC) /
    (TOUCH_SLIDER_REV_FRAC - TOUCH_SLIDER_TOP_FRAC)) *
  100;

export function formatTimeMs(ms: number): string {
  const totalMs = Math.max(0, Math.round(ms));
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export interface HudActions {
  onSelectMap: (mapId: string) => void;
  onSelectModification: (modId: PodModificationId) => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onRespawn: () => void;
  onBackToMenu: () => void;
  onToggleFullscreen: () => void;
  onOpenHowToPlay: () => void;
}

export class HudController {
  private readonly hudEl = document.getElementById('hud')!;
  private readonly touchControlsEl = document.getElementById('touch-controls')!;
  private readonly touchRailLeftEl = document.getElementById('touch-rail-fill-left')!;
  private readonly touchRailRightEl = document.getElementById('touch-rail-fill-right')!;
  private readonly touchMidCueEl = document.getElementById('touch-mid-cue')!;
  private readonly touchMidLabelEl = document.getElementById('touch-mid-label')!;
  private readonly touchFingerLeftEl = document.getElementById('touch-finger-left')!;
  private readonly touchFingerRightEl = document.getElementById('touch-finger-right')!;
  private readonly menuEl = document.getElementById('menu-overlay')!;
  private readonly pauseEl = document.getElementById('pause-overlay')!;
  private readonly wreckedEl = document.getElementById('wrecked-overlay')!;
  private readonly finishEl = document.getElementById('finish-overlay')!;
  private readonly modGridEl = document.getElementById('mod-grid')!;
  private readonly menuModPillEl = document.getElementById('menu-selected-mod-pill')!;
  private readonly diffTabsEl = document.getElementById('difficulty-tabs')!;
  private readonly mapGridEl = document.getElementById('map-grid')!;

  private readonly mapNameEl = document.getElementById('hud-map-name')!;
  private readonly hudModNameEl = document.getElementById('hud-mod-name')!;
  private readonly hudSpaceHintEl = document.getElementById('hud-space-hint')!;
  private readonly hudSpaceActionEl = document.getElementById('hud-space-action')!;
  private readonly timerEl = document.getElementById('hud-timer')!;
  private readonly lapProgressEl = document.getElementById('hud-lap-progress')!;
  private readonly cpProgressEl = document.getElementById('hud-cp-progress')!;
  private readonly splitPillEl = document.getElementById('hud-split-pill')!;

  private readonly targetGoldEl = document.getElementById('hud-target-gold')!;
  private readonly targetSilverEl = document.getElementById('hud-target-silver')!;
  private readonly targetBronzeEl = document.getElementById('hud-target-bronze')!;
  private readonly targetPbEl = document.getElementById('hud-target-pb')!;

  private readonly hullPctEl = document.getElementById('hud-hull-pct')!;
  private readonly hullBarEl = document.getElementById('hud-hull-bar')!;

  private readonly countdownEl = document.getElementById('hud-countdown')!;
  private readonly eventBadgeEl = document.getElementById('hud-event-badge')!;
  private readonly rudBannerEl = document.getElementById('hud-rud-banner')!;
  private readonly rudBarEl = document.getElementById('hud-rud-bar')!;

  private readonly speedEl = document.getElementById('hud-speed')!;
  private readonly modTankSectionEl = document.getElementById('hud-mod-tank-section')!;
  private readonly modTankLabelEl = document.getElementById('hud-mod-tank-label')!;
  private readonly modTankValEl = document.getElementById('hud-mod-tank-val')!;
  private readonly modTankBarEl = document.getElementById('hud-mod-tank-bar')!;

  private readonly leftWidgetEl = document.getElementById('hud-left-widget')!;
  private readonly rightWidgetEl = document.getElementById('hud-right-widget')!;
  private readonly leftPctEl = document.getElementById('hud-left-pct')!;
  private readonly rightPctEl = document.getElementById('hud-right-pct')!;
  private readonly leftBarEl = document.getElementById('hud-left-bar')!;
  private readonly rightBarEl = document.getElementById('hud-right-bar')!;
  private readonly leftHeatPctEl = document.getElementById('hud-left-heat-pct')!;
  private readonly rightHeatPctEl = document.getElementById('hud-right-heat-pct')!;
  private readonly leftHeatBarEl = document.getElementById('hud-left-heat-bar')!;
  private readonly rightHeatBarEl = document.getElementById('hud-right-heat-bar')!;

  private readonly leftKeycaps = Array.from(
    document.querySelectorAll<HTMLElement>('#hud-left-keys .keycap')
  );
  private readonly rightKeycaps = Array.from(
    document.querySelectorAll<HTMLElement>('#hud-right-keys .keycap')
  );

  private readonly finishTitleEl = document.getElementById('finish-title')!;
  private readonly finishUnlockEl = document.getElementById('finish-unlock-banner')!;
  private readonly finishTimeEl = document.getElementById('finish-time')!;
  private readonly finishMedalEl = document.getElementById('finish-medal')!;
  private readonly finishScoreEl = document.getElementById('finish-score')!;

  private splitHideTimeout: number | null = null;
  private badgeHideTimeout: number | null = null;
  private activeDifficultyFilter: MapDifficulty | 'all' = 'all';
  private minimalHud = localStorage.getItem('podmania.hudMinimal') === '1';

  constructor(private readonly actions: HudActions) {
    document.getElementById('btn-resume')?.addEventListener('click', () => this.actions.onResume());
    document.getElementById('btn-pause-restart')?.addEventListener('click', () => this.actions.onRestart());
    document.getElementById('btn-pause-menu')?.addEventListener('click', () => this.actions.onBackToMenu());
    document.getElementById('btn-wreck-respawn')?.addEventListener('click', () => this.actions.onRespawn());
    document.getElementById('btn-wreck-restart')?.addEventListener('click', () => this.actions.onRestart());
    document.getElementById('btn-finish-menu')?.addEventListener('click', () => this.actions.onBackToMenu());
    document.getElementById('btn-finish-retry')?.addEventListener('click', () => this.actions.onRestart());
    document.getElementById('btn-hud-respawn')?.addEventListener('click', () => this.actions.onRespawn());
    document.getElementById('btn-hud-restart')?.addEventListener('click', () => this.actions.onRestart());
    document.getElementById('btn-hud-pause')?.addEventListener('click', () => this.actions.onPause());
    document.getElementById('btn-hud-toggle')?.addEventListener('click', () => this.toggleMinimalHud());
    document.getElementById('btn-pause-hud')?.addEventListener('click', () => this.toggleMinimalHud());
    document.getElementById('btn-hud-fullscreen')?.addEventListener('click', () => this.actions.onToggleFullscreen());
    document.getElementById('btn-pause-fullscreen')?.addEventListener('click', () => this.actions.onToggleFullscreen());
    document.getElementById('btn-menu-fullscreen')?.addEventListener('click', () => this.actions.onToggleFullscreen());
    document.getElementById('btn-menu-htp')?.addEventListener('click', () => this.actions.onOpenHowToPlay());
    document.getElementById('btn-menu-htp-footer')?.addEventListener('click', () => this.actions.onOpenHowToPlay());
    document.getElementById('btn-pause-htp')?.addEventListener('click', () => this.actions.onOpenHowToPlay());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyH' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
        this.toggleMinimalHud();
      }
    });
    this.applyMinimalHud();
  }

  public setFullscreenState(isFullscreen: boolean, isSupported: boolean): void {
    const hudBtn = document.getElementById('btn-hud-fullscreen');
    const pauseBtn = document.getElementById('btn-pause-fullscreen');
    const menuBtn = document.getElementById('btn-menu-fullscreen');

    for (const btn of [hudBtn, pauseBtn, menuBtn]) {
      if (!btn) continue;
      btn.classList.toggle('hidden', !isSupported);
      btn.setAttribute('aria-pressed', isFullscreen ? 'true' : 'false');
    }

    if (hudBtn) {
      hudBtn.classList.toggle('active-fs', isFullscreen);
      hudBtn.title = isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen';
    }
    if (pauseBtn) {
      pauseBtn.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
    }
    if (menuBtn) {
      menuBtn.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
    }
  }

  public toggleMinimalHud(): void {
    this.minimalHud = !this.minimalHud;
    try {
      localStorage.setItem('podmania.hudMinimal', this.minimalHud ? '1' : '0');
    } catch {
      /* ignore storage errors */
    }
    this.applyMinimalHud();
  }

  private applyMinimalHud(): void {
    this.hudEl.classList.toggle('hud-minimal', this.minimalHud);
    const pauseBtn = document.getElementById('btn-pause-hud');
    if (pauseBtn) pauseBtn.textContent = this.minimalHud ? 'HUD: Speed + Time (H)' : 'HUD: Full (H)';  }

  public setState(state: RaceState): void {
    const showTouch = state === 'COUNTDOWN' || state === 'RACING';
    this.touchControlsEl.classList.toggle('hidden', !showTouch);
    this.hudEl.classList.toggle('hidden', state === 'MENU');
    this.menuEl.classList.toggle('hidden', state !== 'MENU');
    this.pauseEl.classList.toggle('hidden', state !== 'PAUSED');
    this.rudBannerEl.classList.toggle('hidden', state !== 'WRECKING');
    this.wreckedEl.classList.toggle('hidden', state !== 'WRECKED');
    this.finishEl.classList.toggle('hidden', state !== 'FINISHED');
    if (state !== 'COUNTDOWN') {
      this.countdownEl.classList.add('hidden');
    }
    if (state === 'WRECKING' || state === 'WRECKED') {
      this.clearBadgeTimer();
      this.eventBadgeEl.dataset.livePrompt = '0';
      this.eventBadgeEl.classList.add('hidden');
    }
    if (state === 'WRECKING') {
      this.rudBarEl.style.width = '100%';
    }
  }

  public renderModificationMenu(selectedMod: PodModificationId): void {
    const activeDef = getModificationById(selectedMod);
    this.menuModPillEl.textContent = `Equipped: ${activeDef.name}`;
    this.menuModPillEl.style.borderColor = activeDef.accentColor;
    this.menuModPillEl.style.color = activeDef.accentColor;

    this.modGridEl.innerHTML = '';
    for (const mod of POD_MODIFICATIONS) {
      const isSelected = mod.id === selectedMod;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `mod-card ${isSelected ? 'selected' : ''}`;
      card.style.setProperty('--mod-accent', mod.accentColor);

      const bonusesHtml = mod.bonuses
        .map((b) => `<div class="mod-effect-pro">+ ${b}</div>`)
        .join('');
      const drawbacksHtml = mod.drawbacks
        .map((d) => `<div class="mod-effect-con">&minus; ${d}</div>`)
        .join('');

      card.innerHTML = `
        <div class="mod-card-top">
          <span class="mod-card-tag">${mod.tag}</span>
          ${isSelected ? '<span class="mod-equipped-pill">Equipped</span>' : ''}
        </div>
        <h3>${mod.name}</h3>
        <p class="mod-card-summary">${mod.summary}</p>
        <div class="mod-effects">
          ${bonusesHtml}
          ${drawbacksHtml}
        </div>
      `;

      card.addEventListener('click', () => {
        this.actions.onSelectModification(mod.id);
      });

      this.modGridEl.appendChild(card);
    }
  }

  public renderMapMenu(storage: StorageManager, selectedMod: PodModificationId): void {
    this.renderModificationMenu(selectedMod);
    this.renderDifficultyTabs(storage, selectedMod);
    this.mapGridEl.innerHTML = '';

    const tiersToShow =
      this.activeDifficultyFilter === 'all'
        ? DIFFICULTY_TIERS
        : DIFFICULTY_TIERS.filter((t) => t.id === this.activeDifficultyFilter);

    for (const tier of tiersToShow) {
      const tierMaps = MAP_REGISTRY.filter((m) => (m.difficulty ?? 'easy') === tier.id);
      if (tierMaps.length === 0) continue;

      const sectionEl = document.createElement('div');
      sectionEl.className = 'difficulty-group';
      sectionEl.innerHTML = `
        <div class="difficulty-group-header">
          <span class="difficulty-group-title" style="color: ${tier.color};">${tier.label} (${tierMaps.length})</span>
          <span class="difficulty-group-sub">${tier.subtitle}</span>
        </div>
      `;

      const gridEl = document.createElement('div');
      gridEl.className = 'map-grid';

      for (const map of tierMaps) {
        const unlocked = storage.isMapUnlocked(map);
        const record = storage.getMapRecord(map.id);

        const card = document.createElement('div');
        card.className = `map-card ${map.playable && unlocked ? 'selected-playable' : ''} ${!unlocked ? 'locked' : ''}`;

        const medalText = record.bestMedal === 'none' ? 'No Medal' : record.bestMedal.toUpperCase();
        const pbText = record.bestTimeMs !== null ? formatTimeMs(record.bestTimeMs) : '--:--.---';
        const goldText = map.medalsMs ? formatTimeMs(map.medalsMs.gold) : '--:--.---';
        const laps = map.laps ?? 1;
        const isMarathon = (map.medalsMs?.gold ?? 0) >= 180000;

        const badges: string[] = [
          `<span class="map-pill" style="border-color: ${tier.color}; color: ${tier.color};">${tier.label}</span>`,
        ];
        if (map.isLoop || laps > 1) {
          badges.push(`<span class="map-pill map-pill-loop">${laps}-Lap Loop</span>`);
        }
        if (isMarathon) {
          badges.push(`<span class="map-pill map-pill-marathon">3+ Min Epic</span>`);
        }

        let statusHtml = '';
        if (!unlocked && map.unlockRequirement) {
          const reqMap = getMapById(map.unlockRequirement.mapId);
          statusHtml = `<button class="btn btn-secondary" disabled>LOCKED — Beat ${map.unlockRequirement.minMedal.toUpperCase()} on ${reqMap.name}</button>`;
        } else if (!map.playable) {
          statusHtml = `<button class="btn btn-secondary" disabled>Coming Soon</button>`;
        } else {
          statusHtml = `<button class="btn btn-primary" data-map-id="${map.id}">Launch Time Trial</button>`;
        }

        card.innerHTML = `
          <div>
            <div class="map-badges-row">${badges.join('')}</div>
            <div class="map-title-tag">${map.subtitle}</div>
            <h3>${map.name}</h3>
            <p>${map.description}</p>
          </div>
          <div>
            <div class="map-stats">
              <span>Gold: <strong>${goldText}</strong></span>
              <span>Best: <strong>${pbText}</strong></span>
              <span>Medal: <strong>${medalText}</strong></span>
            </div>
            <div style="margin-top: 12px;">${statusHtml}</div>
          </div>
        `;

        const playBtn = card.querySelector<HTMLButtonElement>('button[data-map-id]');
        if (playBtn) {
          playBtn.addEventListener('click', () => this.actions.onSelectMap(map.id));
        }

        gridEl.appendChild(card);
      }

      sectionEl.appendChild(gridEl);
      this.mapGridEl.appendChild(sectionEl);
    }
  }

  private renderDifficultyTabs(
    storage: StorageManager,
    selectedMod: PodModificationId
  ): void {
    this.diffTabsEl.innerHTML = '';
    const options: { id: MapDifficulty | 'all'; label: string }[] = [
      { id: 'all', label: `All (${MAP_REGISTRY.length})` },
      ...DIFFICULTY_TIERS.map((t) => ({
        id: t.id,
        label: `${t.label} (${MAP_REGISTRY.filter((m) => (m.difficulty ?? 'easy') === t.id).length})`,
      })),
    ];

    for (const opt of options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `diff-tab ${this.activeDifficultyFilter === opt.id ? 'active' : ''}`;
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        this.activeDifficultyFilter = opt.id;
        this.renderMapMenu(storage, selectedMod);
      });
      this.diffTabsEl.appendChild(btn);
    }
  }

  public configureMapHud(
    map: MapDefinition,
    storage: StorageManager,
    totalCps: number,
    totalLaps: number,
    selectedMod: PodModificationId
  ): void {
    const modDef = getModificationById(selectedMod);
    this.mapNameEl.textContent = map.name;
    this.hudModNameEl.textContent = modDef.shortName;
    this.hudModNameEl.style.borderColor = modDef.accentColor;
    this.hudModNameEl.style.color = modDef.accentColor;

    if (selectedMod === 'nitro') {
      this.hudSpaceHintEl.classList.remove('hidden');
      this.hudSpaceActionEl.textContent = 'Nitro Boost';
      this.modTankSectionEl.classList.remove('hidden');
      this.modTankLabelEl.textContent = 'Nitro [Space]';
      this.modTankBarEl.style.background = '#f97316';
      this.touchMidCueEl.classList.remove('hidden');
      this.touchMidCueEl.style.color = '#f97316';
      this.touchMidLabelEl.textContent = 'NITRO';
    } else if (selectedMod === 'cooled') {
      this.hudSpaceHintEl.classList.remove('hidden');
      this.hudSpaceActionEl.textContent = 'Engine Coolant';
      this.modTankSectionEl.classList.remove('hidden');
      this.modTankLabelEl.textContent = 'Coolant [Space]';
      this.modTankBarEl.style.background = '#38bdf8';
      this.touchMidCueEl.classList.remove('hidden');
      this.touchMidCueEl.style.color = '#38bdf8';
      this.touchMidLabelEl.textContent = 'COOL';
    } else {
      this.hudSpaceHintEl.classList.add('hidden');
      this.modTankSectionEl.classList.add('hidden');
      this.touchMidCueEl.classList.add('hidden');
    }

    if (totalLaps > 1) {
      this.lapProgressEl.classList.remove('hidden');
      this.lapProgressEl.textContent = `LAP 1 / ${totalLaps}`;
    } else {
      this.lapProgressEl.classList.add('hidden');
    }
    this.cpProgressEl.textContent = `CP 0 / ${totalCps}`;
    this.splitPillEl.classList.add('hidden');
    this.eventBadgeEl.classList.add('hidden');

    if (map.medalsMs) {
      this.targetGoldEl.textContent = formatTimeMs(map.medalsMs.gold);
      this.targetSilverEl.textContent = formatTimeMs(map.medalsMs.silver);
      this.targetBronzeEl.textContent = formatTimeMs(map.medalsMs.bronze);
    }

    const rec = storage.getMapRecord(map.id);
    this.targetPbEl.textContent =
      rec.bestTimeMs !== null ? formatTimeMs(rec.bestTimeMs) : '--:--.---';
  }

  public updateCountdown(remainingSec: number): void {
    this.countdownEl.classList.remove('hidden');
    if (remainingSec > 1.6) {
      this.countdownEl.textContent = '3';
      this.countdownEl.style.color = '#f87171';
    } else if (remainingSec > 0.8) {
      this.countdownEl.textContent = '2';
      this.countdownEl.style.color = '#fbbf24';
    } else if (remainingSec > 0) {
      this.countdownEl.textContent = '1';
      this.countdownEl.style.color = '#38bdf8';
    }
  }

  public showGoFlash(): void {
    this.countdownEl.classList.remove('hidden');
    this.countdownEl.textContent = 'GO!';
    this.countdownEl.style.color = '#34d399';
    window.setTimeout(() => {
      this.countdownEl.classList.add('hidden');
    }, 550);
  }

  public showCheckpointSplit(cpNum: number, totalCps: number, deltaMs: number | null): void {
    this.cpProgressEl.textContent = `CP ${cpNum} / ${totalCps}`;
    if (deltaMs === null) {
      this.splitPillEl.classList.add('hidden');
      return;
    }

    const sign = deltaMs <= 0 ? '-' : '+';
    const secStr = (Math.abs(deltaMs) / 1000).toFixed(3);
    this.splitPillEl.textContent = `${sign}${secStr}s`;
    this.splitPillEl.className = `split-pill ${deltaMs <= 0 ? 'split-ahead' : 'split-behind'}`;

    if (this.splitHideTimeout !== null) {
      window.clearTimeout(this.splitHideTimeout);
    }
    this.splitHideTimeout = window.setTimeout(() => {
      this.splitPillEl.classList.add('hidden');
    }, 2600);
  }

  public showEventBadge(
    text: string,
    kind: 'vector_boost' | 'perfect_damp' | 'hard_impact' | 'false_start'
  ): void {
    this.eventBadgeEl.dataset.livePrompt = '0';
    this.eventBadgeEl.textContent = text;
    const badgeClass =
      kind === 'vector_boost'
        ? 'badge-vector-boost'
        : kind === 'perfect_damp'
          ? 'badge-perfect-damp'
          : kind === 'false_start'
            ? 'badge-overload-warn'
            : 'badge-hard-impact';
    this.eventBadgeEl.className = `event-badge ${badgeClass}`;

    if (this.badgeHideTimeout !== null) {
      window.clearTimeout(this.badgeHideTimeout);
    }
    this.badgeHideTimeout = window.setTimeout(() => {
      this.eventBadgeEl.classList.add('hidden');
      this.badgeHideTimeout = null;
    }, 1450);
  }

  public showFinishScreen(params: {
    timeMs: number;
    medal: MedalTier;
    score: number;
    isNewPB: boolean;
    unlockedNextMap: boolean;
  }): void {
    this.finishTitleEl.textContent = params.isNewPB ? 'NEW PERSONAL BEST!' : 'Run Complete';
    this.finishTimeEl.textContent = formatTimeMs(params.timeMs);
    this.finishMedalEl.textContent = params.medal.toUpperCase();
    this.finishMedalEl.style.color =
      params.medal === 'gold'
        ? '#fbbf24'
        : params.medal === 'silver'
          ? '#e2e8f0'
          : params.medal === 'bronze'
            ? '#d97706'
            : '#94a3b8';
    this.finishScoreEl.textContent = params.score.toLocaleString();
    this.finishUnlockEl.classList.toggle('hidden', !params.unlockedNextMap);
  }

  public updateTelemetry(
    t: PodTelemetry,
    input: InputSnapshot,
    raceTimeMs: number,
    cpCount: number,
    totalCps: number,
    currentLap = 1,
    totalLaps = 1
  ): void {
    this.timerEl.textContent = formatTimeMs(raceTimeMs);
    if (totalLaps > 1) {
      this.lapProgressEl.textContent = `LAP ${currentLap} / ${totalLaps}`;
    }
    this.cpProgressEl.textContent = `CP ${cpCount} / ${totalCps}`;
    this.speedEl.textContent = String(Math.round(t.speedKmh));

    // Hull bar (aligned with <75% -5%, <50% -10%, <25% -20% slowdown tiers)
    const hullPct = Math.round(t.hullIntegrity);
    const hullSlowPct = Math.round((1 - getHullPerformanceScale(t.hullIntegrity)) * 100);
    this.hullPctEl.textContent =
      hullSlowPct > 0 && t.hullIntegrity > 0 ? `${hullPct}% (-${hullSlowPct}%)` : `${hullPct}%`;
    this.hullBarEl.style.width = `${hullPct}%`;
    if (t.hullIntegrity >= 75) {
      this.hullBarEl.style.background = '#38bdf8';
      this.hullBarEl.classList.remove('hull-low');
    } else if (t.hullIntegrity >= 50) {
      this.hullBarEl.style.background = '#facc15';
      this.hullBarEl.classList.remove('hull-low');
    } else if (t.hullIntegrity >= 25) {
      this.hullBarEl.style.background = '#f59e0b';
      this.hullBarEl.classList.remove('hull-low');
    } else {
      this.hullBarEl.style.background = '#f87171';
      this.hullBarEl.classList.add('hull-low');
    }

    // Active Modification Tank Bar (Nitro / Coolant)
    if (t.modTankMaxSec > 0) {
      const tankFrac = Math.max(0, Math.min(1, t.modTankSec / t.modTankMaxSec));
      this.modTankValEl.textContent =
        t.modTankSec > 0.01 ? `${t.modTankSec.toFixed(1)}s` : 'EMPTY';
      this.modTankBarEl.style.width = `${Math.round(tankFrac * 100)}%`;
      const isActive = t.nitroActive || t.coolantActive;
      this.modTankSectionEl.classList.toggle('active-pulse', isActive);
      if (t.modification === 'nitro') {
        this.modTankBarEl.style.background = t.nitroActive
          ? 'linear-gradient(90deg, #f97316, #ec4899)'
          : '#f97316';
      } else {
        this.modTankBarEl.style.background = t.coolantActive
          ? 'linear-gradient(90deg, #38bdf8, #a5f3fc)'
          : '#38bdf8';
      }
    }

    // Contextual airborne sequence coaching & overload warning
    if (this.badgeHideTimeout === null) {
      if (t.airborneOverload) {
        this.eventBadgeEl.dataset.livePrompt = '1';
        this.eventBadgeEl.textContent = 'AIR OVERLOAD — CUT THRUST!';
        this.eventBadgeEl.className = 'event-badge badge-overload-warn';
      } else if (!t.isGrounded && t.airTime > 0.28 && t.vel.y < -6.5) {
        const bothEnginesActive = input.targetLeft > 0 && input.targetRight > 0;
        if (t.modification === 'flying') {
          if (t.timeToImpact <= 0.45 && !bothEnginesActive) {
            this.eventBadgeEl.dataset.livePrompt = '1';
            this.eventBadgeEl.textContent = 'ENGINES ON TO LAND!';
            this.eventBadgeEl.className = 'event-badge badge-vector-prompt';
          } else if (this.eventBadgeEl.dataset.livePrompt === '1') {
            this.eventBadgeEl.dataset.livePrompt = '0';
            this.eventBadgeEl.classList.add('hidden');
          }
        } else if (
          t.coastReady &&
          t.timeToImpact <= POD_CONFIG.thrustFlareWindowSec &&
          !bothEnginesActive
        ) {
          this.eventBadgeEl.dataset.livePrompt = '1';
          this.eventBadgeEl.textContent = 'ENGINES ON NOW — BOOST!';
          this.eventBadgeEl.className = 'event-badge badge-vector-prompt';
        } else if (!t.coastReady && (input.targetLeft > 0 || input.targetRight > 0)) {
          this.eventBadgeEl.dataset.livePrompt = '1';
          this.eventBadgeEl.textContent = 'CUT BOTH ENGINES (0.5s)';
          this.eventBadgeEl.className = 'event-badge badge-damp-prompt';
        } else if (this.eventBadgeEl.dataset.livePrompt === '1') {
          this.eventBadgeEl.dataset.livePrompt = '0';
          this.eventBadgeEl.classList.add('hidden');
        }
      } else if (this.eventBadgeEl.dataset.livePrompt === '1') {
        this.eventBadgeEl.dataset.livePrompt = '0';
        this.eventBadgeEl.classList.add('hidden');
      }
    }

    // Engine bars & keycaps
    const lPct = Math.round(t.pLeft * 100);
    const rPct = Math.round(t.pRight * 100);
    this.leftPctEl.textContent = `${lPct}%`;
    this.rightPctEl.textContent = `${rPct}%`;
    this.leftBarEl.style.width = `${Math.min(100, Math.abs(lPct))}%`;
    this.rightBarEl.style.width = `${Math.min(100, Math.abs(rPct))}%`;
    this.leftBarEl.style.background =
      t.pLeft < 0
        ? '#f87171'
        : t.nitroActive && !t.overheatedLeft
          ? 'linear-gradient(90deg, #f97316, #ec4899)'
          : 'linear-gradient(90deg, #f59e0b, #38bdf8)';
    this.rightBarEl.style.background =
      t.pRight < 0
        ? '#f87171'
        : t.nitroActive && !t.overheatedRight
          ? 'linear-gradient(90deg, #f97316, #ec4899)'
          : 'linear-gradient(90deg, #f59e0b, #38bdf8)';

    this.leftWidgetEl.classList.toggle('nitro-active', t.nitroActive && !t.overheatedLeft);
    this.rightWidgetEl.classList.toggle('nitro-active', t.nitroActive && !t.overheatedRight);
    this.leftWidgetEl.classList.toggle('coolant-active', t.coolantActive);
    this.rightWidgetEl.classList.toggle('coolant-active', t.coolantActive);

    this.updateEngineHeatHud(
      this.leftWidgetEl,
      this.leftHeatPctEl,
      this.leftHeatBarEl,
      t.heatLeft,
      t.overheatedLeft
    );
    this.updateEngineHeatHud(
      this.rightWidgetEl,
      this.rightHeatPctEl,
      this.rightHeatBarEl,
      t.heatRight,
      t.overheatedRight
    );

    for (const el of this.leftKeycaps) {
      const code = el.dataset.code;
      const active = code === input.leftActiveCode;
      el.classList.toggle('active-pos', active && code !== 'KeyA');
      el.classList.toggle('active-rev', active && code === 'KeyA');
    }
    for (const el of this.rightKeycaps) {
      const code = el.dataset.code;
      const active = code === input.rightActiveCode;
      el.classList.toggle('active-pos', active && code !== 'Quote');
      el.classList.toggle('active-rev', active && code === 'Quote');
    }
  }

  private updateEngineHeatHud(
    widgetEl: HTMLElement,
    pctEl: HTMLElement,
    barEl: HTMLElement,
    heat: number,
    overheated: boolean
  ): void {
    const heatPct = Math.round(heat);
    widgetEl.classList.toggle('overheated', overheated);
    pctEl.textContent = overheated ? `OVERHEAT ${heatPct}%` : `${heatPct}%`;
    barEl.style.width = `${heatPct}%`;
    if (overheated || heatPct >= 85) {
      barEl.style.background = '#ef4444';
    } else if (heatPct >= 55) {
      barEl.style.background = '#f97316';
    } else {
      barEl.style.background = '#f59e0b';
    }
  }

  public updateTouchControls(touch: TouchControlsState, t: PodTelemetry): void {
    if (touch.hasUsedTouch) {
      this.touchControlsEl.classList.add('touch-visible');
      document.body.classList.add('touch-mode');
    }

    const hasModTank = t.modification === 'nitro' || t.modification === 'cooled';
    const modTriggered =
      hasModTank &&
      ((touch.left.active && touch.left.inMiddleZone) ||
        (touch.right.active && touch.right.inMiddleZone));
    this.touchMidCueEl.classList.toggle('active', modTriggered && t.modTankSec > 0);

    this.updateFingerVisual(
      this.touchFingerLeftEl,
      this.touchRailLeftEl,
      touch.left,
      t.overheatedLeft,
      t.modification,
      t.modTankSec > 0
    );
    this.updateFingerVisual(
      this.touchFingerRightEl,
      this.touchRailRightEl,
      touch.right,
      t.overheatedRight,
      t.modification,
      t.modTankSec > 0
    );
  }

  private updateFingerVisual(
    fingerEl: HTMLElement,
    railFillEl: HTMLElement,
    finger: TouchFingerState,
    overheated: boolean,
    mod: PodModificationId,
    hasTankLeft: boolean
  ): void {
    const isNitroZone = finger.active && finger.inMiddleZone && mod === 'nitro' && hasTankLeft;
    const isCooledZone = finger.active && finger.inMiddleZone && mod === 'cooled' && hasTankLeft;

    fingerEl.classList.toggle('active', finger.active);
    fingerEl.classList.toggle(
      'full-throttle',
      finger.active && finger.throttle >= 0.99 && !overheated && !isNitroZone && !isCooledZone
    );
    fingerEl.classList.toggle(
      'reverse',
      finger.active && finger.throttle < 0 && !overheated && !isNitroZone && !isCooledZone
    );
    fingerEl.classList.toggle('overheated', finger.active && overheated);
    fingerEl.classList.toggle('mod-nitro', isNitroZone);
    fingerEl.classList.toggle('mod-cooled', isCooledZone);

    if (finger.active) {
      fingerEl.style.transform = `translate3d(${finger.clientX}px, ${finger.clientY}px, 0) translate(-50%, -50%)`;
    }

    if (!finger.active || Math.abs(finger.throttle) < 0.005) {
      railFillEl.classList.remove('active');
      return;
    }

    railFillEl.classList.add('active');
    if (finger.throttle > 0) {
      const hPct = finger.throttle * RAIL_ZERO_PCT;
      railFillEl.style.top = `${RAIL_ZERO_PCT - hPct}%`;
      railFillEl.style.height = `${hPct}%`;
      railFillEl.style.background = overheated
        ? 'rgba(239, 68, 68, 0.85)'
        : isNitroZone
          ? '#f97316'
          : isCooledZone
            ? '#38bdf8'
            : finger.throttle >= 0.99
              ? 'rgba(245, 158, 11, 0.85)'
              : 'rgba(255, 255, 255, 0.65)';
    } else {
      const revFrac = Math.min(1, Math.abs(finger.throttle) / 0.3);
      const hPct = revFrac * (100 - RAIL_ZERO_PCT);
      railFillEl.style.top = `${RAIL_ZERO_PCT}%`;
      railFillEl.style.height = `${hPct}%`;
      railFillEl.style.background = 'rgba(248, 113, 113, 0.8)';
    }
  }

  public clearBadgeTimer(): void {
    if (this.badgeHideTimeout !== null) {
      window.clearTimeout(this.badgeHideTimeout);
      this.badgeHideTimeout = null;
    }
  }

  public updateWreckSequence(
    remainingSec: number,
    totalSec: number,
    raceTimeMs: number,
    wreckSpeedKmh: number
  ): void {
    const pct = Math.max(0, Math.min(100, (remainingSec / Math.max(0.01, totalSec)) * 100));
    this.rudBarEl.style.width = `${pct.toFixed(1)}%`;

    this.timerEl.textContent = formatTimeMs(raceTimeMs);
    this.speedEl.textContent = String(Math.max(0, Math.round(wreckSpeedKmh)));

    this.hullPctEl.textContent = '0%';
    this.hullBarEl.style.width = '0%';
    this.hullBarEl.style.background = '#f87171';
    this.hullBarEl.classList.add('hull-low');

    this.leftPctEl.textContent = '0%';
    this.rightPctEl.textContent = '0%';
    this.leftBarEl.style.width = '0%';
    this.rightBarEl.style.width = '0%';
    this.leftWidgetEl.classList.remove('nitro-active', 'coolant-active');
    this.rightWidgetEl.classList.remove('nitro-active', 'coolant-active');
    this.modTankSectionEl.classList.remove('active-pulse');

    for (const el of this.leftKeycaps) {
      el.classList.remove('active-pos', 'active-rev');
    }
    for (const el of this.rightKeycaps) {
      el.classList.remove('active-pos', 'active-rev');
    }
  }
}
