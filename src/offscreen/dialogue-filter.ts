/**
 * Dialogue vs Scene Text Local Image Filter.
 * Evaluates whether an OCR text block's background on the preprocessed image
 * corresponds to genuine speech bubbles / caption boxes (flat near-white or flat near-black)
 * versus scene text (colored building signs, posters, background gradients, outdoor artwork).
 */

export interface PixelData {
  data: Uint8ClampedArray | Uint8Array | number[];
  width: number;
  height: number;
}

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface DialogueFilterOptions {
  minConfidence?: number;
  requireFlatBackground?: boolean;
}

/**
 * Determine if a canvas or pixel buffer region around a bounding box
 * has the characteristic flat neutral background of a dialogue bubble or caption box.
 */
export function isDialogueBackground(
  source: PixelData | { getImageData(sx: number, sy: number, sw: number, sh: number): { data: Uint8ClampedArray | Uint8Array | number[]; width: number; height: number } },
  bbox: BoundingBox,
  canvasWidth?: number,
  canvasHeight?: number
): boolean {
  // Check for minimal dimensions
  const boxWidth = bbox.x1 - bbox.x0;
  const boxHeight = bbox.y1 - bbox.y0;
  if (boxWidth < 8 || boxHeight < 8) {
    return false;
  }

  // Determine width and height
  let fullWidth = canvasWidth || 0;
  let fullHeight = canvasHeight || 0;

  if ('width' in source && 'height' in source) {
    fullWidth = fullWidth || source.width;
    fullHeight = fullHeight || source.height;
  }

  if (fullWidth <= 0 || fullHeight <= 0) {
    // If not supplied, infer from bbox
    fullWidth = Math.max(fullWidth, bbox.x1 + 20);
    fullHeight = Math.max(fullHeight, bbox.y1 + 20);
  }

  // Expand bounding box by margin to sample the surrounding bubble interior
  const marginX = Math.max(6, Math.round(boxWidth * 0.12));
  const marginY = Math.max(6, Math.round(boxHeight * 0.15));

  const sx0 = Math.max(0, Math.floor(bbox.x0 - marginX));
  const sy0 = Math.max(0, Math.floor(bbox.y0 - marginY));
  const sx1 = Math.min(fullWidth, Math.ceil(bbox.x1 + marginX));
  const sy1 = Math.min(fullHeight, Math.ceil(bbox.y1 + marginY));

  const sampleWidth = sx1 - sx0;
  const sampleHeight = sy1 - sy0;

  if (sampleWidth <= 0 || sampleHeight <= 0) {
    return false;
  }

  let pixelBuffer: Uint8ClampedArray | Uint8Array | number[];
  let bufferStride = sampleWidth;
  let isLocalPatch = false;

  if ('getImageData' in source) {
    const imgData = source.getImageData(sx0, sy0, sampleWidth, sampleHeight);
    pixelBuffer = imgData.data;
    bufferStride = imgData.width;
    isLocalPatch = true;
  } else {
    pixelBuffer = source.data;
    bufferStride = source.width;
    isLocalPatch = false;
  }

  let lightCount = 0;
  let darkCount = 0;
  let perimeterLightCount = 0;
  let perimeterDarkCount = 0;
  let perimeterTotal = 0;
  let totalPixels = 0;

  let lightLumSum = 0;
  let lightLumSqSum = 0;
  let darkLumSum = 0;
  let darkLumSqSum = 0;

  const borderWidth = Math.min(3, Math.floor(Math.min(sampleWidth, sampleHeight) / 3));

  for (let localY = 0; localY < sampleHeight; localY++) {
    const globalY = sy0 + localY;
    const isPerimeterY = localY < borderWidth || localY >= sampleHeight - borderWidth;

    for (let localX = 0; localX < sampleWidth; localX++) {
      const globalX = sx0 + localX;
      const isPerimeter = isPerimeterY || localX < borderWidth || localX >= sampleWidth - borderWidth;

      let idx = 0;
      if (isLocalPatch) {
        idx = (localY * bufferStride + localX) * 4;
      } else {
        idx = (globalY * bufferStride + globalX) * 4;
      }

      if (idx + 3 >= pixelBuffer.length) continue;

      const r = pixelBuffer[idx];
      const g = pixelBuffer[idx + 1];
      const b = pixelBuffer[idx + 2];
      const a = pixelBuffer[idx + 3];

      // Skip fully transparent pixels
      if (a < 64) continue;

      totalPixels++;
      if (isPerimeter) perimeterTotal++;

      // Luminance (standard Rec. 601)
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // Saturation / chromatic spread (max - min)
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const spread = maxC - minC;

      // Light neutral background (white/off-white speech bubbles)
      if (lum >= 190 && spread <= 40) {
        lightCount++;
        lightLumSum += lum;
        lightLumSqSum += lum * lum;
        if (isPerimeter) perimeterLightCount++;
      }
      // Dark neutral background (black/dark-gray caption & monologue boxes)
      else if (lum <= 60 && spread <= 40) {
        darkCount++;
        darkLumSum += lum;
        darkLumSqSum += lum * lum;
        if (isPerimeter) perimeterDarkCount++;
      }
    }
  }

  if (totalPixels < 16) return false;

  const lightRatio = lightCount / totalPixels;
  const darkRatio = darkCount / totalPixels;
  const perimLightRatio = perimeterTotal > 0 ? perimeterLightCount / perimeterTotal : 0;
  const perimDarkRatio = perimeterTotal > 0 ? perimeterDarkCount / perimeterTotal : 0;

  // Check light bubble candidate
  const isCandidateLight = lightRatio >= 0.45 || (lightRatio >= 0.35 && perimLightRatio >= 0.55);
  // Check dark box candidate
  const isCandidateDark = darkRatio >= 0.45 || (darkRatio >= 0.35 && perimDarkRatio >= 0.55);

  if (!isCandidateLight && !isCandidateDark) {
    // Neither light nor dark neutral background: likely a colored sign, gradient, or scene drawing
    return false;
  }

  // Check flatness (low standard deviation among candidate background pixels)
  if (isCandidateLight && lightCount > 0) {
    const mean = lightLumSum / lightCount;
    const variance = (lightLumSqSum / lightCount) - (mean * mean);
    const stdDev = Math.sqrt(Math.max(0, variance));
    if (stdDev > 28) {
      return false; // Background luminance varies too much (e.g. noisy gradient or drawing)
    }
    return true;
  }

  if (isCandidateDark && darkCount > 0) {
    const mean = darkLumSum / darkCount;
    const variance = (darkLumSqSum / darkCount) - (mean * mean);
    const stdDev = Math.sqrt(Math.max(0, variance));
    if (stdDev > 28) {
      return false;
    }
    return true;
  }

  return false;
}
