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

  public updateEngines(pLeft: number, pRight: number, speedMs: number, damperFiring: boolean, active: boolean): void {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    if (!active) {
      this.leftVoice?.gain.gain.setTargetAtTime(0, now, 0.08);
      this.rightVoice?.gain.gain.setTargetAtTime(0, now, 0.08);
      this.damperGain?.gain.setTargetAtTime(0, now, 0.05);
      return;
    }

    const speedFactor = Math.min(1, speedMs / 80);
    if (this.leftVoice) {
      this.updateVoice(this.leftVoice, pLeft, speedFactor, now);
    }
    if (this.rightVoice) {
      this.updateVoice(this.rightVoice, pRight, speedFactor, now);
    }

    if (this.damperGain && this.damperFilter) {
      this.damperGain.gain.setTargetAtTime(damperFiring ? 0.32 : 0, now, 0.025);
      this.damperFilter.frequency.setTargetAtTime(damperFiring ? 560 : 380, now, 0.04);
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

  public playPerfectDamp(): void {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.14);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);
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

  private updateVoice(voice: TurbineVoice, power: number, speedFactor: number, now: number): void {
    const absP = Math.abs(power);
    const baseFreq = 46 + absP * 68 + speedFactor * 36 + (power < 0 ? 18 : 0);
    voice.saw.frequency.setTargetAtTime(baseFreq, now, 0.03);
    voice.tri.frequency.setTargetAtTime(baseFreq * 1.98, now, 0.03);
    voice.noiseFilter.frequency.setTargetAtTime(220 + absP * 1100 + speedFactor * 500, now, 0.04);
    const targetGain = 0.07 + absP * 0.14 + speedFactor * 0.04;
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
