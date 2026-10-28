import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpeechController } from '../src/content/speech';
import type { SpeechSegment } from '../src/content/segmentation';

// Mock Web Speech API
class MockSpeechSynthesisUtterance {
  public text: string;
  public rate = 1.0;
  public voice: SpeechSynthesisVoice | null = null;
  public onstart: (() => void) | null = null;
  public onend: (() => void) | null = null;
  public onerror: ((e: { error: string }) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

const mockSpeechSynthesis = {
  speaking: false,
  paused: false,
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => []),
  onvoiceschanged: null as (() => void) | null,
};

describe('SpeechController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
    (globalThis as unknown as { speechSynthesis: unknown }).speechSynthesis = mockSpeechSynthesis;
  });

  const testSegments: SpeechSegment[] = [
    { id: '1', imageId: 'img', text: 'Sentence one.' },
    { id: '2', imageId: 'img', text: 'Sentence two.' },
  ];

  it('initializes with idle state and accepts segments', () => {
    const controller = new SpeechController();
    controller.setSegments(testSegments);
    const state = controller.getState();
    expect(state.status).toBe('ready');
    expect(state.totalSegments).toBe(2);
    expect(state.currentIndex).toBe(0);
  });

  it('calls speak on Play and transitions to playing state', () => {
    const controller = new SpeechController();
    controller.setSegments(testSegments);

    controller.play();
    expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);

    const activeUtterance = mockSpeechSynthesis.speak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    expect(activeUtterance.text).toBe('Sentence one.');

    // Simulate speech start
    activeUtterance.onstart?.();
    expect(controller.getState().status).toBe('playing');
  });

  it('pauses and resumes playback', () => {
    const controller = new SpeechController();
    controller.setSegments(testSegments);
    controller.play();

    const activeUtterance = mockSpeechSynthesis.speak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    activeUtterance.onstart?.();

    controller.pause();
    expect(mockSpeechSynthesis.pause).toHaveBeenCalledTimes(1);
    expect(controller.getState().status).toBe('paused');

    controller.resume();
    expect(mockSpeechSynthesis.resume).toHaveBeenCalledTimes(1);
    expect(controller.getState().status).toBe('playing');
  });

  it('stops and cancels speech', () => {
    const controller = new SpeechController();
    controller.setSegments(testSegments);
    controller.play();

    controller.stop();
    expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    expect(controller.getState().status).toBe('stopped');
  });

  it('advances sequentially to next segment on utterance end', () => {
    const controller = new SpeechController();
    controller.setSegments(testSegments);
    controller.setScanningComplete(true);
    controller.play();

    const firstUtterance = mockSpeechSynthesis.speak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    firstUtterance.onstart?.();

    // End first utterance -> should trigger second
    firstUtterance.onend?.();

    expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(2);
    const secondUtterance = mockSpeechSynthesis.speak.mock.calls[1][0] as MockSpeechSynthesisUtterance;
    expect(secondUtterance.text).toBe('Sentence two.');
    expect(controller.getState().currentIndex).toBe(1);

    // End second utterance -> completed
    secondUtterance.onstart?.();
    secondUtterance.onend?.();
    expect(controller.getState().status).toBe('completed');
  });

  it('ignores stale onend callbacks after stop() is called', () => {
    const controller = new SpeechController();
    controller.setSegments(testSegments);
    controller.play();

    const firstUtterance = mockSpeechSynthesis.speak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    firstUtterance.onstart?.();

    // User stops
    controller.stop();
    expect(controller.getState().status).toBe('stopped');

    // Delayed stale onend fires
    firstUtterance.onend?.();

    // Should NOT advance or speak second utterance
    expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);
    expect(controller.getState().status).toBe('stopped');
  });

  it('navigates with next(), previous(), and repeat()', () => {
    const controller = new SpeechController();
    controller.setSegments(testSegments);
    controller.play();

    // next() skips to segment 2
    controller.next();
    expect(controller.getState().currentIndex).toBe(1);

    // repeat() replays current segment
    controller.repeat();
    expect(controller.getState().currentIndex).toBe(1);

    // previous() goes back to segment 0 if played recently
    controller.previous();
    expect(controller.getState().currentIndex).toBe(0);
  });

  it('supports incremental segment appending via appendSegments()', () => {
    const controller = new SpeechController();
    controller.setSegments([testSegments[0]]);
    expect(controller.getState().totalSegments).toBe(1);

    controller.appendSegments([testSegments[1]], true);
    expect(controller.getState().totalSegments).toBe(2);
  });

  it('clamps and applies speech rate', () => {
    const controller = new SpeechController();
    controller.setRate(0.5); // below 0.7 min
    expect(controller.getRate()).toBe(0.7);

    controller.setRate(2.0); // above 1.5 max
    expect(controller.getRate()).toBe(1.5);

    controller.setRate(1.2);
    expect(controller.getRate()).toBe(1.2);
  });

  it('clamps currentIndex and never shows segment index exceeding totalSegments', () => {
    const controller = new SpeechController();
    controller.setSegments(testSegments); // 2 segments
    controller.setScanningComplete(true);
    controller.play();

    // Utterance 1
    const utt1 = mockSpeechSynthesis.speak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    utt1.onstart?.();
    utt1.onend?.();

    // Utterance 2 (final segment)
    const utt2 = mockSpeechSynthesis.speak.mock.calls[1][0] as MockSpeechSynthesisUtterance;
    utt2.onstart?.();
    utt2.onend?.();

    const state = controller.getState();
    expect(state.status).toBe('completed');
    expect(state.totalSegments).toBe(2);
    // Index must be clamped to 1, NEVER 2 (which would cause "Segment 3 of 2" or "Segment 51 of 50")
    expect(state.currentIndex).toBe(1);
    expect(state.currentIndex + 1).toBe(2);
  });

  it('enters waiting state when queue runs out before scanning completes and auto-resumes', () => {
    const controller = new SpeechController();
    controller.setSegments([testSegments[0]]); // 1 segment available
    controller.setScanningComplete(false); // scanning still in progress
    controller.play();

    const utt1 = mockSpeechSynthesis.speak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    utt1.onstart?.();
    utt1.onend?.();

    // Queue exhausted but scanning not done -> enter waiting
    expect(controller.getState().status).toBe('waiting');

    // New segments arrive from scanner
    controller.appendSegments([testSegments[1]], false);

    // Auto-resumes speech immediately
    expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(2);
    const utt2 = mockSpeechSynthesis.speak.mock.calls[1][0] as MockSpeechSynthesisUtterance;
    expect(utt2.text).toBe('Sentence two.');
  });

  it('converts ALL-CAPS text to sentence case when speaking while keeping original in segment', () => {
    const controller = new SpeechController();
    const capsSegment: SpeechSegment = {
      id: 'caps-1',
      imageId: 'img-1',
      text: 'HE PROBABLY STARTED THIS WAY.',
    };
    controller.setSegments([capsSegment]);
    controller.play();

    const activeUtterance = mockSpeechSynthesis.speak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    // Spoken text is sentence-cased
    expect(activeUtterance.text).toBe('He probably started this way.');
    // Segment text retains original comic lettering
    expect(controller.getState().currentSegment?.text).toBe('HE PROBABLY STARTED THIS WAY.');
  });

  it('maintains current segment by stable ID when segments are appended', () => {
    const controller = new SpeechController();
    controller.setSegments([testSegments[0]]);
    controller.play();

    expect(controller.getState().currentSegmentId).toBe('1');
    expect(controller.getState().currentIndex).toBe(0);

    // Append new segments
    controller.appendSegments([testSegments[1]], false);

    // Stable ID is unchanged
    expect(controller.getState().currentSegmentId).toBe('1');
    expect(controller.getState().currentIndex).toBe(0);
  });
});
