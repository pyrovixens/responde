// ============================================================================
// Web Audio API Synthesized Emergency Siren / Klaxon Generator
// Works across modern browsers and mobile PWA without external asset latency
// ============================================================================

class SirenGenerator {
  private audioCtx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private intervalId: NodeJS.Timeout | number | null = null;
  private currentOscillator: OscillatorNode | null = null;
  private currentGain: GainNode | null = null;

  private initAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public playAlarm(pattern: 'HILO' | 'PULSE' | 'SINGLE_BEEP' = 'HILO') {
    const ctx = this.initAudioContext();
    if (!ctx) return;

    this.stopAlarm();
    this.isPlaying = true;

    // Trigger vibration if device supports it
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 1000]);
    }

    if (pattern === 'SINGLE_BEEP') {
      this.playBeep(960, 0.4);
      return;
    }

    let toggle = false;
    const playToneStep = () => {
      if (!this.isPlaying) return;
      const freq = toggle ? 720 : 960;
      toggle = !toggle;
      this.playTone(freq, 0.45);
    };

    playToneStep();
    this.intervalId = setInterval(playToneStep, 500);
  }

  private playTone(freq: number, durationSec: number) {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      // Smooth attack and decay to prevent audio pops
      gain.gain.setValueAtTime(0.01, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.4, this.audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(this.audioCtx.currentTime);
      osc.stop(this.audioCtx.currentTime + durationSec);

      this.currentOscillator = osc;
      this.currentGain = gain;
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  private playBeep(freq: number, durationSec: number) {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durationSec);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + durationSec);
    } catch {
      // Fail safely
    }
  }

  public stopAlarm() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId as number);
      this.intervalId = null;
    }
    if (this.currentOscillator) {
      try {
        this.currentOscillator.stop();
      } catch {
        // Ignored
      }
      this.currentOscillator = null;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const siren = new SirenGenerator();
