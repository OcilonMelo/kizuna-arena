// Procedural 16-bit / Anime Arcade Sound Synthesizer (Web Audio API)

class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    duration: number,
    volume = 0.12,
    delay = 0
  ): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, startFreq), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playNoise(duration: number, volume = 0.12, filterFreq = 1200, delay = 0): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.setValueAtTime(1.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration + 0.02);
  }

  playSlash(): void {
    this.playNoise(0.11, 0.09, 2600);
    this.playTone('sawtooth', 620, 180, 0.1, 0.06);
  }

  playShoot(): void {
    this.playTone('square', 780, 260, 0.09, 0.055);
    this.playTone('triangle', 1200, 500, 0.07, 0.04);
  }

  playHit(crit: boolean): void {
    if (crit) {
      this.playNoise(0.14, 0.14, 1500);
      this.playTone('sawtooth', 320, 90, 0.14, 0.11);
      this.playTone('square', 1100, 1650, 0.11, 0.08, 0.02);
    } else {
      this.playNoise(0.07, 0.07, 900);
      this.playTone('triangle', 220, 75, 0.08, 0.07);
    }
  }

  playExplosion(): void {
    this.playNoise(0.32, 0.16, 480);
    this.playTone('sawtooth', 160, 38, 0.3, 0.13);
  }

  playHeal(): void {
    this.playTone('sine', 523, 659, 0.12, 0.07, 0);
    this.playTone('sine', 659, 880, 0.14, 0.07, 0.07);
    this.playTone('triangle', 880, 1175, 0.18, 0.06, 0.14);
  }

  playShield(): void {
    this.playTone('triangle', 340, 680, 0.16, 0.07);
    this.playTone('sine', 680, 1020, 0.18, 0.06, 0.05);
  }

  playDash(): void {
    this.playNoise(0.12, 0.08, 3200);
    this.playTone('sine', 420, 920, 0.1, 0.05);
  }

  playDodge(): void {
    this.playTone('sine', 680, 1320, 0.09, 0.07);
    this.playNoise(0.08, 0.06, 3800);
  }

  playClash(): void {
    this.playNoise(0.18, 0.16, 2800);
    this.playTone('square', 1480, 620, 0.18, 0.1);
    this.playTone('sawtooth', 980, 1960, 0.12, 0.08, 0.03);
  }

  playAwaken(): void {
    this.playTone('sawtooth', 260, 520, 0.16, 0.09, 0);
    this.playTone('sawtooth', 390, 780, 0.2, 0.09, 0.08);
    this.playTone('square', 520, 1040, 0.25, 0.08, 0.16);
  }

  playOrbPickup(): void {
    this.playTone('triangle', 587, 880, 0.1, 0.08, 0);
    this.playTone('triangle', 880, 1318, 0.14, 0.08, 0.08);
  }

  playHazardWarning(): void {
    this.playTone('square', 440, 440, 0.08, 0.05, 0);
    this.playTone('square', 587, 587, 0.08, 0.05, 0.12);
  }

  playUltimate(): void {
    this.playTone('sawtooth', 180, 720, 0.28, 0.12, 0);
    this.playTone('square', 360, 1440, 0.26, 0.09, 0.06);
    this.playNoise(0.28, 0.12, 1800, 0.1);
  }

  playKo(): void {
    this.playNoise(0.35, 0.18, 600);
    this.playTone('sawtooth', 240, 45, 0.35, 0.14);
  }

  playVictory(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, idx) => {
      this.playTone('square', n, n, 0.18, 0.08, idx * 0.11);
    });
  }

  playDefeat(): void {
    const notes = [392, 349, 311, 261];
    notes.forEach((n, idx) => {
      this.playTone('sawtooth', n, n * 0.96, 0.22, 0.08, idx * 0.14);
    });
  }
}

export const sound = new SoundEngine();
