interface FullscreenElementWithVendor extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

interface DocumentWithVendor extends Document {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

export interface FullscreenCallbacks {
  onChange?: (isFullscreen: boolean, didExit: boolean) => void;
}

export class FullscreenManager {
  private readonly callbacks: FullscreenCallbacks;
  private lastFullscreenState = false;
  private wakeLockDesired = false;
  private wakeLockSentinel: WakeLockSentinel | null = null;

  private readonly handleFullscreenChangeBound: () => void;
  private readonly handleVisibilityChangeBound: () => void;

  constructor(callbacks: FullscreenCallbacks = {}) {
    this.callbacks = callbacks;
    this.lastFullscreenState = this.isFullscreen();
    this.handleFullscreenChangeBound = this.handleFullscreenChange.bind(this);
    this.handleVisibilityChangeBound = this.handleVisibilityChange.bind(this);

    document.addEventListener('fullscreenchange', this.handleFullscreenChangeBound);
    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChangeBound);
    document.addEventListener('visibilitychange', this.handleVisibilityChangeBound);
  }

  public isSupported(): boolean {
    const doc = document as DocumentWithVendor;
    const el = document.documentElement as FullscreenElementWithVendor;
    const enabled = Boolean(doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled);
    const hasMethod = typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function';
    return enabled && hasMethod;
  }

  public isFullscreen(): boolean {
    const doc = document as DocumentWithVendor;
    return Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
  }

  /**
   * Must be invoked synchronously inside a trusted user gesture (click / touchend / pointerup).
   * Intentionally does NOT lock screen orientation.
   */
  public enter(): void {
    if (!this.isSupported() || this.isFullscreen()) {
      return;
    }

    const target = document.documentElement as FullscreenElementWithVendor;
    if (typeof target.requestFullscreen === 'function') {
      try {
        const result = target.requestFullscreen({ navigationUI: 'hide' });
        if (result && typeof result.catch === 'function') {
          void result.catch(() => {
            try {
              const fallback = target.requestFullscreen();
              if (fallback && typeof fallback.catch === 'function') {
                void fallback.catch(() => {
                  /* ignore user/platform rejection */
                });
              }
            } catch {
              /* ignore */
            }
          });
        }
      } catch {
        try {
          const fallback = target.requestFullscreen();
          if (fallback && typeof fallback.catch === 'function') {
            void fallback.catch(() => {
              /* ignore */
            });
          }
        } catch {
          /* ignore */
        }
      }
      return;
    }

    if (typeof target.webkitRequestFullscreen === 'function') {
      try {
        const result = target.webkitRequestFullscreen();
        if (result && typeof result.catch === 'function') {
          void result.catch(() => {
            /* ignore */
          });
        }
      } catch {
        /* ignore */
      }
    }
  }

  public exit(): void {
    if (!this.isFullscreen()) {
      return;
    }

    const doc = document as DocumentWithVendor;
    if (typeof doc.exitFullscreen === 'function') {
      void doc.exitFullscreen().catch(() => {
        /* ignore */
      });
    } else if (typeof doc.webkitExitFullscreen === 'function') {
      try {
        const result = doc.webkitExitFullscreen();
        if (result && typeof result.catch === 'function') {
          void result.catch(() => {
            /* ignore */
          });
        }
      } catch {
        /* ignore */
      }
    }
  }

  public toggle(): void {
    if (this.isFullscreen()) {
      this.exit();
    } else {
      this.enter();
    }
  }

  public setWakeLockActive(active: boolean): void {
    this.wakeLockDesired = active;
    if (active) {
      void this.acquireWakeLock();
    } else {
      void this.releaseWakeLock();
    }
  }

  public dispose(): void {
    document.removeEventListener('fullscreenchange', this.handleFullscreenChangeBound);
    document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChangeBound);
    document.removeEventListener('visibilitychange', this.handleVisibilityChangeBound);
    void this.releaseWakeLock();
  }

  private handleFullscreenChange(): void {
    const nowFullscreen = this.isFullscreen();
    const didExit = this.lastFullscreenState && !nowFullscreen;
    this.lastFullscreenState = nowFullscreen;
    this.callbacks.onChange?.(nowFullscreen, didExit);
  }

  private handleVisibilityChange(): void {
    if (!document.hidden && this.wakeLockDesired) {
      void this.acquireWakeLock();
    }
  }

  private async acquireWakeLock(): Promise<void> {
    if (document.hidden || !this.wakeLockDesired) return;
    if (this.wakeLockSentinel && !this.wakeLockSentinel.released) return;

    if (!('wakeLock' in navigator) || typeof navigator.wakeLock?.request !== 'function') {
      return;
    }

    try {
      const sentinel = await navigator.wakeLock.request('screen');
      if (!this.wakeLockDesired) {
        void sentinel.release().catch(() => {});
        return;
      }
      this.wakeLockSentinel = sentinel;
      sentinel.addEventListener('release', () => {
        if (this.wakeLockSentinel === sentinel) {
          this.wakeLockSentinel = null;
        }
      });
    } catch {
      /* ignore wake lock denial or unsupported environment */
    }
  }

  private async releaseWakeLock(): Promise<void> {
    const sentinel = this.wakeLockSentinel;
    this.wakeLockSentinel = null;
    if (sentinel && !sentinel.released) {
      try {
        await sentinel.release();
      } catch {
        /* ignore */
      }
    }
  }
}
