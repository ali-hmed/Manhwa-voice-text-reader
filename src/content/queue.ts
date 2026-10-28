/**
 * Reading Queue & Incremental Scanner.
 * Processes comic images strictly sequentially (concurrency = 1) in comic reading order.
 * Prioritizes scanning images near the current reading/scroll position and maintains a 5–10 panel lookahead.
 * Stitches unpunctuated sentences across panel boundaries and virtual page loads.
 */
import { getTotalChapterPageCount, type DiscoveredImage } from './discovery';
import {
  segmentOcrResult,
  hasTerminalPunctuation,
  toSentenceCase,
  type SpeechSegment,
} from './segmentation';
import { isValidMessage, type OcrResultMessage, type OcrErrorMessage } from '../types/messages';

export interface QueueProgress {
  scannedImages: number;
  totalImages: number;
  isScanning: boolean;
}

export class ReadingQueue {
  private images: DiscoveredImage[] = [];
  private processedImageIds = new Set<string>();
  private isProcessing = false;
  private isDestroyed = false;
  private scheduleTimeout: ReturnType<typeof setTimeout> | null = null;
  private virtualCheckTimeout: ReturnType<typeof setTimeout> | null = null;

  private activeImageId: string | null = null;
  private dialogueOnly = true;
  private pendingCarryOverText = '';

  private onSegmentsCallback: ((segments: SpeechSegment[], isFinished: boolean) => void) | null = null;
  private onProgressCallback: ((progress: QueueProgress) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  public addImage(image: DiscoveredImage): void {
    if (this.isDestroyed) return;
    if (this.images.some(img => img.id === image.id)) return;

    this.images.push(image);
    this.sortImages();
    this.notifyProgress();

    // Schedule processing on next tick so synchronous batches settle into vertical reading order
    if (!this.isProcessing && !this.scheduleTimeout) {
      this.scheduleTimeout = setTimeout(() => {
        this.scheduleTimeout = null;
        if (!this.isProcessing) {
          this.processNextImage();
        }
      }, 0);
    }
  }

  public sortImages(): void {
    const scrollY = typeof window !== 'undefined' ? (window.scrollY || window.pageYOffset || 0) : 0;
    this.images.sort((a, b) => {
      const aTop = a.element.getBoundingClientRect ? a.element.getBoundingClientRect().top + scrollY : 0;
      const bTop = b.element.getBoundingClientRect ? b.element.getBoundingClientRect().top + scrollY : 0;
      return aTop - bTop;
    });
  }

  public setActiveReadingImage(imageId: string | null): void {
    this.activeImageId = imageId;
  }

  public setDialogueOnly(enabled: boolean): void {
    this.dialogueOnly = enabled;
  }

  public onSegmentsAvailable(cb: (segments: SpeechSegment[], isFinished: boolean) => void): void {
    this.onSegmentsCallback = cb;
  }

  public onProgress(cb: (progress: QueueProgress) => void): void {
    this.onProgressCallback = cb;
  }

  public onError(cb: (error: string) => void): void {
    this.onErrorCallback = cb;
  }

  private notifyProgress(): void {
    if (this.onProgressCallback) {
      const chapterTotal = getTotalChapterPageCount();
      const total = Math.max(this.images.length, chapterTotal);
      this.onProgressCallback({
        scannedImages: this.processedImageIds.size,
        totalImages: total,
        isScanning: this.isProcessing,
      });
    }
  }

  /**
   * Select next image to scan with lookahead prioritization:
   * Prioritize panels within ~5-10 images ahead of the current reading / scroll position,
   * then scan remaining panels in the background.
   */
  private getNextImageToScan(): DiscoveredImage | undefined {
    // 1. Determine active reference index
    let refIndex = -1;
    if (this.activeImageId) {
      refIndex = this.images.findIndex(img => img.id === this.activeImageId);
    }

    // Fall back to image closest to viewport scroll center if user has scrolled down
    const scrollY = typeof window !== 'undefined' ? (window.scrollY || window.pageYOffset || 0) : 0;
    if (refIndex < 0 && typeof window !== 'undefined' && scrollY > 0 && this.images.length > 0) {
      const viewportMid = scrollY + (window.innerHeight / 2);
      let closestDist = Infinity;
      this.images.forEach((img, idx) => {
        if (!img.element.getBoundingClientRect) return;
        const rect = img.element.getBoundingClientRect();
        const top = rect.top + (window.scrollY || window.pageYOffset || 0);
        const dist = Math.abs(top - viewportMid);
        if (dist < closestDist) {
          closestDist = dist;
          refIndex = idx;
        }
      });
    }

    if (refIndex < 0) refIndex = 0;

    // Lookahead: check unscanned panels in window [refIndex, refIndex + 10]
    for (let i = Math.max(0, refIndex); i <= Math.min(this.images.length - 1, refIndex + 10); i++) {
      const candidate = this.images[i];
      if (!this.processedImageIds.has(candidate.id)) {
        return candidate;
      }
    }

    // Beyond lookahead window: scan forward
    for (let i = refIndex + 11; i < this.images.length; i++) {
      const candidate = this.images[i];
      if (!this.processedImageIds.has(candidate.id)) {
        return candidate;
      }
    }

    // Earlier panels in queue (if user scrolled ahead or jumped)
    return this.images.find(img => !this.processedImageIds.has(img.id));
  }

  private async processNextImage(): Promise<void> {
    if (this.isDestroyed) return;

    // Find next image based on reading position lookahead
    const nextImage = this.getNextImageToScan();

    if (!nextImage) {
      const chapterTotal = getTotalChapterPageCount();
      const hasUnmountedPages = chapterTotal > 0 && this.processedImageIds.size < chapterTotal;

      if (hasUnmountedPages) {
        // Virtual reader still has unmounted pages (e.g. comix.to)
        this.isProcessing = false;
        this.notifyProgress();
        this.onSegmentsCallback?.([], false);

        // Pre-trigger next virtual page loading
        this.triggerNextVirtualPage();
        return;
      }

      // Check if there was any trailing unpunctuated unit left over at end of chapter
      if (this.pendingCarryOverText) {
        const finalSegment: SpeechSegment = {
          id: `seg-final-${Date.now()}`,
          imageId: this.images[this.images.length - 1]?.id || 'final',
          text: this.pendingCarryOverText,
          spokenText: toSentenceCase(this.pendingCarryOverText),
        };
        this.pendingCarryOverText = '';
        this.onSegmentsCallback?.([finalSegment], true);
      } else {
        this.onSegmentsCallback?.([], true);
      }

      this.isProcessing = false;
      this.notifyProgress();
      return;
    }

    this.isProcessing = true;
    this.notifyProgress();

    try {
      const segments = await this.scanImage(nextImage);
      if (this.isDestroyed) return;

      this.processedImageIds.add(nextImage.id);

      const hasMoreInQueue = this.images.some(img => !this.processedImageIds.has(img.id));
      const chapterTotal = getTotalChapterPageCount();
      const hasMoreInChapter = chapterTotal > 0 && this.processedImageIds.size < chapterTotal;
      const isFinished = !hasMoreInQueue && !hasMoreInChapter;

      // Cross-panel sentence stitching:
      // If the last segment has no terminal punctuation and more panels remain, hold it
      if (!isFinished && segments.length > 0) {
        const lastSeg = segments[segments.length - 1];
        if (!hasTerminalPunctuation(lastSeg.text)) {
          this.pendingCarryOverText = lastSeg.text;
          segments.pop();
        }
      }

      this.onSegmentsCallback?.(segments, isFinished);
    } catch (err) {
      if (this.isDestroyed) return;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Queue] Failed scanning image ${nextImage.id}, continuing to next:`, errorMsg);
      this.processedImageIds.add(nextImage.id);
      this.onErrorCallback?.(`Skipped panel: ${errorMsg}`);
    }

    this.notifyProgress();

    // Concurrency = 1: sequentially proceed to next image
    setTimeout(() => {
      this.processNextImage();
    }, 10);
  }

  private triggerNextVirtualPage(): void {
    if (this.isDestroyed) return;
    try {
      const placeholders = Array.from(document.querySelectorAll<HTMLElement>(
        '.rpage-page, [data-page], .page-item, .chapter-page, .iv-image'
      ));

      // Find first placeholder without an <img> child
      const nextPlaceholder = placeholders.find(p => !p.querySelector('img'));
      if (nextPlaceholder) {
        const rect = nextPlaceholder.getBoundingClientRect();
        if (rect.top > window.innerHeight) {
          window.scrollBy({ top: 300, behavior: 'smooth' });
        }
        window.dispatchEvent(new Event('scroll'));
      }
    } catch {
      // ignore
    }

    // Schedule retry check after 800ms
    if (this.virtualCheckTimeout) clearTimeout(this.virtualCheckTimeout);
    this.virtualCheckTimeout = setTimeout(() => {
      if (!this.isProcessing && !this.isDestroyed) {
        this.processNextImage();
      }
    }, 800);
  }

  private async scanImage(image: DiscoveredImage): Promise<SpeechSegment[]> {
    let source: { imageUrl?: string; imageBase64?: string } = {};

    if (image.url && !image.url.startsWith('blob:') && !image.url.startsWith('data:')) {
      source = { imageUrl: image.url };
      // Attempt base64 fallback in case direct fetch has CORS restrictions
      const base64 = this.imageToBase64(image.element);
      if (base64) {
        source.imageBase64 = base64;
      }
    } else {
      const base64 = this.imageToBase64(image.element);
      if (base64) {
        source = { imageBase64: base64 };
      } else {
        throw new Error('Image is inaccessible (CORS or tainted canvas)');
      }
    }

    const response = await chrome.runtime.sendMessage({
      type: 'OCR_REQUEST',
      imageUrl: source.imageUrl ?? '',
      imageBase64: source.imageBase64,
      tileIndex: 0,
      tileTotal: 1,
      imageId: image.id,
      dialogueOnly: this.dialogueOnly,
    });

    if (!isValidMessage(response)) {
      throw new Error('Invalid response from OCR background service');
    }

    if (response.type === 'OCR_RESULT') {
      const result = response as OcrResultMessage;
      const carryOver = this.pendingCarryOverText;
      this.pendingCarryOverText = '';
      return segmentOcrResult(image.id, result.blocks, result.fullText, carryOver);
    } else if (response.type === 'OCR_ERROR') {
      const err = response as OcrErrorMessage;
      throw new Error(err.error || 'OCR recognition failed');
    }

    return [];
  }

  private imageToBase64(img: HTMLImageElement): string | null {
    try {
      if (typeof document === 'undefined') return null;
      // Skip in JSDOM test environment where canvas 2d context is unmocked
      if (typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom')) {
        return null;
      }
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 1200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }

  public destroy(): void {
    if (this.scheduleTimeout) {
      clearTimeout(this.scheduleTimeout);
      this.scheduleTimeout = null;
    }
    if (this.virtualCheckTimeout) {
      clearTimeout(this.virtualCheckTimeout);
      this.virtualCheckTimeout = null;
    }
    this.isDestroyed = true;
    this.isProcessing = false;
    this.images = [];
    this.processedImageIds.clear();
    this.activeImageId = null;
    this.pendingCarryOverText = '';
    this.onSegmentsCallback = null;
    this.onProgressCallback = null;
    this.onErrorCallback = null;
  }
}
