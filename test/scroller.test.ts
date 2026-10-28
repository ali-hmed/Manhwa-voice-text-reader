import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Scroller } from '../src/content/scroller';
import type { SpeechSegment } from '../src/content/segmentation';

describe('Scroller', () => {
  let scroller: Scroller;

  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    Object.defineProperty(window, 'innerHeight', { value: 1000, writable: true });
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
    scroller = new Scroller(true);
  });

  const segmentA: SpeechSegment = {
    id: 'seg-1',
    imageId: 'img-1',
    text: 'Hello',
    bbox: { x0: 50, y0: 100, x1: 200, y1: 150 },
  };

  const segmentB: SpeechSegment = {
    id: 'seg-2',
    imageId: 'img-1',
    text: 'Next line',
    bbox: { x0: 50, y0: 500, x1: 200, y1: 550 },
  };

  it('scrolls only once per unique segment ID', () => {
    const mockImg = document.createElement('img');
    Object.defineProperty(mockImg, 'naturalWidth', { value: 800 });
    Object.defineProperty(mockImg, 'naturalHeight', { value: 1200 });
    mockImg.getBoundingClientRect = () => ({
      top: 0,
      bottom: 1200,
      left: 0,
      right: 800,
      width: 800,
      height: 1200,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    scroller.scrollToSegment(segmentA, mockImg);
    expect(window.scrollTo).toHaveBeenCalledTimes(1);

    // Calling again with same segment does not trigger additional scroll
    scroller.scrollToSegment(segmentA, mockImg);
    expect(window.scrollTo).toHaveBeenCalledTimes(1);

    // Different segment triggers scroll
    scroller.scrollToSegment(segmentB, mockImg);
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
  });

  it('calls scrollIntoView when available', () => {
    const mockImg = document.createElement('img');
    mockImg.scrollIntoView = vi.fn();
    scroller.scrollToSegment(segmentA, mockImg);
    expect(mockImg.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: 'center' })
    );
  });

  it('respects auto-scroll disabled toggle', () => {
    scroller.setEnabled(false);
    const mockImg = document.createElement('img');
    scroller.scrollToSegment(segmentA, mockImg);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
