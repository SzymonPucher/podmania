import {
  HOW_TO_PLAY_TOPICS,
  renderHowToPlayFrame,
  type HowToPlaySceneId,
  type HowToPlayTabId,
} from './HowToPlayAnimations';

export class HowToPlayModal {
  private readonly overlayEl = document.getElementById('how-to-play-overlay')!;
  private readonly tabsEl = document.getElementById('htp-tabs')!;
  private readonly titleEl = document.getElementById('htp-topic-title')!;
  private readonly stepCounterEl = document.getElementById('htp-step-counter')!;
  private readonly subToggleEl = document.getElementById('htp-sub-toggle')!;
  private readonly canvasEl = document.getElementById('htp-canvas') as HTMLCanvasElement;
  private readonly phaseBadgeEl = document.getElementById('htp-phase-badge')!;
  private readonly progressFillEl = document.getElementById('htp-progress-fill')!;
  private readonly takeawaysEl = document.getElementById('htp-takeaways')!;
  private readonly prevBtn = document.getElementById('btn-htp-prev') as HTMLButtonElement;
  private readonly nextBtn = document.getElementById('btn-htp-next') as HTMLButtonElement;

  private readonly ctx: CanvasRenderingContext2D;
  private activeTabIndex = 0;
  private activeSceneId: HowToPlaySceneId = 'controls_keyboard';
  private rafId: number | null = null;
  private animStartMs = 0;
  private canvasW = 720;
  private canvasH = 320;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    this.ctx = this.canvasEl.getContext('2d')!;

    document.getElementById('btn-htp-close')?.addEventListener('click', () => this.close());
    this.prevBtn.addEventListener('click', () => this.stepTab(-1));
    this.nextBtn.addEventListener('click', () => this.stepTab(1));

    this.overlayEl.addEventListener('click', (e) => {
      if (e.target === this.overlayEl) {
        this.close();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (!this.isOpen()) return;
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.stepTab(-1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.stepTab(1);
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!this.isOpen()) return;
      if (document.hidden) {
        this.stopLoop();
      } else {
        this.startLoop();
      }
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.syncCanvasSize());
      this.resizeObserver.observe(this.canvasEl);
    }

    this.renderTabs();
  }

  public isOpen(): boolean {
    return !this.overlayEl.classList.contains('hidden');
  }

  public open(initialTab?: HowToPlayTabId): void {
    if (initialTab) {
      const idx = HOW_TO_PLAY_TOPICS.findIndex((t) => t.id === initialTab);
      this.activeTabIndex = idx >= 0 ? idx : 0;
    } else {
      this.activeTabIndex = 0;
    }

    this.selectTopic(this.activeTabIndex);
    this.overlayEl.classList.remove('hidden');
    this.syncCanvasSize();
    this.startLoop();
  }

  public close(): void {
    this.stopLoop();
    this.overlayEl.classList.add('hidden');
  }

  private stepTab(delta: number): void {
    const next =
      (this.activeTabIndex + delta + HOW_TO_PLAY_TOPICS.length) %
      HOW_TO_PLAY_TOPICS.length;
    this.selectTopic(next);
  }

  private isTouchPreferred(): boolean {
    return (
      document.body.classList.contains('touch-mode') ||
      window.matchMedia('(hover: none) and (pointer: coarse)').matches
    );
  }

  private selectTopic(index: number): void {
    this.activeTabIndex = index;
    const topic = HOW_TO_PLAY_TOPICS[index];

    if (topic.id === 'controls') {
      this.activeSceneId = this.isTouchPreferred()
        ? 'controls_mobile'
        : 'controls_keyboard';
    } else {
      this.activeSceneId = topic.defaultScene;
    }

    this.animStartMs = performance.now();
    this.renderTabs();
    this.renderTopicDetails();
  }

  private renderTabs(): void {
    this.tabsEl.innerHTML = '';
    HOW_TO_PLAY_TOPICS.forEach((topic, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `htp-tab ${idx === this.activeTabIndex ? 'active' : ''}`;
      btn.textContent = topic.tabLabel;
      btn.addEventListener('click', () => this.selectTopic(idx));
      this.tabsEl.appendChild(btn);
    });
  }

  private renderTopicDetails(): void {
    const topic = HOW_TO_PLAY_TOPICS[this.activeTabIndex];
    this.titleEl.textContent = topic.title;
    this.stepCounterEl.textContent = `${this.activeTabIndex + 1} / ${HOW_TO_PLAY_TOPICS.length}`;

    this.subToggleEl.innerHTML = '';
    if (topic.subOptions && topic.subOptions.length > 0) {
      this.subToggleEl.classList.remove('hidden');
      for (const opt of topic.subOptions) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `htp-sub-btn ${this.activeSceneId === opt.id ? 'active' : ''}`;
        btn.textContent = opt.label;
        btn.addEventListener('click', () => {
          this.activeSceneId = opt.id;
          this.animStartMs = performance.now();
          this.renderTopicDetails();
        });
        this.subToggleEl.appendChild(btn);
      }
    } else {
      this.subToggleEl.classList.add('hidden');
    }

    const bullets = topic.takeaways[this.activeSceneId] ?? [];
    this.takeawaysEl.innerHTML = bullets.map((b) => `<li>${b}</li>`).join('');
  }

  private syncCanvasSize(): void {
    const rect = this.canvasEl.getBoundingClientRect();
    const w = Math.max(280, Math.round(rect.width || 720));
    const h = Math.max(180, Math.round(rect.height || 320));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvasW = w;
    this.canvasH = h;
    this.canvasEl.width = Math.round(w * dpr);
    this.canvasEl.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.isOpen()) {
      const elapsedSec = (performance.now() - this.animStartMs) / 1000;
      renderHowToPlayFrame(this.ctx, w, h, this.activeSceneId, elapsedSec);
    }
  }

  private startLoop(): void {
    if (this.rafId !== null) return;
    this.animStartMs = performance.now();
    const tick = (now: number) => {
      if (!this.isOpen()) {
        this.rafId = null;
        return;
      }
      const elapsedSec = (now - this.animStartMs) / 1000;
      const res = renderHowToPlayFrame(
        this.ctx,
        this.canvasW,
        this.canvasH,
        this.activeSceneId,
        elapsedSec
      );
      this.phaseBadgeEl.textContent = res.phaseText;
      this.phaseBadgeEl.dataset.tone = res.phaseTone;
      this.progressFillEl.style.width = `${Math.round(res.progress * 100)}%`;
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
