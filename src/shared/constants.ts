/** Minimum rendered width (CSS px) for an image to be considered a comic panel. */
export const MIN_IMAGE_WIDTH = 300;

/** Minimum rendered height (CSS px) for an image to be considered a comic panel. */
export const MIN_IMAGE_HEIGHT = 200;

/** Maximum tile height for tall-image slicing (px). */
export const TILE_HEIGHT = 1800;

/** Overlap between tiles (px). */
export const TILE_OVERLAP = 100;

/** Maximum width to downscale to before OCR (px). */
export const MAX_OCR_WIDTH = 2000;

/** Session-scoped injection guard key. */
export const INJECTION_ATTR = 'data-manhwa-voice-active';

/** Shadow DOM host element ID. */
export const CONTROLLER_HOST_ID = 'manhwa-voice-controller';

/** Namespace prefix for CSS classes. */
export const CSS_PREFIX = 'mv-';
