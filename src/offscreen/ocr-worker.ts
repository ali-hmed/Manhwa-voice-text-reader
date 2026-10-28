/**
 * Offscreen OCR handler — initializes ONE Tesseract worker, reuses it,
 * processes jobs sequentially, slices tall webtoons into overlapping tiles,
 * remaps coordinates, dedupes overlaps, and returns text + confidence + bounding boxes.
 */
import Tesseract from 'tesseract.js';
import {
  isValidMessage,
  type OcrBlock,
  type OcrResultMessage,
  type OcrErrorMessage,
} from '../types/messages';
import {
  calculateTiles,
  remapBboxToFullImage,
  dedupeOverlapBlocks,
} from './tiling';
import { isDialogueBackground } from './dialogue-filter';

let worker: Tesseract.Worker | null = null;
let initializing: Promise<Tesseract.Worker> | null = null;

async function getWorker(): Promise<Tesseract.Worker> {
  if (worker) return worker;
  if (initializing) return initializing;

  initializing = (async () => {
    console.log('[Offscreen] Initializing Tesseract worker...');

    const w = await Tesseract.createWorker('eng', 1, {
      workerPath: chrome.runtime.getURL('tesseract/worker.min.js'),
      corePath: chrome.runtime.getURL('tesseract/tesseract-core-simd.wasm.js'),
      langPath: chrome.runtime.getURL('tesseract/lang'),
      workerBlobURL: false,
      gzip: true,
      logger: (m) => {
        if (m.status && typeof m.progress === 'number') {
          console.log(`[Offscreen] Tesseract: ${m.status} ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    // PSM 11 = sparse text — optimal for comic speech bubbles
    await w.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
    });

    worker = w;
    initializing = null;
    console.log('[Offscreen] Tesseract worker ready.');
    return w;
  })();

  return initializing;
}

/**
 * Decode image into an ImageBitmap using URL or Base64 fallback.
 */
async function loadImage(url?: string, base64?: string): Promise<ImageBitmap> {
  if (url && !url.startsWith('blob:') && !url.startsWith('data:')) {
    try {
      const res = await fetch(url, { referrerPolicy: 'no-referrer' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      return await createImageBitmap(blob);
    } catch (fetchErr) {
      console.warn('[Offscreen] Direct fetch failed for image URL, attempting base64 fallback:', fetchErr);
      if (!base64) throw fetchErr;
    }
  }

  if (base64) {
    const res = await fetch(base64);
    const blob = await res.blob();
    return await createImageBitmap(blob);
  }

  throw new Error('Image could not be fetched or decoded');
}

/**
 * OCR an individual tile drawn on an OffscreenCanvas.
 */
async function ocrCanvasTile(
  w: Tesseract.Worker,
  canvas: OffscreenCanvas,
  ctx: OffscreenCanvasRenderingContext2D,
  dialogueOnly = true
): Promise<{ blocks: OcrBlock[]; fullText: string; meanConfidence: number }> {
  // Convert canvas to Blob for Tesseract recognition
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const result = await w.recognize(blob);

  const blocks: OcrBlock[] = [];
  let fullText = '';

  if (result.data.blocks && result.data.blocks.length > 0) {
    for (const block of result.data.blocks) {
      const text = block.text.trim();
      if (!text) continue;

      // When dialogueOnly is enabled, verify the text background is a flat light/dark bubble
      if (dialogueOnly && !isDialogueBackground(ctx, block.bbox, canvas.width, canvas.height)) {
        console.log(`[Offscreen] Filtered out scene text / non-bubble background: "${text.slice(0, 35)}..."`);
        continue;
      }

      blocks.push({
        text,
        confidence: block.confidence,
        bbox: {
          x0: block.bbox.x0,
          y0: block.bbox.y0,
          x1: block.bbox.x1,
          y1: block.bbox.y1,
        },
      });
      fullText += text + '\n';
    }
  } else {
    fullText = result.data.text.trim();
    if (fullText) {
      const bbox = { x0: 0, y0: 0, x1: canvas.width, y1: canvas.height };
      if (!dialogueOnly || isDialogueBackground(ctx, bbox, canvas.width, canvas.height)) {
        blocks.push({
          text: fullText,
          confidence: result.data.confidence,
          bbox,
        });
      }
    }
  }

  return {
    blocks,
    fullText: fullText.trim(),
    meanConfidence: result.data.confidence,
  };
}

async function processOcrJob(
  imageUrl: string | undefined,
  imageBase64: string | undefined,
  imageId: string,
  tileIndex: number,
  dialogueOnly = true
): Promise<OcrResultMessage | OcrErrorMessage> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await loadImage(imageUrl, imageBase64);
    const w = await getWorker();

    const tiles = calculateTiles(bitmap.width, bitmap.height);
    console.log(`[Offscreen] Processing image ${imageId} (${bitmap.width}x${bitmap.height}) into ${tiles.length} tile(s) [dialogueOnly=${dialogueOnly}]`);

    let accumulatedBlocks: OcrBlock[] = [];
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const tile of tiles) {
      // Draw this tile onto an OffscreenCanvas
      const canvas = new OffscreenCanvas(tile.destWidth, tile.destHeight);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2d context for OffscreenCanvas');

      ctx.drawImage(
        bitmap,
        tile.sourceX,
        tile.sourceY,
        tile.sourceWidth,
        tile.sourceHeight,
        0,
        0,
        tile.destWidth,
        tile.destHeight
      );

      const tileResult = await ocrCanvasTile(w, canvas, ctx, dialogueOnly);

      // Remap tile bounding boxes to the full original image coordinate space
      const remappedBlocks = tileResult.blocks.map(b => ({
        ...b,
        bbox: remapBboxToFullImage(b.bbox, tile),
      }));

      // Deduplicate with previous tile's overlap
      accumulatedBlocks = dedupeOverlapBlocks(accumulatedBlocks, remappedBlocks);

      totalConfidence += tileResult.meanConfidence;
      confidenceCount++;
    }

    const meanConfidence = confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 0;
    const fullText = accumulatedBlocks.map(b => b.text).join('\n');

    return {
      type: 'OCR_RESULT',
      imageId,
      tileIndex,
      blocks: accumulatedBlocks,
      fullText,
      meanConfidence,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[Offscreen] OCR processing failed:', error);
    return {
      type: 'OCR_ERROR',
      imageId,
      tileIndex,
      error,
    };
  } finally {
    if (bitmap) {
      bitmap.close();
    }
  }
}

// ─── Message handler ───────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isValidMessage(message)) return;

  if (message.type === 'OCR_JOB' && 'target' in message && message.target === 'offscreen') {
    processOcrJob(
      message.imageUrl,
      message.imageBase64,
      message.imageId,
      message.tileIndex,
      message.dialogueOnly !== false
    )
      .then(sendResponse)
      .catch((err) => {
        sendResponse({
          type: 'OCR_ERROR',
          imageId: message.imageId,
          tileIndex: message.tileIndex,
          error: err instanceof Error ? err.message : String(err),
        } satisfies OcrErrorMessage);
      });

    return true; // Keep channel open for async response
  }
});

console.log('[Manhwa Voice] Offscreen document loaded.');
