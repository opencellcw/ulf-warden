import { EventEmitter } from 'events';
import { Transform } from 'stream';

export interface VADConfig {
  silenceThreshold: number; // milliseconds of silence before considering speech ended
  minSpeechDuration: number; // milliseconds minimum speech duration
  energyThreshold: number; // audio energy level threshold (0-255)
  sampleRate: number; // audio sample rate
}

export interface SpeechSegment {
  startTime: number;
  endTime: number;
  duration: number;
  audioData: Buffer;
}

/**
 * Voice Activity Detector
 * Detects when someone is speaking vs silence
 */
export class VoiceActivityDetector extends EventEmitter {
  private config: VADConfig;
  private isSpeaking: boolean = false;
  private speechStartTime: number = 0;
  private lastAudioTime: number = 0;
  private audioBuffer: Buffer[] = [];
  private silenceTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<VADConfig>) {
    super();

    this.config = {
      silenceThreshold: 1500, // 1.5 seconds of silence
      minSpeechDuration: 500, // 0.5 seconds minimum
      energyThreshold: 30, // Low threshold to catch quiet speech
      sampleRate: 48000,
      ...config
    };

    console.log('[VAD] ✅ Initialized', this.config);
  }

  /**
   * Process audio chunk
   */
  processAudio(chunk: Buffer): void {
    const now = Date.now();

    // Calculate audio energy (simple RMS)
    const energy = this.calculateEnergy(chunk);

    // Check if this is speech or silence
    const isSpeech = energy > this.config.energyThreshold;

    if (isSpeech) {
      // Speech detected
      this.lastAudioTime = now;

      if (!this.isSpeaking) {
        // Speech started
        this.onSpeechStart(now);
      }

      // Add to buffer
      this.audioBuffer.push(chunk);

      // Clear silence timer
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }

      // Set new silence timer
      this.silenceTimer = setTimeout(() => {
        this.onSpeechEnd(now);
      }, this.config.silenceThreshold);
    }
  }

  /**
   * Called when speech starts
   */
  private onSpeechStart(timestamp: number): void {
    console.log('[VAD] 🎤 Speech started');
    this.isSpeaking = true;
    this.speechStartTime = timestamp;
    this.audioBuffer = [];
    this.emit('speech-start', timestamp);
  }

  /**
   * Called when speech ends (after silence threshold)
   */
  private onSpeechEnd(timestamp: number): void {
    const duration = timestamp - this.speechStartTime;

    // Check minimum duration
    if (duration < this.config.minSpeechDuration) {
      console.log('[VAD] ⚠️ Speech too short, ignoring');
      this.reset();
      return;
    }

    console.log(`[VAD] ✅ Speech ended (${duration}ms)`);

    const segment: SpeechSegment = {
      startTime: this.speechStartTime,
      endTime: timestamp,
      duration,
      audioData: Buffer.concat(this.audioBuffer)
    };

    this.emit('speech-end', segment);
    this.reset();
  }

  /**
   * Calculate audio energy (RMS)
   */
  private calculateEnergy(buffer: Buffer): number {
    if (buffer.length === 0) return 0;

    let sum = 0;
    for (let i = 0; i < buffer.length; i += 2) {
      // Read 16-bit PCM sample
      const sample = buffer.readInt16LE(i);
      sum += sample * sample;
    }

    const rms = Math.sqrt(sum / (buffer.length / 2));
    return rms / 32768 * 255; // Normalize to 0-255
  }

  /**
   * Reset detector state
   */
  private reset(): void {
    this.isSpeaking = false;
    this.speechStartTime = 0;
    this.audioBuffer = [];
    
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * Force end current speech
   */
  forceEnd(): void {
    if (this.isSpeaking) {
      this.onSpeechEnd(Date.now());
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VADConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[VAD] ⚙️ Config updated', this.config);
  }

  /**
   * Get current status
   */
  getStatus(): {
    isSpeaking: boolean;
    currentDuration: number;
  } {
    return {
      isSpeaking: this.isSpeaking,
      currentDuration: this.isSpeaking ? Date.now() - this.speechStartTime : 0
    };
  }
}

/**
 * Transform stream that processes audio for VAD
 */
export class VADTransform extends Transform {
  private vad: VoiceActivityDetector;

  constructor(vad: VoiceActivityDetector) {
    super();
    this.vad = vad;
  }

  _transform(chunk: Buffer, encoding: string, callback: Function): void {
    this.vad.processAudio(chunk);
    this.push(chunk); // Pass through
    callback();
  }
}
