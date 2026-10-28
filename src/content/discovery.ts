/**
 * Image discovery — finds eligible comic images on the page.
 * Distinguishes true comic panels from ad banners, recommendation posters, and navbars.
 * Handles virtualized & lazy-loaded webtoons (comix.to, Asura, Webtoons, MangaDex),
 * attaches load listeners for in-flight images, and observes placeholder containers
 * to trigger loading of upcoming panels.
 */
import { MIN_IMAGE_WIDTH, MIN_IMAGE_HEIGHT } from '../shared/constants';

export interface DiscoveredImage {
  element: HTMLImageElement;
  id: string;
  url: string;
  naturalWidth: number;
  naturalHeight: number;
}

const discoveredMap = new Map<string, DiscoveredImage>();
let nextId = 0;

export function generateImageId(img: HTMLImageElement): string {
  if (img.dataset.mvId) {
    return img.dataset.mvId;
  }
  const id = `mv-img-${nextId++}`;
  img.dataset.mvId = id;
  return id;
}

export function resolveImageUrl(img: HTMLImageElement): string {
  return (
    img.currentSrc ||
    img.src ||
    img.dataset.src ||
    img.dataset.lazySrc ||
    img.dataset.original ||
    img.dataset.url ||
    img.getAttribute('data-src') ||
    img.getAttribute('data-lazy-src') ||
    img.getAttribute('data-original') ||
    img.getAttribute('data-url') ||
    ''
  );
}

/** Non-comic UI containers to strictly exclude */
const EXCLUDED_SELECTORS = [
  'header',
  'nav',
  'aside',
  'footer',
  '.header',
  '.navbar',
  '.sidebar',
  '.footer',
  '.recommend',
  '.recommended',
  '.poster',
  '.poster--xs',
  '.poster--sm',
  '.poster--md',
  '.card__poster-wrap',
  '.hitem',
  '.crow',
  '.frow',
  '.grow',
  '.nrow',
  '.ulrow',
  '.ucoll',
  '.fdrop',
  '.modal',
  '.dropdown',
  '#comments',
  '.comments',
  '[class*="comment"]',
  '[class*="banner"]',
  '[class*="ad-"]',
  '[class*="ad_"]',
  '[id*="ad-"]',
  '[id*="ad_"]',
].join(', ');

/** Standard comic reader container selectors */
const READER_SELECTORS = [
  '.rpage-main__inner',
  '.rpage-swiper',
  '.swiper-wrapper',
  '#readerarea',
  '.reading-content',
  '.reader-container',
  '.chapter-content',
  '.entry-content',
  '#chapter-view',
  '.webtoon-view',
  '.manga-reader',
  '.comic-viewer',
  '#viewer',
  '#reader',
].join(', ');

export function isExcludedNonComicElement(el: Element): boolean {
  try {
    if (el.closest(EXCLUDED_SELECTORS)) {
      return true;
    }
  } catch {
    // fallback
  }
  return false;
}

export function getReaderContainer(): HTMLElement | null {
  try {
    return document.querySelector<HTMLElement>(READER_SELECTORS);
  } catch {
    return null;
  }
}

export function getTotalChapterPageCount(): number {
  try {
    const pagePlaceholders = document.querySelectorAll(
      '.rpage-page, [data-page], .page-item, .chapter-page, .iv-image, .reading-content > div'
    );
    if (pagePlaceholders.length > 0) {
      return pagePlaceholders.length;
    }
  } catch {
    // ignore
  }
  return 0;
}

export function isEligible(img: HTMLImageElement): boolean {
  // 1. Never accept images inside headers, navbars, sidebars, recommendation posters or ads
  if (isExcludedNonComicElement(img)) {
    return false;
  }

  // 2. If a recognized reader container exists on the page, the image must be inside it or a page container
  const readerContainer = getReaderContainer();
  const isInsidePageContainer = !!img.closest('.rpage-page, [data-page], .page-item, .chapter-page, .iv-image');

  if (readerContainer && !readerContainer.contains(img) && !isInsidePageContainer) {
    return false;
  }

  // 3. If complete, check dimensions
  if (img.complete && img.naturalWidth > 0) {
    const rect = img.getBoundingClientRect();
    if (rect.width < MIN_IMAGE_WIDTH && img.naturalWidth < MIN_IMAGE_WIDTH) return false;
    if (rect.height < MIN_IMAGE_HEIGHT && img.naturalHeight < MIN_IMAGE_HEIGHT) return false;
  } else {
    // If not completed loading yet, check declared width/height attributes or CSS rect
    const rect = img.getBoundingClientRect();
    const attrW = parseInt(img.getAttribute('width') || '0', 10);
    const attrH = parseInt(img.getAttribute('height') || '0', 10);

    const hasComicDimensions =
      (rect.width >= MIN_IMAGE_WIDTH || attrW >= MIN_IMAGE_WIDTH) &&
      (rect.height >= MIN_IMAGE_HEIGHT || attrH >= MIN_IMAGE_HEIGHT || rect.height === 0);

    if (!hasComicDimensions && !resolveImageUrl(img) && !isInsidePageContainer) {
      return false;
    }
  }

  // Must not be explicitly hidden
  const style = getComputedStyle(img);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;

  const url = resolveImageUrl(img).toLowerCase();
  const alt = (img.alt || '').toLowerCase();
  const classList = Array.from(img.classList).join(' ').toLowerCase();

  // Skip tracking pixels, spacers
  if (img.naturalWidth > 0 && (img.naturalWidth <= 2 || img.naturalHeight <= 2)) return false;

  // Skip logos/avatars by common patterns
  const skipPatterns = ['logo', 'avatar', 'icon', 'favicon', 'badge', 'emoji', 'sticker', 'ad-', 'banner-ad'];
  if (skipPatterns.some(p => classList.includes(p) || alt.includes(p) || url.includes(p))) return false;

  return true;
}

export function getDiscoveredImage(element: HTMLImageElement): DiscoveredImage | null {
  if (!isEligible(element)) return null;

  const url = resolveImageUrl(element);
  if (!url) return null;

  const id = generateImageId(element);
  const existing = discoveredMap.get(id);
  if (existing) {
    // Update URL or dimensions if they arrived late
    if (!existing.url && url) existing.url = url;
    if (element.naturalWidth > 0) {
      existing.naturalWidth = element.naturalWidth;
      existing.naturalHeight = element.naturalHeight;
    }
    return existing;
  }

  const discovered: DiscoveredImage = {
    element,
    id,
    url,
    naturalWidth: element.naturalWidth || 800,
    naturalHeight: element.naturalHeight || 1200,
  };

  discoveredMap.set(id, discovered);
  return discovered;
}

/**
 * Discover all eligible images currently on the page, sorted by vertical document position.
 */
export function discoverImages(): DiscoveredImage[] {
  const images = Array.from(document.querySelectorAll<HTMLImageElement>('img'));

  for (const img of images) {
    getDiscoveredImage(img);
  }

  return Array.from(discoveredMap.values()).sort((a, b) => {
    const aTop = a.element.getBoundingClientRect().top + (window.scrollY || 0);
    const bTop = b.element.getBoundingClientRect().top + (window.scrollY || 0);
    return aTop - bTop;
  });
}

/**
 * Watch for new images dynamically added or lazy-loaded via MutationObserver and IntersectionObserver.
 * Pre-triggers lazy loaders up to 2000px ahead of current scroll.
 */
export function watchImages(onNewImage: (img: DiscoveredImage) => void): () => void {
  const handleCandidate = (img: HTMLImageElement) => {
    if (!isEligible(img)) return;

    if (img.complete && img.naturalWidth > 0) {
      const discovered = getDiscoveredImage(img);
      if (discovered) onNewImage(discovered);
    } else {
      // Attach one-time load event listener for in-flight lazy images
      img.addEventListener(
        'load',
        () => {
          if (isEligible(img)) {
            const discovered = getDiscoveredImage(img);
            if (discovered) onNewImage(discovered);
          }
        },
        { once: true }
      );

      // Register candidate so it is queued in reading order
      const discovered = getDiscoveredImage(img);
      if (discovered) onNewImage(discovered);
    }
  };

  // 1. Initial scan
  const allImgs = document.querySelectorAll<HTMLImageElement>('img');
  allImgs.forEach(handleCandidate);

  // 2. IntersectionObserver with 2000px margin to trigger native browser lazy-loading ahead of narration
  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.target instanceof HTMLImageElement) {
          handleCandidate(entry.target);
        }
      }
    },
    { rootMargin: '2000px' }
  );

  allImgs.forEach(img => intersectionObserver.observe(img));

  // 3. Observe placeholder page containers for virtual readers (e.g. comix.to, webtoons)
  const placeholderObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.target instanceof HTMLElement) {
          const img = entry.target.querySelector<HTMLImageElement>('img');
          if (img) {
            handleCandidate(img);
          } else {
            // Nudge scroll listener so virtual reader renders the image element
            window.dispatchEvent(new Event('scroll'));
          }
        }
      }
    },
    { rootMargin: '2000px' }
  );

  const initialPlaceholders = document.querySelectorAll<HTMLElement>(
    '.rpage-page, [data-page], .page-item, .chapter-page, .iv-image'
  );
  initialPlaceholders.forEach(el => placeholderObserver.observe(el));

  // 4. MutationObserver for dynamically inserted DOM nodes or lazy attribute mutations
  const mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLImageElement) {
            intersectionObserver.observe(node);
            handleCandidate(node);
          } else if (node instanceof HTMLElement) {
            if (node.matches && node.matches('.rpage-page, [data-page], .page-item, .chapter-page, .iv-image')) {
              placeholderObserver.observe(node);
            }
            const childPlaceholders = node.querySelectorAll<HTMLElement>('.rpage-page, [data-page], .page-item, .chapter-page, .iv-image');
            childPlaceholders.forEach(el => placeholderObserver.observe(el));

            const childImgs = node.querySelectorAll<HTMLImageElement>('img');
            childImgs.forEach(img => {
              intersectionObserver.observe(img);
              handleCandidate(img);
            });
          }
        });
      } else if (mutation.type === 'attributes' && mutation.target instanceof HTMLImageElement) {
        handleCandidate(mutation.target);
      }
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'srcset', 'data-src', 'data-lazy-src', 'data-original', 'data-url'],
  });

  return () => {
    mutationObserver.disconnect();
    intersectionObserver.disconnect();
    placeholderObserver.disconnect();
  };
}

export function getImageElement(id: string): HTMLImageElement | undefined {
  return discoveredMap.get(id)?.element;
}

export function clearDiscovery(): void {
  discoveredMap.clear();
  nextId = 0;
}
