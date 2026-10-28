/**
 * Auto-scroll module — smoothly scrolls the viewport to follow narration.
 * Driven strictly by segment transitions (no independent polling/timers).
 * Handles manual user scroll override with predictable resumption.
 */
import type { SpeechSegment } from './segmentation';
import { CONTROLLER_HOST_ID } from '../shared/constants';

export class Scroller {
  private enabled: boolean;
  private userInteracting = false;
  private interactionTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastScrolledSegmentId: string | null = null;
  private removeInteractionListeners: (() => void) | null = null;

  constructor(enabled = true) {
    this.enabled = enabled;
    this.setupInteractionListeners();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Scroll viewport or scroll container to match the active segment.
   * Uses native scrollIntoView so it works on both window and custom scroll containers (e.g. comix.to).
   * Only scrolls once per unique segment ID.
   */
  public scrollToSegment(segment: SpeechSegment, imgElement?: HTMLImageElement | null): void {
    if (!this.enabled || this.userInteracting) return;
    if (segment.id === this.lastScrolledSegmentId) return;

    this.lastScrolledSegmentId = segment.id;

    if (!imgElement) return;

    // 1. Primary: native scrollIntoView works seamlessly on ANY scroll container
    // (window, body, .rpage-main--long-strip, #readerarea, etc.)
    try {
      imgElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    } catch {
      // 2. Fallback: window.scrollTo
      const imgRect = imgElement.getBoundingClientRect();
      const currentScrollY = window.scrollY || window.pageYOffset;
      const targetY = currentScrollY + imgRect.top - window.innerHeight * 0.25;
      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: 'smooth',
      });
    }

    // Dispatch scroll event so site lazy loaders and virtual lists recognize the new position
    window.dispatchEvent(new Event('scroll'));
  }

  public stop(): void {
    this.lastScrolledSegmentId = null;
    this.clearInteractionTimeout();
  }

  private setupInteractionListeners(): void {
    const handleUserInteraction = (e?: Event) => {
      // Ignore user interaction inside the floating controller Shadow DOM or transcript
      if (e) {
        const path = (e as unknown as { composedPath?: () => EventTarget[] }).composedPath?.() || [];
        const isInsideController = path.some(
          el => el instanceof HTMLElement && (el.id === CONTROLLER_HOST_ID || el.closest?.(`#${CONTROLLER_HOST_ID}`))
        );
        if (isInsideController) return;
      }

      this.userInteracting = true;
      this.clearInteractionTimeout();

      // Resume auto-following after 3 seconds of inactivity
      this.interactionTimeout = setTimeout(() => {
        this.userInteracting = false;
      }, 3000);
    };

    window.addEventListener('wheel', handleUserInteraction, { passive: true });
    window.addEventListener('touchmove', handleUserInteraction, { passive: true });

    const keyListener = (e: KeyboardEvent) => {
      const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Space', 'Home', 'End'];
      if (scrollKeys.includes(e.code) || scrollKeys.includes(e.key)) {
        handleUserInteraction();
      }
    };
    window.addEventListener('keydown', keyListener, { passive: true });

    this.removeInteractionListeners = () => {
      window.removeEventListener('wheel', handleUserInteraction);
      window.removeEventListener('touchmove', handleUserInteraction);
      window.removeEventListener('keydown', keyListener);
    };
  }

  private clearInteractionTimeout(): void {
    if (this.interactionTimeout) {
      clearTimeout(this.interactionTimeout);
      this.interactionTimeout = null;
    }
  }

  public destroy(): void {
    this.clearInteractionTimeout();
    this.removeInteractionListeners?.();
    this.lastScrolledSegmentId = null;
  }
}
