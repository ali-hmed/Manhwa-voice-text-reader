/**
 * Speech Controller — wraps window.speechSynthesis in the content script.
 * Implements session tokens to reject stale callbacks, handles Play/Pause/Resume/Stop/Next/Previous/Repeat,
 * incremental queue updates, stable segment ID tracking, waiting state, and sentence-cased speech synthesis.
 */
import { toSentenceCase, type SpeechSegment } from './segmentation';

export type PlaybackStatus =
  | 'idle'
  | 'scanning'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'waiting'
  | 'stopped'
  | 'completed'
  | 'error';

export interface PlaybackState {
  status: PlaybackStatus;
  currentIndex: number;
  totalSegments: number;
  currentSegment: SpeechSegment | null;
  currentSegmentId: string | null;
  error?: string;
}

export class SpeechController {
  private segments: SpeechSegment[] = [];
  private currentSegmentId: string | null = null;
  private status: PlaybackStatus = 'idle';
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private sessionToken = 0;
  private rate = 1.0;
  private voice: SpeechSynthesisVoice | null = null;
  private voiceURI = '';
  private stateChangeListeners: ((state: PlaybackState) => void)[] = [];
  private voicesChangeListeners: ((voices: SpeechSynthesisVoice[]) => void)[] = [];
  private resumeTimeout: ReturnType<typeof setTimeout> | null = null;
  private utteranceStartTime = 0;
  private scanningComplete = false;

  constructor() {
    this.selectDefaultVoice();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.selectDefaultVoice();
        const voices = this.getAvailableVoices();
        for (const cb of this.voicesChangeListeners) {
          cb(voices);
        }
      };
    }
  }

  private selectDefaultVoice(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();

    if (this.voiceURI) {
      const match = voices.find(v => v.voiceURI === this.voiceURI || v.name === this.voiceURI);
      if (match) {
        this.voice = match;
        return;
      }
    }

    // Fall back to preferred English voice
    const enVoice =
      voices.find(v => v.lang.startsWith('en') && v.default) ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0] ||
      null;
    this.voice = enVoice;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices();
  }

  public onVoicesChanged(listener: (voices: SpeechSynthesisVoice[]) => void): () => void {
    this.voicesChangeListeners.push(listener);
    const voices = this.getAvailableVoices();
    if (voices.length > 0) {
      listener(voices);
    }
    return () => {
      this.voicesChangeListeners = this.voicesChangeListeners.filter(l => l !== listener);
    };
  }

  public getCurrentIndex(): number {
    if (!this.currentSegmentId || this.segments.length === 0) return 0;
    const idx = this.segments.findIndex(s => s.id === this.currentSegmentId);
    return idx >= 0 ? idx : 0;
  }

  public setSegments(segments: SpeechSegment[]): void {
    this.stop();
    this.segments = [...segments];
    this.currentSegmentId = segments[0]?.id || null;
    this.emitState(segments.length > 0 ? 'ready' : 'idle');
  }

  /**
   * Append newly discovered segments during incremental scanning.
   * Tracks current segment by stable ID so out-of-order insertions never shift it.
   * Automatically resumes speech if we were in the "waiting" state.
   */
  public appendSegments(newSegments: SpeechSegment[], isScanningFinished = false): void {
    this.scanningComplete = isScanningFinished;

    if (newSegments.length === 0) {
      if (isScanningFinished && this.status === 'waiting') {
        this.status = 'completed';
        this.emitState('completed');
      }
      return;
    }

    // Deduplicate against existing segment IDs
    const existingIds = new Set(this.segments.map(s => s.id));
    const toAdd = newSegments.filter(s => !existingIds.has(s.id));
    if (toAdd.length === 0) return;

    this.segments.push(...toAdd);

    if (!this.currentSegmentId && this.segments.length > 0) {
      this.currentSegmentId = this.segments[0].id;
    }

    // If waiting for more panels, resume speech automatically
    if (this.status === 'waiting') {
      console.log('[Speech] New segments arrived while waiting, automatically resuming playback');
      const currentIdx = this.currentSegmentId
        ? this.segments.findIndex(s => s.id === this.currentSegmentId)
        : -1;

      if (currentIdx >= 0 && currentIdx + 1 < this.segments.length) {
        this.currentSegmentId = this.segments[currentIdx + 1].id;
      } else {
        this.currentSegmentId = toAdd[0].id;
      }
      this.speakCurrentSegment();
    } else {
      this.emitState(this.status);
    }
  }

  public setScanningComplete(complete = true): void {
    this.scanningComplete = complete;
    if (complete && this.status === 'waiting') {
      this.status = 'completed';
      this.emitState('completed');
    }
  }

  public getSegments(): SpeechSegment[] {
    return this.segments;
  }

  public getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }

  public setRate(newRate: number): void {
    this.rate = Math.max(0.7, Math.min(1.5, newRate));
  }

  public getRate(): number {
    return this.rate;
  }

  public setVoiceURI(voiceURI: string): void {
    this.voiceURI = voiceURI;
    this.selectDefaultVoice();
  }

  public getVoiceURI(): string {
    return this.voice?.voiceURI || this.voiceURI;
  }

  public play(fromIndex?: number): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.emitState('error', 'Speech synthesis is not supported in this browser.');
      return;
    }

    if (this.segments.length === 0) {
      if (!this.scanningComplete) {
        this.status = 'waiting';
        this.emitState('waiting');
      } else {
        this.emitState('idle');
      }
      return;
    }

    if (typeof fromIndex === 'number') {
      const clamped = Math.max(0, Math.min(fromIndex, this.segments.length - 1));
      this.currentSegmentId = this.segments[clamped]?.id || null;
    } else if (!this.currentSegmentId && this.segments.length > 0) {
      this.currentSegmentId = this.segments[0].id;
    }

    if (this.status === 'paused' && fromIndex === undefined) {
      this.resume();
      return;
    }

    this.speakCurrentSegment();
  }

  public pause(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.status !== 'playing') return;

    this.clearResumeTimeout();
    window.speechSynthesis.pause();
    this.status = 'paused';
    this.emitState('paused');
  }

  public resume(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.status !== 'paused') return;

    this.clearResumeTimeout();
    window.speechSynthesis.resume();
    this.status = 'playing';
    this.emitState('playing');

    // Watchdog for Chrome resume failure
    this.resumeTimeout = setTimeout(() => {
      if (this.status === 'playing' && !window.speechSynthesis.speaking) {
        console.warn('[Speech] Resume watchdog triggered, re-speaking segment');
        this.speakCurrentSegment();
      }
    }, 250);
  }

  public stop(): void {
    this.clearResumeTimeout();
    this.sessionToken++;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
    this.status = 'stopped';
    this.emitState('stopped');
  }

  /**
   * Skip forward to next segment.
   */
  public next(): void {
    const currentIdx = this.getCurrentIndex();
    if (currentIdx < this.segments.length - 1) {
      this.currentSegmentId = this.segments[currentIdx + 1].id;
      this.speakCurrentSegment();
    } else if (!this.scanningComplete) {
      this.status = 'waiting';
      this.emitState('waiting');
    } else {
      this.status = 'completed';
      this.emitState('completed');
    }
  }

  /**
   * Previous: replay current segment if started > 1.5s ago, otherwise step back one.
   */
  public previous(): void {
    const elapsed = this.utteranceStartTime > 0 ? Date.now() - this.utteranceStartTime : 0;
    const currentIdx = this.getCurrentIndex();
    if (elapsed > 1500 || currentIdx === 0) {
      this.speakCurrentSegment();
    } else {
      this.currentSegmentId = this.segments[Math.max(0, currentIdx - 1)].id;
      this.speakCurrentSegment();
    }
  }

  /**
   * Repeat: replay current segment from beginning without advancing.
   */
  public repeat(): void {
    this.speakCurrentSegment();
  }

  private speakCurrentSegment(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    this.clearResumeTimeout();
    this.sessionToken++;
    const currentToken = this.sessionToken;

    if (this.segments.length === 0) {
      if (!this.scanningComplete) {
        this.status = 'waiting';
        this.emitState('waiting');
      } else {
        this.status = 'completed';
        this.emitState('completed');
      }
      return;
    }

    const currentIdx = this.getCurrentIndex();
    if (currentIdx >= this.segments.length) {
      if (!this.scanningComplete) {
        this.status = 'waiting';
        this.emitState('waiting');
      } else {
        this.status = 'completed';
        this.emitState('completed');
      }
      return;
    }

    const segment = this.segments[currentIdx];
    this.currentSegmentId = segment.id;

    window.speechSynthesis.cancel();

    // Convert ALL-CAPS text to sentence case before speaking (keeps original text for transcript)
    const textToSpeak = segment.spokenText || toSentenceCase(segment.text);
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.rate = this.rate;

    utterance.onstart = () => {
      if (this.sessionToken !== currentToken) return;
      this.clearResumeTimeout();
      this.utteranceStartTime = Date.now();
      this.status = 'playing';
      this.emitState('playing');
    };

    utterance.onend = () => {
      if (this.sessionToken !== currentToken) return;
      this.currentUtterance = null;

      const idx = this.getCurrentIndex();
      if (idx + 1 < this.segments.length) {
        this.currentSegmentId = this.segments[idx + 1].id;
        this.speakCurrentSegment();
      } else if (!this.scanningComplete) {
        // Queue currently exhausted, but scanning is still active
        this.status = 'waiting';
        this.emitState('waiting');
      } else {
        // Both queue exhausted and scanning finished
        this.status = 'completed';
        this.emitState('completed');
      }
    };

    utterance.onerror = (e) => {
      if (this.sessionToken !== currentToken) return;
      if (e.error === 'canceled' || e.error === 'interrupted') {
        return;
      }
      console.error('[Speech] Utterance error:', e.error);
      this.emitState('error', `Speech error: ${e.error}`);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  private clearResumeTimeout(): void {
    if (this.resumeTimeout) {
      clearTimeout(this.resumeTimeout);
      this.resumeTimeout = null;
    }
  }

  public onStateChange(listener: (state: PlaybackState) => void): () => void {
    this.stateChangeListeners.push(listener);
    listener(this.getState());
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== listener);
    };
  }

  public getState(): PlaybackState {
    const rawIdx = this.getCurrentIndex();
    const clampedIdx = this.segments.length > 0 ? Math.min(rawIdx, this.segments.length - 1) : 0;
    return {
      status: this.status,
      currentIndex: clampedIdx,
      totalSegments: this.segments.length,
      currentSegment: this.segments[clampedIdx] || null,
      currentSegmentId: this.currentSegmentId,
    };
  }

  private emitState(status: PlaybackStatus, error?: string): void {
    this.status = status;
    const rawIdx = this.getCurrentIndex();
    const clampedIdx = this.segments.length > 0 ? Math.min(rawIdx, this.segments.length - 1) : 0;
    const state: PlaybackState = {
      status,
      currentIndex: clampedIdx,
      totalSegments: this.segments.length,
      currentSegment: this.segments[clampedIdx] || null,
      currentSegmentId: this.currentSegmentId,
      error,
    };
    for (const listener of this.stateChangeListeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('[Speech] Error in listener callback:', err);
      }
    }
  }

  public destroy(): void {
    this.stop();
    this.stateChangeListeners = [];
    this.voicesChangeListeners = [];
  }
}
