interface TurbineVoice {
  saw: OscillatorNode;
  tri: OscillatorNode;
  noiseFilter: BiquadFilterNode;
  gain: GainNode;
  panner: StereoPannerNode;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private leftVoice: TurbineVoice | null = null;
  private rightVoice: TurbineVoice | null = null;
  private damperGain: GainNode | null = null;
  private damperFilter: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private lastBounceSoundMs = 0;
  private muted = false;
  private initialized = false;

  public unlock(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.38;
    this.masterGain.connect(this.ctx.destination);

    const noiseBuffer = this.createNoiseBuffer(this.ctx, 2.0);
    this.noiseBuffer = noiseBuffer;
    this.leftVoice = this.createTurbineVoice(-0.55, noiseBuffer);
    this.rightVoice = this.createTurbineVoice(0.55, noiseBuffer);

    // Damper thruster continuous filtered jet noise
    const damperNoise = this.ctx.createBufferSource();
    damperNoise.buffer = noiseBuffer;
    damperNoise.loop = true;

    this.damperFilter = this.ctx.createBiquadFilter();
    this.damperFilter.type = 'bandpass';
    this.damperFilter.frequency.value = 420;
    this.damperFilter.Q.value = 1.6;

    this.damperGain = this.ctx.createGain();
    this.damperGain.gain.value = 0;

    damperNoise.connect(this.damperFilter);
    this.damperFilter.connect(this.damperGain);
    this.damperGain.connect(this.masterGain);
    damperNoise.start();

    this.initialized = true;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.38, this.ctx.currentTime, 0.03);
    }
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public updateEngines(
    pLeft: number,
    pRight: number,
    speedMs: number,
    landingBoost: number,
    airborneOverload: boolean,
    active: boolean,
    nitroActive = false,
    coolantActive = false
  ): void {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    if (!active) {
      this.leftVoice?.gain.gain.setTargetAtTime(0, now, 0.08);
      this.rightVoice?.gain.gain.setTargetAtTime(0, now, 0.08);
      this.damperGain?.gain.setTargetAtTime(0, now, 0.05);
      return;
    }

    const speedFactor = Math.min(1.45, speedMs / 80);
    const effectiveBoost = Math.max(landingBoost, nitroActive ? 0.95 : 0);
    if (this.leftVoice) {
      this.updateVoice(this.leftVoice, pLeft, speedFactor, effectiveBoost, airborneOverload, now);
    }
    if (this.rightVoice) {
      this.updateVoice(this.rightVoice, pRight, speedFactor, effectiveBoost, airborneOverload, now);
    }

    // Afterburner / nitro / cryo-coolant / overload jet layer
    if (this.damperGain && this.damperFilter) {
      let jetGain = 0;
      let jetFreq = 520;
      if (nitroActive) {
        jetGain = 0.36;
        jetFreq = 780 + speedFactor * 260;
      } else if (coolantActive) {
        jetGain = 0.22;
        jetFreq = 1850;
      } else if (landingBoost > 0.02) {
        jetGain = landingBoost * 0.34;
        jetFreq = 520 + landingBoost * 420;
      } else if (airborneOverload) {
        jetGain = 0.22;
        jetFreq = 920;
      }
      this.damperGain.gain.setTargetAtTime(jetGain, now, 0.03);
      this.damperFilter.frequency.setTargetAtTime(jetFreq, now, 0.04);
    }
  }

  public playCountdownBeep(isGo: boolean): void {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isGo ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.32 : 0.16));
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + (isGo ? 0.34 : 0.18));
  }

  public playCheckpoint(isAhead: boolean): void {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = isAhead ? [587.33, 880] : [523.25, 659.25];
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.065);
      gain.gain.setValueAtTime(0.18, now + i * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.065 + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.065);
      osc.stop(now + i * 0.065 + 0.2);
    });
  }

  public playPerfectDamp(isHugeBoost = true): void {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const freqs = isHugeBoost ? [260, 520] : [260];
    freqs.forEach((startFreq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(
        isHugeBoost ? startFreq * 3.1 : 620,
        now + (isHugeBoost ? 0.28 : 0.14)
      );
      gain.gain.setValueAtTime(isHugeBoost ? 0.22 : 0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isHugeBoost ? 0.38 : 0.2));
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + (isHugeBoost ? 0.4 : 0.22));
    });
  }

  public playImpact(severity: number): void {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.24);
    const vol = Math.min(0.42, 0.14 + severity * 0.28);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playDisassemblyExplosion(): void {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // 1. Deep sub-bass structural detonation thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(125, now);
    subOsc.frequency.exponentialRampToValueAtTime(24, now + 0.72);
    subGain.gain.setValueAtTime(0.55, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.78);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 0.8);

    // 2. Electric plasma-binder snap zap
    const zapOsc = this.ctx.createOscillator();
    const zapGain = this.ctx.createGain();
    zapOsc.type = 'sawtooth';
    zapOsc.frequency.setValueAtTime(1480, now);
    zapOsc.frequency.exponentialRampToValueAtTime(110, now + 0.24);
    zapGain.gain.setValueAtTime(0.28, now);
    zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    zapOsc.connect(zapGain);
    zapGain.connect(this.masterGain);
    zapOsc.start(now);
    zapOsc.stop(now + 0.28);

    // 3. Wideband explosion blast & tearing metal roar
    if (this.noiseBuffer) {
      const blastSrc = this.ctx.createBufferSource();
      blastSrc.buffer = this.noiseBuffer;
      blastSrc.loop = true;

      const blastFilter = this.ctx.createBiquadFilter();
      blastFilter.type = 'lowpass';
      blastFilter.frequency.setValueAtTime(2400, now);
      blastFilter.frequency.exponentialRampToValueAtTime(135, now + 1.15);
      blastFilter.Q.value = 1.4;

      const blastGain = this.ctx.createGain();
      blastGain.gain.setValueAtTime(0.52, now);
      blastGain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

      blastSrc.connect(blastFilter);
      blastFilter.connect(blastGain);
      blastGain.connect(this.masterGain);
      blastSrc.start(now);
      blastSrc.stop(now + 1.3);
    }
  }

  public playDebrisBounce(severity: number, pan = 0): void {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    const perfNow = performance.now();
    if (perfNow - this.lastBounceSoundMs < 85) return;
    this.lastBounceSoundMs = perfNow;

    const clampedSev = Math.min(1.2, Math.max(0.08, severity));
    const now = this.ctx.currentTime;
    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
    panner.connect(this.masterGain);

    // Metallic clang + crunch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const basePitch = 160 + Math.random() * 140;
    osc.frequency.setValueAtTime(basePitch, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.19);
    gain.gain.setValueAtTime(Math.min(0.32, 0.08 + clampedSev * 0.22), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
    osc.connect(gain);
    gain.connect(panner);
    osc.start(now);
    osc.stop(now + 0.22);

    if (this.noiseBuffer) {
      const nSrc = this.ctx.createBufferSource();
      nSrc.buffer = this.noiseBuffer;
      const nFilt = this.ctx.createBiquadFilter();
      nFilt.type = 'bandpass';
      nFilt.frequency.setValueAtTime(750 + Math.random() * 650, now);
      nFilt.Q.value = 1.8;
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(Math.min(0.24, 0.06 + clampedSev * 0.18), now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      nSrc.connect(nFilt);
      nFilt.connect(nGain);
      nGain.connect(panner);
      nSrc.start(now);
      nSrc.stop(now + 0.16);
    }
  }

  private updateVoice(
    voice: TurbineVoice,
    power: number,
    speedFactor: number,
    landingBoost: number,
    airborneOverload: boolean,
    now: number
  ): void {
    const absP = Math.abs(power);
    const overloadJitter = airborneOverload ? (Math.random() - 0.5) * 28 : 0;
    const baseFreq =
      46 +
      absP * 68 +
      speedFactor * 36 +
      landingBoost * 34 +
      (power < 0 ? 18 : 0) +
      overloadJitter;
    voice.saw.frequency.setTargetAtTime(baseFreq, now, 0.03);
    voice.tri.frequency.setTargetAtTime(baseFreq * 1.98, now, 0.03);
    voice.noiseFilter.frequency.setTargetAtTime(
      220 + absP * 1100 + speedFactor * 500 + landingBoost * 650,
      now,
      0.04
    );
    const targetGain = 0.07 + absP * 0.14 + speedFactor * 0.04 + landingBoost * 0.08;
    voice.gain.gain.setTargetAtTime(targetGain, now, 0.04);
  }

  private createTurbineVoice(pan: number, noiseBuffer: AudioBuffer): TurbineVoice {
    const ctx = this.ctx!;
    const saw = ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.value = 50;

    const tri = ctx.createOscillator();
    tri.type = 'triangle';
    tri.frequency.value = 100;

    const sawGain = ctx.createGain();
    sawGain.gain.value = 0.35;
    const triGain = ctx.createGain();
    triGain.gain.value = 0.25;

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 300;
    noiseFilter.Q.value = 1.2;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.4;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;

    saw.connect(sawGain);
    tri.connect(triGain);
    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);

    sawGain.connect(gain);
    triGain.connect(gain);
    noiseGain.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain!);

    saw.start();
    tri.start();
    noiseSrc.start();

    return { saw, tri, noiseFilter, gain, panner };
  }

  private createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}
