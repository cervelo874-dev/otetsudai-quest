/**
 * Web Audio API だけで効果音をシンセサイズするサウンドエンジン（外部mp3不使用）
 */
interface ToneOpts {
  freq: number;
  at?: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  to?: number;
  attack?: number;
}

const MUTE_KEY = 'otetsudai-muted';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted: boolean = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';

  setMuted(m: boolean): void {
    this.muted = m;
    try {
      localStorage.setItem(MUTE_KEY, m ? '1' : '0');
    } catch {
      /* noop */
    }
  }

  private get(): AudioContext | null {
    if (this.muted) return null;
    try {
      if (!this.ctx) {
        const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
        const Ctor = w.AudioContext ?? w.webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.6;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** 最初のユーザー操作で AudioContext を起こす */
  unlock(): void {
    this.get();
  }

  private tone(o: ToneOpts): void {
    const ctx = this.get();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + (o.at ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    const vol = o.vol ?? 0.2;
    const atk = o.attack ?? 0.008;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.05);
  }

  private noise(at: number, dur: number, vol: number, freq = 3000): void {
    const ctx = this.get();
    if (!ctx || !this.master) return;
    if (!this.noiseBuf) {
      const len = Math.floor(ctx.sampleRate * 0.5);
      const b = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = b;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    const t0 = ctx.currentTime + at;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /** ボタンタップ音「ポッ」 */
  tap(): void {
    this.tone({ freq: 520, to: 780, dur: 0.07, type: 'triangle', vol: 0.18 });
  }

  /** ポンッ（選択・カプセル） */
  pop(): void {
    this.tone({ freq: 280, to: 1100, dur: 0.12, type: 'sine', vol: 0.28 });
  }

  /** コイン獲得「チャリーン」 */
  coin(): void {
    this.tone({ freq: 987.77, dur: 0.09, type: 'square', vol: 0.12 });
    this.tone({ freq: 1318.51, at: 0.08, dur: 0.55, type: 'square', vol: 0.12 });
    this.tone({ freq: 2637, at: 0.08, dur: 0.4, type: 'sine', vol: 0.06 });
  }

  /** できた！の上昇アルペジオ */
  success(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.tone({ freq: f, at: i * 0.07, dur: 0.2, type: 'triangle', vol: 0.22 }),
    );
  }

  error(): void {
    this.tone({ freq: 220, to: 150, dur: 0.25, type: 'sawtooth', vol: 0.1 });
  }

  /** キラキラ（宝箱が届いた時など） */
  sparkle(): void {
    for (let i = 0; i < 7; i++) {
      this.tone({ freq: 1500 + Math.random() * 1600, at: i * 0.055, dur: 0.18, type: 'sine', vol: 0.08 });
    }
  }

  /** 宝箱開封ファンファーレ */
  fanfare(): void {
    const C5 = 523.25, Ab4 = 415.3, Bb4 = 466.16;
    const seq: [number, number, number][] = [
      [C5, 0, 0.11], [C5, 0.12, 0.11], [C5, 0.24, 0.11], [C5, 0.36, 0.42],
      [Ab4, 0.82, 0.3], [Bb4, 1.12, 0.3], [C5, 1.42, 0.14], [Bb4, 1.6, 0.12], [C5, 1.74, 0.9],
    ];
    seq.forEach(([f, at, dur]) => {
      this.tone({ freq: f, at, dur, type: 'square', vol: 0.11 });
      this.tone({ freq: f * 2, at, dur, type: 'triangle', vol: 0.06 });
      this.tone({ freq: f / 2, at, dur, type: 'triangle', vol: 0.1 });
    });
    for (let i = 0; i < 6; i++) {
      this.tone({ freq: 2000 + Math.random() * 1500, at: 1.8 + i * 0.07, dur: 0.2, type: 'sine', vol: 0.06 });
    }
  }

  /** ガチャ回転音（ガリガリ→ヒュイッ） */
  gachaSpin(): void {
    let t = 0;
    for (let i = 0; i < 18; i++) {
      const gap = 0.05 + (i / 18) * 0.06;
      this.tone({ freq: 900 + (i % 2) * 300, at: t, dur: 0.04, type: 'square', vol: 0.06 });
      this.noise(t, 0.03, 0.12);
      t += gap;
    }
    this.tone({ freq: 400, to: 1400, at: t, dur: 0.28, type: 'sine', vol: 0.18 });
  }

  /** タイマー終了アラーム */
  alarm(): void {
    for (let r = 0; r < 4; r++) {
      const base = r * 0.85;
      this.tone({ freq: 880, at: base, dur: 0.16, type: 'square', vol: 0.15 });
      this.tone({ freq: 1174.66, at: base + 0.2, dur: 0.16, type: 'square', vol: 0.15 });
      this.tone({ freq: 880, at: base + 0.4, dur: 0.16, type: 'square', vol: 0.15 });
    }
  }
}

export const sound = new SoundEngine();
