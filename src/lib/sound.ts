"use client";

/**
 * Poker SFX + lounge BGM via Web Audio (no asset files / license risk).
 * SFX and music are independent toggles. Mobile uses a quieter, thinner mix.
 */

function isMobileClient() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 768px)").matches ||
    /iPhone|iPad|Android/i.test(navigator.userAgent)
  );
}

class SoundManager {
  private ctx: AudioContext | null = null;
  /** Table SFX (chips, cards, wins). */
  public sfxEnabled = true;
  /** Soft poker-lounge background bed. */
  public musicEnabled = true;
  private musicTimer: number | null = null;
  private musicGain: GainNode | null = null;
  private musicStarted = false;
  private unlockBound = false;
  private loungeEl: HTMLAudioElement | null = null;
  private sampleCache = new Map<string, HTMLAudioElement>();

  /** Back-compat with older callers. */
  get enabled() {
    return this.sfxEnabled;
  }
  set enabled(v: boolean) {
    this.sfxEnabled = v;
  }

  private playSample(src: string, vol: number) {
    if (typeof window === "undefined") return false;
    try {
      let el = this.sampleCache.get(src);
      if (!el) {
        el = new Audio(src);
        el.preload = "auto";
        this.sampleCache.set(src, el);
      }
      const node = el.cloneNode(true) as HTMLAudioElement;
      node.volume = vol;
      void node.play().catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  private initContext() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  /** Call once after a user gesture so iOS/Android unlock audio. */
  unlock() {
    this.initContext();
    if (this.musicEnabled) this.startMusic();
  }

  bindUnlockOnce() {
    if (typeof window === "undefined" || this.unlockBound) return;
    this.unlockBound = true;
    const go = () => {
      this.unlock();
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
    };
    window.addEventListener("pointerdown", go, { once: true });
    window.addEventListener("keydown", go, { once: true });
  }

  private tone(
    freq: number,
    opts: {
      type?: OscillatorType;
      dur?: number;
      vol?: number;
      when?: number;
      slideTo?: number;
      dest?: AudioNode;
    } = {}
  ) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + (opts.when || 0);
    const dur = opts.dur ?? 0.12;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, opts.slideTo), t0 + dur);
    }
    gain.gain.setValueAtTime(opts.vol ?? 0.14, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(opts.dest ?? this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  }

  playChip() {
    if (!this.sfxEnabled) return;
    if (this.playSample("/audio/chip.wav", isMobileClient() ? 0.35 : 0.45)) return;
    this.initContext();
    try {
      this.tone(1800, { type: "sine", dur: 0.05, vol: 0.14, slideTo: 800 });
      this.tone(920, { type: "triangle", dur: 0.04, vol: 0.06, when: 0.02 });
    } catch {
      // ignore
    }
  }

  playCardSlide() {
    if (!this.sfxEnabled) return;
    if (this.playSample("/audio/card.wav", isMobileClient() ? 0.3 : 0.4)) return;
    this.initContext();
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1200;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch {
      // ignore
    }
  }

  playWin() {
    if (!this.sfxEnabled) return;
    this.initContext();
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        this.tone(freq, { type: "triangle", dur: 0.32, vol: 0.18, when: idx * 0.08 });
      });
    } catch {
      // ignore
    }
  }

  playCelebrate() {
    if (!this.sfxEnabled) return;
    this.initContext();
    try {
      const notes = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, idx) => {
        this.tone(freq, { type: "triangle", dur: 0.28, vol: 0.16, when: idx * 0.07 });
      });
      this.tone(1568, { type: "sine", dur: 0.45, vol: 0.12, when: 0.42 });
    } catch {
      // ignore
    }
  }

  playLose() {
    if (!this.sfxEnabled) return;
    this.initContext();
    try {
      this.tone(320, { type: "triangle", dur: 0.22, vol: 0.16, slideTo: 160 });
      this.tone(220, { type: "sine", dur: 0.35, vol: 0.12, when: 0.12, slideTo: 110 });
    } catch {
      // ignore
    }
  }

  playMatch() {
    if (!this.sfxEnabled) return;
    this.initContext();
    try {
      this.tone(660, { type: "square", dur: 0.08, vol: 0.08 });
      this.tone(880, { type: "square", dur: 0.1, vol: 0.1, when: 0.08 });
      this.tone(1174, { type: "sine", dur: 0.18, vol: 0.12, when: 0.16 });
    } catch {
      // ignore
    }
  }

  playEquip() {
    if (!this.sfxEnabled) return;
    this.initContext();
    try {
      this.tone(740, { type: "triangle", dur: 0.1, vol: 0.12 });
      this.tone(988, { type: "triangle", dur: 0.16, vol: 0.1, when: 0.07 });
    } catch {
      // ignore
    }
  }

  playLevelUp() {
    if (!this.sfxEnabled) return;
    this.initContext();
    try {
      [523, 659, 784, 1046, 1318].forEach((f, i) => {
        this.tone(f, { type: "sine", dur: 0.2, vol: 0.14, when: i * 0.06 });
      });
    } catch {
      // ignore
    }
  }

  playClick() {
    if (!this.sfxEnabled) return;
    this.initContext();
    try {
      this.tone(600, { type: "sine", dur: 0.03, vol: 0.08 });
    } catch {
      // ignore
    }
  }

  playMission() {
    if (!this.sfxEnabled) return;
    this.initContext();
    try {
      this.tone(880, { type: "triangle", dur: 0.12, vol: 0.14 });
      this.tone(1175, { type: "triangle", dur: 0.2, vol: 0.12, when: 0.1 });
    } catch {
      // ignore
    }
  }

  setMusicEnabled(on: boolean) {
    this.musicEnabled = on;
    if (on) this.startMusic();
    else this.stopMusic();
  }

  startMusic() {
    if (!this.musicEnabled || typeof window === "undefined") return;
    if (this.musicStarted) return;
    this.musicStarted = true;

    const mobile = isMobileClient();

    // Prefer recorded lounge loop (original generated asset under /public/audio)
    try {
      if (!this.loungeEl) {
        this.loungeEl = new Audio("/audio/lounge.wav");
        this.loungeEl.loop = true;
        this.loungeEl.preload = "auto";
      }
      this.loungeEl.volume = mobile ? 0.22 : 0.38;
      void this.loungeEl.play().then(() => {}).catch(() => {
        this.musicStarted = false;
        this.startSynthMusic(mobile);
      });
      return;
    } catch {
      // fall through to synth
    }

    this.startSynthMusic(mobile);
  }

  private startSynthMusic(mobile: boolean) {
    this.initContext();
    if (!this.ctx) return;
    this.musicStarted = true;
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = mobile ? 0.035 : 0.07;
    this.musicGain.connect(this.ctx.destination);

    const scheduleBar = () => {
      if (!this.ctx || !this.musicGain || !this.musicEnabled) return;
      const chords = mobile
        ? [
            [220, 261.63, 329.63],
            [174.61, 220, 261.63],
          ]
        : [
            [110, 164.81, 220, 261.63],
            [87.31, 174.61, 220, 261.63],
            [130.81, 164.81, 196, 261.63],
            [98, 146.83, 196, 246.94],
          ];
      const chord = chords[Math.floor(Math.random() * chords.length)];
      chord.forEach((f, i) => {
        this.tone(f, {
          type: i === 0 ? "sine" : "triangle",
          dur: mobile ? 2.4 : 3.2,
          vol: (mobile ? 0.045 : 0.055) / (i + 1),
          when: i * 0.02,
          dest: this.musicGain!,
        });
      });
    };

    scheduleBar();
    this.musicTimer = window.setInterval(scheduleBar, mobile ? 3200 : 3800);
  }

  stopMusic() {
    this.musicStarted = false;
    if (this.loungeEl) {
      try {
        this.loungeEl.pause();
        this.loungeEl.currentTime = 0;
      } catch {
        // ignore
      }
    }
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.musicGain && this.ctx) {
      try {
        this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      } catch {
        // ignore
      }
    }
    this.musicGain = null;
  }
}

export const sound = new SoundManager();
