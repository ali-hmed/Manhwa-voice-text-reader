import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReadingQueue } from '../src/content/queue';
import type { DiscoveredImage } from '../src/content/discovery';

describe('ReadingQueue', () => {
  let queue: ReadingQueue;

  beforeEach(() => {
    vi.clearAllMocks();
    queue = new ReadingQueue();
    // Mock chrome.runtime.sendMessage
    (globalThis as unknown as { chrome: unknown }).chrome = {
      runtime: {
        sendMessage: vi.fn().mockImplementation(async (msg) => {
          if (msg.type === 'OCR_REQUEST') {
            return {
              type: 'OCR_RESULT',
              imageId: msg.imageId,
              tileIndex: 0,
              blocks: [
                {
                  text: `Recognized for ${msg.imageId}`,
                  confidence: 90,
                  bbox: { x0: 10, y0: 10, x1: 100, y1: 50 },
                },
              ],
              fullText: `Recognized for ${msg.imageId}`,
              meanConfidence: 90,
            };
          }
          return null;
        }),
      },
    };
  });

  afterEach(() => {
    queue.destroy();
  });

  function createMockImage(id: string, topY: number): DiscoveredImage {
    const el = document.createElement('img');
    Object.defineProperty(el, 'naturalWidth', { value: 800 });
    Object.defineProperty(el, 'naturalHeight', { value: 1200 });
    el.getBoundingClientRect = () => ({
      top: topY,
      bottom: topY + 1200,
      left: 0,
      right: 800,
      width: 800,
      height: 1200,
      x: 0,
      y: topY,
      toJSON: () => {},
    });

    return {
      element: el,
      id,
      url: `https://example.com/${id}.png`,
      naturalWidth: 800,
      naturalHeight: 1200,
    };
  }

  it('sorts images into vertical reading order', async () => {
    const imgBottom = createMockImage('img-bottom', 2000);
    const imgTop = createMockImage('img-top', 100);

    // Add in reverse order
    queue.addImage(imgBottom);
    queue.addImage(imgTop);

    await new Promise(r => setTimeout(r, 10));

    // Queue should process top image first
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ imageId: 'img-top' })
    );
  });

  it('emits segments incrementally via onSegmentsAvailable', async () => {
    const segmentsReceived: string[] = [];
    queue.onSegmentsAvailable((segments) => {
      segments.forEach(s => segmentsReceived.push(s.text));
    });

    const img1 = createMockImage('img-1', 100);
    queue.addImage(img1);

    // Wait for async processing tick
    await new Promise(r => setTimeout(r, 50));

    expect(segmentsReceived.length).toBe(1);
    expect(segmentsReceived[0]).toContain('Recognized for img-1');
  });

  it('continues queue processing when an image fails with an error', async () => {
    let errorReported = '';
    queue.onError((msg) => {
      errorReported = msg;
    });

    // Make the first image fail
    (chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      return {
        type: 'OCR_ERROR',
        imageId: 'img-fail',
        tileIndex: 0,
        error: 'Failed to decode image',
      };
    });

    const imgFail = createMockImage('img-fail', 100);
    const imgSuccess = createMockImage('img-ok', 500);

    queue.addImage(imgFail);
    queue.addImage(imgSuccess);

    await new Promise(r => setTimeout(r, 100));

    // Error was reported
    expect(errorReported).toContain('Failed to decode image');
    // Second image was still processed
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ imageId: 'img-ok' })
    );
  });

  it('prioritizes unscanned images near the active reading position with lookahead', async () => {
    // Create 15 sequential images
    const images: DiscoveredImage[] = [];
    for (let i = 0; i < 15; i++) {
      images.push(createMockImage(`img-${i}`, i * 1000));
    }

    // Set active reading image to img-8
    queue.setActiveReadingImage('img-8');

    for (const img of images) {
      queue.addImage(img);
    }

    await new Promise(r => setTimeout(r, 20));

    // The very first image processed should be img-8 (the user's current reading position!)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ imageId: 'img-8' })
    );
  });

  it('stitches unpunctuated sentences across panel boundaries', async () => {
    (chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (msg) => {
      if (msg.imageId === 'panel-1') {
        return {
          type: 'OCR_RESULT',
          imageId: 'panel-1',
          tileIndex: 0,
          blocks: [{ text: 'HE PROBABLY', confidence: 90, bbox: { x0: 0, y0: 0, x1: 100, y1: 50 } }],
          fullText: 'HE PROBABLY',
          meanConfidence: 90,
        };
      }
      if (msg.imageId === 'panel-2') {
        return {
          type: 'OCR_RESULT',
          imageId: 'panel-2',
          tileIndex: 0,
          blocks: [{ text: 'STARTED THIS WAY.', confidence: 90, bbox: { x0: 0, y0: 0, x1: 100, y1: 50 } }],
          fullText: 'STARTED THIS WAY.',
          meanConfidence: 90,
        };
      }
      return null;
    });

    const segmentsReceived: string[] = [];
    queue.onSegmentsAvailable((segments) => {
      segments.forEach(s => segmentsReceived.push(s.text));
    });

    const p1 = createMockImage('panel-1', 100);
    const p2 = createMockImage('panel-2', 500);

    queue.addImage(p1);
    queue.addImage(p2);

    await new Promise(r => setTimeout(r, 80));

    // Panel 1 ended with unpunctuated "HE PROBABLY", which was stitched into Panel 2's "STARTED THIS WAY."
    expect(segmentsReceived.length).toBe(1);
    expect(segmentsReceived[0]).toBe('HE PROBABLY STARTED THIS WAY.');
  });
});
