import { describe, it, expect } from 'vitest';
import {
  calculateTiles,
  remapBboxToFullImage,
  dedupeOverlapBlocks,
} from '../src/offscreen/tiling';
import type { OcrBlock } from '../src/types/messages';

describe('Tall Image Tiling & Slicing', () => {
  it('returns a single tile for standard images (height <= maxTileHeight)', () => {
    const tiles = calculateTiles(800, 1200, 1800, 100, 2000);
    expect(tiles.length).toBe(1);
    expect(tiles[0].sourceY).toBe(0);
    expect(tiles[0].sourceHeight).toBe(1200);
    expect(tiles[0].total).toBe(1);
  });

  it('slices tall webtoon strip (e.g. 5000px tall) into overlapping tiles', () => {
    const tiles = calculateTiles(800, 5000, 1800, 100, 2000);
    expect(tiles.length).toBeGreaterThan(1);
    expect(tiles[0].total).toBe(tiles.length);

    // Verify overlap between tile 0 and tile 1
    const tile0End = tiles[0].sourceY + tiles[0].sourceHeight;
    const tile1Start = tiles[1].sourceY;
    expect(tile0End - tile1Start).toBe(100);
  });

  it('correctly remaps tile bounding boxes to full original image coordinates', () => {
    const tile = {
      index: 1,
      total: 3,
      sourceX: 0,
      sourceY: 1700,
      sourceWidth: 800,
      sourceHeight: 1800,
      destWidth: 800,
      destHeight: 1800,
      scaleFactor: 1.0,
    };

    const tileBbox = { x0: 50, y0: 100, x1: 250, y1: 180 };
    const fullBbox = remapBboxToFullImage(tileBbox, tile);

    expect(fullBbox.x0).toBe(50);
    expect(fullBbox.y0).toBe(1800); // 1700 + 100
    expect(fullBbox.x1).toBe(250);
    expect(fullBbox.y1).toBe(1880); // 1700 + 180
  });

  it('deduplicates blocks in overlap region and preserves higher confidence', () => {
    const existingBlocks: OcrBlock[] = [
      { text: 'Wait!', confidence: 75, bbox: { x0: 100, y0: 1750, x1: 200, y1: 1800 } },
    ];
    const newTileBlocks: OcrBlock[] = [
      { text: 'Wait!', confidence: 95, bbox: { x0: 102, y0: 1752, x1: 202, y1: 1802 } },
      { text: 'Look there!', confidence: 90, bbox: { x0: 100, y0: 2000, x1: 300, y1: 2050 } },
    ];

    const result = dedupeOverlapBlocks(existingBlocks, newTileBlocks);
    expect(result.length).toBe(2);
    // Preserved higher confidence for 'Wait!'
    const waitBlock = result.find(b => b.text === 'Wait!');
    expect(waitBlock?.confidence).toBe(95);
  });
});
