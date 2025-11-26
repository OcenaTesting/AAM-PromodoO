
import { SoundType } from '../types';

class AudioService {
  private audioCtx: AudioContext | null = null;
  
  // File-based Audio (Rain, Cafe)
  private ambientElement: HTMLAudioElement | null = null;
  
  // Generated Audio (White/Brown Noise)
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  
  private currentAmbientType: string | null = null;
  private fadeInterval: number | null = null;
  
  // Sound Assets
  private sounds: Record<SoundType, string> = {
    [SoundType.START]: 'https://actions.google.com/sounds/v1/science_fiction/scifi_input.ogg',
    [SoundType.END]: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
    [SoundType.BREAK]: 'https://actions.google.com/sounds/v1/water/air_woosh_underwater.ogg',
    [SoundType.CLICK]: 'https://actions.google.com/sounds/v1/tools/button_tiny.ogg'
  };

  private ambientUrls: Record<string, string> = {
    rain: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg',
    cafe: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg'
  };

  constructor() {
    // Lazy init AudioContext to avoid console warnings before user interaction
  }

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioCtx;
  }

  playSound(type: SoundType) {
    const src = this.sounds[type];
    if (!src) return;

    const audio = new Audio(src);
    audio.volume = 0.5;
    audio.play().catch(e => console.warn("System sound play failed", e));
  }

  playAmbient(type: 'rain' | 'cafe' | 'white') {
    if (this.currentAmbientType === type) return;

    // 1. Stop current
    this.stopAmbient();

    // 2. Start new
    this.currentAmbientType = type;

    if (type === 'white') {
      this.playGeneratedNoise();
    } else {
      this.playFileAmbient(type);
    }
  }

  stopAmbient() {
    this.currentAmbientType = null;
    if (this.fadeInterval) clearInterval(this.fadeInterval);

    // Stop File Audio
    if (this.ambientElement) {
      this.fadeOutElement(this.ambientElement);
      this.ambientElement = null;
    }

    // Stop Generated Audio
    if (this.noiseSource && this.noiseGain) {
      this.fadeOutNode(this.noiseGain, this.noiseSource);
      this.noiseSource = null;
      this.noiseGain = null;
    }
  }

  // --- File Audio Logic (Rain, Cafe) ---

  private playFileAmbient(type: string) {
    const url = this.ambientUrls[type];
    if (!url) return;

    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0;
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.fadeInElement(audio);
      }).catch(e => {
        console.error("File ambient failed:", e);
        this.currentAmbientType = null;
      });
    }

    this.ambientElement = audio;
  }

  private fadeInElement(audio: HTMLAudioElement) {
    let vol = 0;
    this.fadeInterval = window.setInterval(() => {
      if (!audio || audio.paused) {
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        return;
      }
      vol += 0.05;
      if (vol >= 1.0) {
        vol = 1.0;
        if (this.fadeInterval) clearInterval(this.fadeInterval);
      }
      audio.volume = vol;
    }, 100);
  }

  private fadeOutElement(audio: HTMLAudioElement) {
    let vol = audio.volume;
    const fadeOut = setInterval(() => {
      vol -= 0.1;
      if (vol <= 0) {
        audio.pause();
        audio.src = "";
        clearInterval(fadeOut);
      } else {
        audio.volume = vol;
      }
    }, 100);
  }

  // --- Generated Audio Logic (Brown Noise) ---

  private playGeneratedNoise() {
    const ctx = this.getContext();
    
    // Resume context if suspended (browser policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const bufferSize = ctx.sampleRate * 2; // 2 seconds buffer
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate Brown Noise (Smoother than White Noise)
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Compensate for gain loss
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);

    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    source.start();

    this.noiseSource = source;
    this.noiseGain = gainNode;

    this.fadeInNode(gainNode);
  }

  private fadeInNode(gainNode: GainNode) {
    const ctx = this.getContext();
    gainNode.gain.cancelScheduledValues(ctx.currentTime);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 1.5);
  }

  private fadeOutNode(gainNode: GainNode, source: AudioBufferSourceNode) {
    const ctx = this.getContext();
    gainNode.gain.cancelScheduledValues(ctx.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    
    setTimeout(() => {
      try {
        source.stop();
        source.disconnect();
        gainNode.disconnect();
      } catch (e) {
        // Ignore if already stopped
      }
    }, 600);
  }
}

export const audioService = new AudioService();
