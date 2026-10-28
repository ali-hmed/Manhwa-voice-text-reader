/**
 * Tall Image Slicing & Tiling Module.
 * Webtoon strips can be 10,000+ px tall.
 * Slices images into overlapping tiles (~1800px tall, 100px overlap),
 * downscales wide images if needed, maps OCR coordinates back to the full image,
 * and dedupes text recognized in the overlap areas.
 */
import { TILE_HEIGHT, TILE_OVERLAP, MAX_OCR_WIDTH } from '../shared/constants';
import type { OcrBlock } from '../types/messages';

export interface TileSpec {
  index: number;
  total: number;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  destWidth: number;
  destHeight: number;
  scaleFactor: number;
}

/**
 * Calculate tile layout for an image of given dimensions.
 */
export function calculateTiles(
  width: number,
  height: number,
  maxTileHeight = TILE_HEIGHT,
  overlap = TILE_OVERLAP,
  maxWidth = MAX_OCR_WIDTH
): TileSpec[] {
  if (width <= 0 || height <= 0) return [];

  // Downscale ratio if wider than maxWidth
  const scaleFactor = width > maxWidth ? maxWidth / width : 1.0;
  const destWidth = Math.round(width * scaleFactor);

  if (height <= maxTileHeight) {
    // Single tile
    return [
      {
        index: 0,
        total: 1,
        sourceX: 0,
        sourceY: 0,
        sourceWidth: width,
        sourceHeight: height,
        destWidth,
        destHeight: Math.round(height * scaleFactor),
        scaleFactor,
      },
    ];
  }

  const tiles: TileSpec[] = [];
  const step = maxTileHeight - overlap;
  let y = 0;
  let index = 0;

  while (y < height) {
    const tileHeight = Math.min(maxTileHeight, height - y);
    tiles.push({
      index,
      total: 0, // Will be set after loop
      sourceX: 0,
      sourceY: y,
      sourceWidth: width,
      sourceHeight: tileHeight,
      destWidth,
      destHeight: Math.round(tileHeight * scaleFactor),
      scaleFactor,
    });

    index++;
    y += step;
    if (y + overlap >= height) {
      // Remaining strip is too small, break
      break;
    }
  }

  for (const t of tiles) {
    t.total = tiles.length;
  }

  return tiles;
}

/**
 * Map bounding box from tile-local coordinates back to full original image coordinates.
 */
export function remapBboxToFullImage(
  tileBbox: { x0: number; y0: number; x1: number; y1: number },
  tile: TileSpec
): { x0: number; y0: number; x1: number; y1: number } {
  const scale = tile.scaleFactor;
  return {
    x0: tile.sourceX + Math.round(tileBbox.x0 / scale),
    y0: tile.sourceY + Math.round(tileBbox.y0 / scale),
    x1: tile.sourceX + Math.round(tileBbox.x1 / scale),
    y1: tile.sourceY + Math.round(tileBbox.y1 / scale),
  };
}

/**
 * Deduplicate blocks between consecutive tiles that fall inside the overlap region.
 */
export function dedupeOverlapBlocks(
  accumulatedBlocks: OcrBlock[],
  newTileBlocks: OcrBlock[],
  overlapToleranceY = 120
): OcrBlock[] {
  const result = [...accumulatedBlocks];

  for (const newBlock of newTileBlocks) {
    const newText = newBlock.text.trim().toLowerCase();
    if (!newText) continue;

    // Check if an existing block has identical text and nearby vertical position
    const duplicate = accumulatedBlocks.find(existing => {
      const existingText = existing.text.trim().toLowerCase();
      if (existingText !== newText) return false;
      const yDist = Math.abs(existing.bbox.y0 - newBlock.bbox.y0);
      return yDist <= overlapToleranceY;
    });

    if (duplicate) {
      // Keep whichever has higher confidence
      if (newBlock.confidence > duplicate.confidence) {
        duplicate.confidence = newBlock.confidence;
        duplicate.bbox = newBlock.bbox;
      }
      continue;
    }

    result.push(newBlock);
  }

  return result;
}
