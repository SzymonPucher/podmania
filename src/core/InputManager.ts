import type { InputSnapshot, TouchControlsState, TouchFingerState } from '../types';

const LEFT_POWER_MAP: Record<string, number> = {
  KeyA: -0.3,
  KeyS: 0.3,
  KeyD: 0.7,
  KeyF: 1.0,
};

const RIGHT_POWER_MAP: Record<string, number> = {
  Quote: -0.3,
  Semicolon: 0.3,
  KeyL: 0.7,
  KeyK: 1.0,
};

const BOUND_CODES = new Set<string>([
  ...Object.keys(LEFT_POWER_MAP),
  ...Object.keys(RIGHT_POWER_MAP),
  'Space',
  'Backspace',
  'KeyR',
  'Escape',
  'KeyM',
]);

/** Vertical slider calibration in normalized viewport Y (0 = top, 1 = bottom) */
export const TOUCH_SLIDER_TOP_FRAC = 0.18;
export const TOUCH_SLIDER_ZERO_FRAC = 0.80;
export const TOUCH_SLIDER_ZERO_DEADZONE = 0.02;
export const TOUCH_SLIDER_REV_FRAC = 0.92;
/** Top 20% of the slider rail snaps to 100% throttle for reliable landing */
export const TOUCH_SLIDER_FULL_FRAC =
  TOUCH_SLIDER_TOP_FRAC + (TOUCH_SLIDER_REV_FRAC - TOUCH_SLIDER_TOP_FRAC) * 0.2;

/** Horizontal middle-zone thresholds in normalized viewport X (0 = left, 1 = right) */
export const TOUCH_MID_LEFT_THRESHOLD = 0.28;
export const TOUCH_MID_RIGHT_THRESHOLD = 0.72;

export interface InputCallbacks {
  onRespawn?: () => void;
  onRestart?: () => void;
  onEscape?: () => void;
  onToggleMute?: () => void;
  onAnyInteraction?: () => void;
}

function createEmptyFinger(): TouchFingerState {
  return {
    active: false,
    xNorm: 0,
    yNorm: TOUCH_SLIDER_ZERO_FRAC,
    clientX: 0,
    clientY: 0,
    throttle: 0,
    inMiddleZone: false,
  };
}

export class InputManager {
  private leftStack: string[] = [];
  private rightStack: string[] = [];
  private spaceHeld = false;
  private callbacks: InputCallbacks;

  private touchElement: HTMLElement | null = null;
  private leftTouchId: number | null = null;
  private rightTouchId: number | null = null;
  private readonly touchState: TouchControlsState = {
    hasUsedTouch: false,
    left: createEmptyFinger(),
    right: createEmptyFinger(),
  };

  private readonly handleKeyDownBound: (e: KeyboardEvent) => void;
  private readonly handleKeyUpBound: (e: KeyboardEvent) => void;
  private readonly handleBlurBound: () => void;
  private readonly handleVisibilityBound: () => void;
  private readonly handleTouchStartBound: (e: TouchEvent) => void;
  private readonly handleTouchMoveBound: (e: TouchEvent) => void;
  private readonly handleTouchEndBound: (e: TouchEvent) => void;

  constructor(callbacks: InputCallbacks = {}) {
    this.callbacks = callbacks;
    this.handleKeyDownBound = this.handleKeyDown.bind(this);
    this.handleKeyUpBound = this.handleKeyUp.bind(this);
    this.handleBlurBound = this.clearAll.bind(this);
    this.handleVisibilityBound = () => {
      if (document.hidden) this.clearAll();
    };
    this.handleTouchStartBound = this.handleTouchStart.bind(this);
    this.handleTouchMoveBound = this.handleTouchMove.bind(this);
    this.handleTouchEndBound = this.handleTouchEnd.bind(this);

    window.addEventListener('keydown', this.handleKeyDownBound);
    window.addEventListener('keyup', this.handleKeyUpBound);
    window.addEventListener('blur', this.handleBlurBound);
    document.addEventListener('visibilitychange', this.handleVisibilityBound);
  }

  public attachTouchElement(el: HTMLElement): void {
    this.detachTouchElement();
    this.touchElement = el;
    el.addEventListener('touchstart', this.handleTouchStartBound, { passive: false });
    el.addEventListener('touchmove', this.handleTouchMoveBound, { passive: false });
    el.addEventListener('touchend', this.handleTouchEndBound, { passive: false });
    el.addEventListener('touchcancel', this.handleTouchEndBound, { passive: false });
  }

  public detachTouchElement(): void {
    if (!this.touchElement) return;
    this.touchElement.removeEventListener('touchstart', this.handleTouchStartBound);
    this.touchElement.removeEventListener('touchmove', this.handleTouchMoveBound);
    this.touchElement.removeEventListener('touchend', this.handleTouchEndBound);
    this.touchElement.removeEventListener('touchcancel', this.handleTouchEndBound);
    this.touchElement = null;
  }

  public setCallbacks(callbacks: InputCallbacks): void {
    this.callbacks = callbacks;
  }

  public clearTouch(): void {
    this.leftTouchId = null;
    this.rightTouchId = null;
    this.resetFinger(this.touchState.left);
    this.resetFinger(this.touchState.right);
  }

  public clearAll(): void {
    this.leftStack.length = 0;
    this.rightStack.length = 0;
    this.spaceHeld = false;
    this.clearTouch();
  }

  public getTouchState(): TouchControlsState {
    return this.touchState;
  }

  public getSnapshot(): InputSnapshot {
    const leftActiveCode =
      this.leftStack.length > 0 ? this.leftStack[this.leftStack.length - 1] : null;
    const rightActiveCode =
      this.rightStack.length > 0 ? this.rightStack[this.rightStack.length - 1] : null;

    const targetLeft = this.touchState.left.active
      ? this.touchState.left.throttle
      : leftActiveCode !== null
        ? LEFT_POWER_MAP[leftActiveCode]
        : 0;
    const targetRight = this.touchState.right.active
      ? this.touchState.right.throttle
      : rightActiveCode !== null
        ? RIGHT_POWER_MAP[rightActiveCode]
        : 0;

    const touchModHeld =
      (this.touchState.left.active && this.touchState.left.inMiddleZone) ||
      (this.touchState.right.active && this.touchState.right.inMiddleZone);

    return {
      targetLeft,
      targetRight,
      leftActiveCode,
      rightActiveCode,
      spaceHeld: this.spaceHeld || touchModHeld,
    };
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDownBound);
    window.removeEventListener('keyup', this.handleKeyUpBound);
    window.removeEventListener('blur', this.handleBlurBound);
    document.removeEventListener('visibilitychange', this.handleVisibilityBound);
    this.detachTouchElement();
  }

  private handleTouchStart(e: TouchEvent): void {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, a, input, [data-touch-ignore]')) {
      return;
    }

    e.preventDefault();
    this.touchState.hasUsedTouch = true;
    this.callbacks.onAnyInteraction?.();

    const width = Math.max(1, window.innerWidth);
    const midX = width * 0.5;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.clientX < midX) {
        if (this.leftTouchId === null) {
          this.leftTouchId = touch.identifier;
          this.updateFingerFromTouch('left', touch);
        }
      } else {
        if (this.rightTouchId === null) {
          this.rightTouchId = touch.identifier;
          this.updateFingerFromTouch('right', touch);
        }
      }
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (this.leftTouchId === null && this.rightTouchId === null) {
      return;
    }

    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.leftTouchId) {
        this.updateFingerFromTouch('left', touch);
      } else if (touch.identifier === this.rightTouchId) {
        this.updateFingerFromTouch('right', touch);
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (this.leftTouchId === null && this.rightTouchId === null) {
      return;
    }

    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.leftTouchId) {
        this.leftTouchId = null;
        this.resetFinger(this.touchState.left);
      } else if (touch.identifier === this.rightTouchId) {
        this.rightTouchId = null;
        this.resetFinger(this.touchState.right);
      }
    }
  }

  private updateFingerFromTouch(side: 'left' | 'right', touch: Touch): void {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const xNorm = Math.max(0, Math.min(1, touch.clientX / width));
    const yNorm = Math.max(0, Math.min(1, touch.clientY / height));

    const finger = side === 'left' ? this.touchState.left : this.touchState.right;
    finger.active = true;
    finger.clientX = touch.clientX;
    finger.clientY = touch.clientY;
    finger.xNorm = xNorm;
    finger.yNorm = yNorm;
    finger.throttle = this.computeThrottleFromY(yNorm);
    finger.inMiddleZone =
      side === 'left'
        ? xNorm >= TOUCH_MID_LEFT_THRESHOLD
        : xNorm <= TOUCH_MID_RIGHT_THRESHOLD;
  }

  private computeThrottleFromY(yNorm: number): number {
    const zeroTop = TOUCH_SLIDER_ZERO_FRAC - TOUCH_SLIDER_ZERO_DEADZONE;
    const zeroBottom = TOUCH_SLIDER_ZERO_FRAC + TOUCH_SLIDER_ZERO_DEADZONE;

    if (yNorm <= TOUCH_SLIDER_FULL_FRAC) {
      return 1.0;
    }
    if (yNorm < zeroTop) {
      return (zeroTop - yNorm) / (zeroTop - TOUCH_SLIDER_FULL_FRAC);
    }
    if (yNorm <= zeroBottom) {
      return 0;
    }
    if (yNorm >= TOUCH_SLIDER_REV_FRAC) {
      return -0.3;
    }
    return -0.3 * ((yNorm - zeroBottom) / (TOUCH_SLIDER_REV_FRAC - zeroBottom));
  }

  private resetFinger(finger: TouchFingerState): void {
    finger.active = false;
    finger.throttle = 0;
    finger.inMiddleZone = false;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }

    if (BOUND_CODES.has(e.code)) {
      e.preventDefault();
    }

    this.callbacks.onAnyInteraction?.();

    if (e.repeat) {
      return;
    }

    if (e.code in LEFT_POWER_MAP) {
      this.pushToStack(this.leftStack, e.code);
      return;
    }
    if (e.code in RIGHT_POWER_MAP) {
      this.pushToStack(this.rightStack, e.code);
      return;
    }

    if (e.code === 'Space') {
      this.spaceHeld = true;
      return;
    }

    switch (e.code) {
      case 'Backspace':
        this.callbacks.onRespawn?.();
        break;
      case 'KeyR':
        this.callbacks.onRestart?.();
        break;
      case 'Escape':
        this.callbacks.onEscape?.();
        break;
      case 'KeyM':
        this.callbacks.onToggleMute?.();
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.code in LEFT_POWER_MAP) {
      this.removeFromStack(this.leftStack, e.code);
      return;
    }
    if (e.code in RIGHT_POWER_MAP) {
      this.removeFromStack(this.rightStack, e.code);
      return;
    }
    if (e.code === 'Space') {
      this.spaceHeld = false;
    }
  }

  private pushToStack(stack: string[], code: string): void {
    this.removeFromStack(stack, code);
    stack.push(code);
  }

  private removeFromStack(stack: string[], code: string): void {
    const idx = stack.indexOf(code);
    if (idx !== -1) {
      stack.splice(idx, 1);
    }
  }
}
