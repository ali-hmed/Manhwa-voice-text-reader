import { describe, it, expect } from 'vitest';
import { isDialogueBackground, type PixelData } from '../src/offscreen/dialogue-filter';

describe('Dialogue Filter (Local Image Heuristic)', () => {
  /**
   * Helper to create synthetic RGBA pixel buffer
   */
  function createSyntheticImage(
    width: number,
    height: number,
    fillPixel: (x: number, y: number) => [number, number, number, number]
  ): PixelData {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const [r, g, b, a] = fillPixel(x, y);
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = a;
      }
    }
    return { data, width, height };
  }

  it('keeps text on a flat white speech bubble', () => {
    const width = 200;
    const height = 100;
    const bbox = { x0: 30, y0: 20, x1: 170, y1: 80 };

    // White background (255, 255, 255) with some dark text pixels (0, 0, 0)
    const image = createSyntheticImage(width, height, (x, y) => {
      const isText = x >= 50 && x <= 150 && y >= 40 && y <= 60 && (x + y) % 4 === 0;
      if (isText) return [20, 20, 20, 255];
      return [255, 255, 255, 255]; // Flat white bubble
    });

    const isDialogue = isDialogueBackground(image, bbox, width, height);
    expect(isDialogue).toBe(true);
  });

  it('drops text on a blue gradient scene background (e.g. building sign)', () => {
    const width = 200;
    const height = 100;
    const bbox = { x0: 30, y0: 20, x1: 170, y1: 80 };

    // Blue gradient: e.g. R=30..50, G=80..110, B=180..220 (saturated scene text)
    const image = createSyntheticImage(width, height, (x, y) => {
      const r = Math.round(30 + (x / width) * 20);
      const g = Math.round(80 + (y / height) * 30);
      const b = Math.round(180 + (x / width) * 40);
      const isText = x >= 50 && x <= 150 && y >= 40 && y <= 60 && (x + y) % 4 === 0;
      if (isText) return [255, 255, 255, 255]; // White letters on blue sign
      return [r, g, b, 255];
    });

    const isDialogue = isDialogueBackground(image, bbox, width, height);
    expect(isDialogue).toBe(false);
  });

  it('keeps text on a flat dark caption / monologue box', () => {
    const width = 200;
    const height = 100;
    const bbox = { x0: 30, y0: 20, x1: 170, y1: 80 };

    // Dark background (20, 20, 20) with light text pixels (240, 240, 240)
    const image = createSyntheticImage(width, height, (x, y) => {
      const isText = x >= 50 && x <= 150 && y >= 40 && y <= 60 && (x + y) % 4 === 0;
      if (isText) return [240, 240, 240, 255];
      return [25, 25, 25, 255]; // Flat dark caption box
    });

    const isDialogue = isDialogueBackground(image, bbox, width, height);
    expect(isDialogue).toBe(true);
  });
});
