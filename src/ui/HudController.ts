import type { StorageManager } from '../core/StorageManager';
import { MAP_REGISTRY } from '../maps/mapRegistry';
import { POD_CONFIG } from '../pod/PodConfig';
import type {
  InputSnapshot,
  MapDefinition,
  MedalTier,
  PodTelemetry,
  RaceState,
} from '../types';

export function formatTimeMs(ms: number): string {
  const totalMs = Math.max(0, Math.round(ms));
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export interface HudActions {
  onSelectMap: (mapId: string) => void;
  onResume: () => void;
  onRestart: () => void;
  onRespawn: () => void;
  onBackToMenu: () => void;
}

export class HudController {
  private readonly hudEl = document.getElementById('hud')!;
  private readonly menuEl = document.getElementById('menu-overlay')!;
  private readonly pauseEl = document.getElementById('pause-overlay')!;
  private readonly wreckedEl = document.getElementById('wrecked-overlay')!;
  private readonly finishEl = document.getElementById('finish-overlay')!;
  private readonly mapGridEl = document.getElementById('map-grid')!;

  private readonly mapNameEl = document.getElementById('hud-map-name')!;
  private readonly timerEl = document.getElementById('hud-timer')!;
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

  private readonly speedEl = document.getElementById('hud-speed')!;
  private readonly damperPctEl = document.getElementById('hud-damper-pct')!;
  private readonly damperBarEl = document.getElementById('hud-damper-bar')!;

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

  constructor(private readonly actions: HudActions) {
    document.getElementById('btn-resume')?.addEventListener('click', () => this.actions.onResume());
    document.getElementById('btn-pause-restart')?.addEventListener('click', () => this.actions.onRestart());
    document.getElementById('btn-pause-menu')?.addEventListener('click', () => this.actions.onBackToMenu());
    document.getElementById('btn-wreck-respawn')?.addEventListener('click', () => this.actions.onRespawn());
    document.getElementById('btn-wreck-restart')?.addEventListener('click', () => this.actions.onRestart());
    document.getElementById('btn-finish-menu')?.addEventListener('click', () => this.actions.onBackToMenu());
    document.getElementById('btn-finish-retry')?.addEventListener('click', () => this.actions.onRestart());
  }

  public setState(state: RaceState): void {
    this.hudEl.classList.toggle('hidden', state === 'MENU');
    this.menuEl.classList.toggle('hidden', state !== 'MENU');
    this.pauseEl.classList.toggle('hidden', state !== 'PAUSED');
    this.wreckedEl.classList.toggle('hidden', state !== 'WRECKED');
    this.finishEl.classList.toggle('hidden', state !== 'FINISHED');
    if (state !== 'COUNTDOWN') {
      this.countdownEl.classList.add('hidden');
    }
  }

  public renderMapMenu(storage: StorageManager): void {
    this.mapGridEl.innerHTML = '';
    for (const map of MAP_REGISTRY) {
      const unlocked = storage.isMapUnlocked(map);
      const record = storage.getMapRecord(map.id);

      const card = document.createElement('div');
      card.className = `map-card ${map.playable && unlocked ? 'selected-playable' : ''} ${!unlocked ? 'locked' : ''}`;

      const medalText = record.bestMedal === 'none' ? 'No Medal' : record.bestMedal.toUpperCase();
      const pbText = record.bestTimeMs !== null ? formatTimeMs(record.bestTimeMs) : '--:--.---';

      let statusHtml = '';
      if (!unlocked) {
        statusHtml = `<button class="btn btn-secondary" disabled>LOCKED — Beat Silver on Dustveil Gorge</button>`;
      } else if (!map.playable) {
        statusHtml = `<button class="btn btn-secondary" disabled>UNLOCKED — Map 02 Coming Soon</button>`;
      } else {
        statusHtml = `<button class="btn btn-primary" data-map-id="${map.id}">Launch Time Trial</button>`;
      }

      card.innerHTML = `
        <div>
          <div class="map-title-tag">${map.subtitle}</div>
          <h3>${map.name}</h3>
          <p>${map.description}</p>
        </div>
        <div>
          ${
            map.playable
              ? `<div class="map-stats">
                   <span>Best: <strong>${pbText}</strong></span>
                   <span>Medal: <strong>${medalText}</strong></span>
                   <span>Score: <strong>${record.bestScore.toLocaleString()}</strong></span>
                 </div>`
              : `<div class="map-stats"><span>${unlocked ? 'Status: Unlocked' : 'Status: Locked (Silver Req.)'}</span></div>`
          }
          <div style="margin-top: 12px;">${statusHtml}</div>
        </div>
      `;

      const playBtn = card.querySelector<HTMLButtonElement>('button[data-map-id]');
      if (playBtn) {
        playBtn.addEventListener('click', () => this.actions.onSelectMap(map.id));
      }

      this.mapGridEl.appendChild(card);
    }
  }

  public configureMapHud(map: MapDefinition, storage: StorageManager, totalCps: number): void {
    this.mapNameEl.textContent = map.name;
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
    totalCps: number
  ): void {
    this.timerEl.textContent = formatTimeMs(raceTimeMs);
    this.cpProgressEl.textContent = `CP ${cpCount} / ${totalCps}`;
    this.speedEl.textContent = String(Math.round(t.speedKmh));

    // Hull bar
    const hullPct = Math.round(t.hullIntegrity);
    this.hullPctEl.textContent = `${hullPct}%`;
    this.hullBarEl.style.width = `${hullPct}%`;
    if (hullPct > 55) {
      this.hullBarEl.style.background = '#38bdf8';
      this.hullBarEl.classList.remove('hull-low');
    } else if (hullPct > 30) {
      this.hullBarEl.style.background = '#f59e0b';
      this.hullBarEl.classList.remove('hull-low');
    } else {
      this.hullBarEl.style.background = '#f87171';
      this.hullBarEl.classList.add('hull-low');
    }

    // Air Coast (1s engines off) & Landing Boost bar
    if (t.landingBoost > 0.04) {
      this.damperPctEl.textContent = 'BOOST!';
      this.damperBarEl.style.width = `${Math.round(t.landingBoost * 100)}%`;
      this.damperBarEl.style.background = '#fbbf24';
    } else {
      const coastFrac = Math.min(1, t.enginesOffTime / POD_CONFIG.minEnginesOffSec);
      this.damperPctEl.textContent = t.coastReady
        ? 'READY'
        : `${Math.round(coastFrac * 100)}%`;
      this.damperBarEl.style.width = `${Math.round(coastFrac * 100)}%`;
      this.damperBarEl.style.background = t.coastReady ? '#34d399' : '#38bdf8';
    }

    // Contextual airborne sequence coaching & overload warning
    if (this.badgeHideTimeout === null) {
      if (t.airborneOverload) {
        this.eventBadgeEl.dataset.livePrompt = '1';
        this.eventBadgeEl.textContent = 'AIR OVERLOAD — CUT THRUST!';
        this.eventBadgeEl.className = 'event-badge badge-overload-warn';
      } else if (!t.isGrounded && t.airTime > 0.28 && t.vel.y < -6.5) {
        const bothEnginesActive = input.targetLeft > 0 && input.targetRight > 0;
        if (
          t.coastReady &&
          t.timeToImpact <= POD_CONFIG.thrustFlareWindowSec &&
          !bothEnginesActive
        ) {
          this.eventBadgeEl.dataset.livePrompt = '1';
          this.eventBadgeEl.textContent = 'ENGINES ON NOW — BOOST!';
          this.eventBadgeEl.className = 'event-badge badge-vector-prompt';
        } else if (!t.coastReady && (input.targetLeft > 0 || input.targetRight > 0)) {
          this.eventBadgeEl.dataset.livePrompt = '1';
          this.eventBadgeEl.textContent = 'CUT BOTH ENGINES (1s)';
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
    this.leftBarEl.style.width = `${Math.abs(lPct)}%`;
    this.rightBarEl.style.width = `${Math.abs(rPct)}%`;
    this.leftBarEl.style.background =
      t.pLeft < 0 ? '#f87171' : 'linear-gradient(90deg, #f59e0b, #38bdf8)';
    this.rightBarEl.style.background =
      t.pRight < 0 ? '#f87171' : 'linear-gradient(90deg, #f59e0b, #38bdf8)';

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

  public clearBadgeTimer(): void {
    if (this.badgeHideTimeout !== null) {
      window.clearTimeout(this.badgeHideTimeout);
      this.badgeHideTimeout = null;
    }
  }
}
