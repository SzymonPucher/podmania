import type { InputSnapshot } from '../types';

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
  'Backspace',
  'KeyR',
  'Escape',
  'KeyM',
]);

export interface InputCallbacks {
  onRespawn?: () => void;
  onRestart?: () => void;
  onEscape?: () => void;
  onToggleMute?: () => void;
  onAnyInteraction?: () => void;
}

export class InputManager {
  private leftStack: string[] = [];
  private rightStack: string[] = [];
  private callbacks: InputCallbacks;

  private readonly handleKeyDownBound: (e: KeyboardEvent) => void;
  private readonly handleKeyUpBound: (e: KeyboardEvent) => void;
  private readonly handleBlurBound: () => void;
  private readonly handleVisibilityBound: () => void;

  constructor(callbacks: InputCallbacks = {}) {
    this.callbacks = callbacks;
    this.handleKeyDownBound = this.handleKeyDown.bind(this);
    this.handleKeyUpBound = this.handleKeyUp.bind(this);
    this.handleBlurBound = this.clearAll.bind(this);
    this.handleVisibilityBound = () => {
      if (document.hidden) this.clearAll();
    };

    window.addEventListener('keydown', this.handleKeyDownBound);
    window.addEventListener('keyup', this.handleKeyUpBound);
    window.addEventListener('blur', this.handleBlurBound);
    document.addEventListener('visibilitychange', this.handleVisibilityBound);
  }

  public setCallbacks(callbacks: InputCallbacks): void {
    this.callbacks = callbacks;
  }

  public clearAll(): void {
    this.leftStack.length = 0;
    this.rightStack.length = 0;
  }

  public getSnapshot(): InputSnapshot {
    const leftActiveCode =
      this.leftStack.length > 0 ? this.leftStack[this.leftStack.length - 1] : null;
    const rightActiveCode =
      this.rightStack.length > 0 ? this.rightStack[this.rightStack.length - 1] : null;

    return {
      targetLeft: leftActiveCode !== null ? LEFT_POWER_MAP[leftActiveCode] : 0,
      targetRight: rightActiveCode !== null ? RIGHT_POWER_MAP[rightActiveCode] : 0,
      leftActiveCode,
      rightActiveCode,
    };
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDownBound);
    window.removeEventListener('keyup', this.handleKeyUpBound);
    window.removeEventListener('blur', this.handleBlurBound);
    document.removeEventListener('visibilitychange', this.handleVisibilityBound);
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
