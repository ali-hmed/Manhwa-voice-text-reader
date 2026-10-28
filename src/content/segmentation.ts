/**
 * Segmentation & Reading Order Module.
 * Normalizes OCR text, filters out noise/artifacts/watermarks,
 * sorts speech bubbles into comic reading order, joins multi-line bubble text,
 * repairs hyphenated breaks, and merges unpunctuated units into natural sentence utterances.
 */
import type { OcrBlock } from '../types/messages';

export interface SpeechSegment {
  id: string;
  imageId: string;
  text: string;           // Original lettering casing (for transcript display)
  spokenText?: string;    // Sentence-cased text (for Web Speech API)
  bbox?: { x0: number; y0: number; x1: number; y1: number };
  confidence?: number;
}

/** Recognized short dialogue interjections (case-insensitive) */
const COMMON_SHORT_DIALOGUE = new Set([
  'no', 'yes', 'oh', 'ah', 'ok', 'hi', 'hey', 'why', 'who', 'how', 'now',
  'run', 'die', 'win', 'man', 'boy', 'sir', 'mom', 'dad', 'son', 'she',
  'her', 'him', 'his', 'you', 'the', 'and', 'but', 'not', 'what', 'wait',
  'stop', 'help', 'look', 'listen', 'here', 'there', 'come', 'go', 'please'
]);

/** Scanlator promo / credits patterns to omit from narration */
const PROMO_PATTERNS = [
  /read at\s+\S+\.(?:com|net|org|gg|to)/i,
  /faster updates/i,
  /join our discord/i,
  /scanlat(?:ed|ion|or)/i,
  /\bdiscord\.gg\b/i,
  /\bwww\.\S+\.(?:com|net|org)/i,
  /\b(?:hivetoon|asuracomics?|reaperscans?|flamescans?|voidscans?)\.(?:com|net|org|to|io)\b/i,
  /for faster updates/i,
];

const TERMINAL_PUNCTUATION_REGEX = /[.!?…]+["'”’)]*\s*$/;

/**
 * Check if a text unit ends with sentence-terminating punctuation (. ! ? …).
 */
export function hasTerminalPunctuation(text: string): boolean {
  if (!text) return false;
  return TERMINAL_PUNCTUATION_REGEX.test(text.trim());
}

/**
 * Merge two speech units cleanly, repairing hyphenated breaks if the first ends with a hyphen.
 */
export function mergeSpeechUnits(first: string, second: string): string {
  const f = first.trim();
  const s = second.trim();
  if (!f) return s;
  if (!s) return f;

  // Repair hyphenated word: e.g. "responsi-" + "bility" -> "responsibility"
  if (/[a-zA-Z]-$/.test(f)) {
    return f.slice(0, -1) + s;
  }
  return `${f} ${s}`;
}

/**
 * Convert ALL-CAPS comic lettering to sentence case for natural Web Speech API pronunciation,
 * while preserving capital "I", contractions ("I'm", "I'll"), and original text for the transcript.
 */
export function toSentenceCase(text: string): string {
  if (!text) return '';

  const lettersOnly = text.replace(/[^a-zA-Z]/g, '');
  if (!lettersOnly) return text;

  // Check if text is predominantly uppercase
  const upperCount = (text.match(/[A-Z]/g) || []).length;
  const lowerCount = (text.match(/[a-z]/g) || []).length;
  const isAllCaps = upperCount > 1 && (lowerCount === 0 || (upperCount / (upperCount + lowerCount)) >= 0.8);

  let formatted = isAllCaps ? text.toLowerCase() : text;

  // Capitalize start of string and start of each sentence (. ! ? …)
  formatted = formatted.replace(/(^\s*|[.!?…]\s+["'”’)]?\s*)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());

  // Capitalize after opening quotation marks at start
  formatted = formatted.replace(/^(\s*["'“‘])([a-z])/, (_, p1, p2) => p1 + p2.toUpperCase());

  // Capitalize standalone pronoun "I" and contractions
  formatted = formatted.replace(/\b(i)('m|'ll|'d|'ve)?\b/g, (_, _p1, p2) => 'I' + (p2 || ''));

  return formatted;
}

/**
 * Determine whether an OCR line/phrase represents genuine dialogue
 * versus background screen-tone noise, SFX scrapes, or promo ads.
 */
export function isMeaningfulDialogue(text: string, confidence?: number): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;

  // 1. Drop low-confidence OCR blocks (< 45%)
  if (typeof confidence === 'number' && confidence > 0 && confidence < 45) {
    return false;
  }

  // 2. Drop scanlator promotional credits
  if (PROMO_PATTERNS.some(p => p.test(trimmed))) {
    return false;
  }

  // 3. Drop sound effects with repeated letters (e.g. "eee", "oooo", "coooor", "dooooo")
  if (/(.)\1{2,}/i.test(trimmed)) {
    return false;
  }

  // 4. Require minimum letter ratio (at least 60% alphabet characters to drop lines like "(m(m]\V|", "p<", "\ A")
  const letters = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (letters / trimmed.length < 0.6) {
    return false;
  }

  // 5. Extract words
  const words = trimmed.split(/\s+/).map(w => w.replace(/[^a-zA-Z0-9']/g, '')).filter(Boolean);
  if (words.length === 0) return false;

  // 6. Filter single-word lines
  if (words.length === 1) {
    const w = words[0].toLowerCase();
    if (!COMMON_SHORT_DIALOGUE.has(w)) {
      // Must be at least 4 letters, have a vowel, and not be pure all-caps noise (e.g. "PAZNRION", "RAAT", "SOOGH")
      if (w.length < 4) return false;
      if (!/[aeiouy]/.test(w)) return false;
      if (/^[A-Z]{3,}$/.test(words[0])) return false;
    }
  }

  // 7. Check that strings of 3+ letters have at least one vowel
  const vowels = (trimmed.match(/[aeiouyAEIOUY]/g) || []).length;
  if (letters >= 3 && vowels === 0) {
    return false;
  }

  return true;
}

/**
 * Clean up OCR artifacts, normalize punctuation, quotes, and whitespace.
 * Preserves sentence continuity across line-wraps inside a speech bubble.
 */
export function normalizeOcrText(raw: string): string {
  if (!raw) return '';

  let text = raw
    // Normalize fancy quotes and apostrophes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Remove broken line hyphens (e.g., "responsi- \nbility" -> "responsibility")
    .replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2')
    // Join wrapped lines inside a speech bubble if not punctuated with sentence terminators
    .replace(/([^\n.!?…])\n+([^\n])/g, '$1 $2')
    // Normalize newlines and tabs
    .replace(/[\r\t]+/g, ' ')
    // Replace multiple spaces with a single space
    .replace(/[ ]{2,}/g, ' ')
    .trim();

  // Strip obvious noise lines
  const lines = text.split('\n').map(l => l.trim()).filter(l => isMeaningfulDialogue(l));

  return lines.join('\n');
}

/**
 * Sort OCR blocks into comic reading order:
 * Primary: vertical document position (top-to-bottom)
 * Secondary: left-to-right for blocks at similar heights (within vertical tolerance)
 */
export function sortBlocksReadingOrder(blocks: OcrBlock[], verticalTolerance = 40): OcrBlock[] {
  return [...blocks].sort((a, b) => {
    const yDiff = a.bbox.y0 - b.bbox.y0;
    if (Math.abs(yDiff) <= verticalTolerance) {
      // Similar height: left-to-right
      return a.bbox.x0 - b.bbox.x0;
    }
    return yDiff;
  });
}

/**
 * Split text into natural sentence-level utterances at sentence-ending punctuation (. ! ? …).
 * Never splits on plain line breaks or commas.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text) return [];

  // Split only at sentence terminators (. ! ? …) followed by whitespace, quote, or newline
  const rawParts = text.split(/(?<=[.!?…]["'”’)]?)\s+|\n+/);

  const sentences: string[] = [];
  for (const part of rawParts) {
    const trimmed = part.trim();
    if (trimmed.length > 0 && isMeaningfulDialogue(trimmed)) {
      sentences.push(trimmed);
    }
  }

  return sentences;
}

/**
 * Full segmentation pipeline for an image's OCR result:
 * 1. Filter out low-quality/noise/SFX blocks
 * 2. Sort into comic reading order (top-to-bottom, left-to-right)
 * 3. Group multi-line bubble pieces: join lines with spaces, repair hyphenated breaks
 * 4. Merge unpunctuated units with next unit in reading order
 * 5. Split only at sentence-ending punctuation (. ! ? …)
 * 6. Attach sentence-cased spokenText for natural speech synthesis
 */
export function segmentOcrResult(
  imageId: string,
  blocks: OcrBlock[],
  fallbackText?: string,
  carryOverText?: string
): SpeechSegment[] {
  const segments: SpeechSegment[] = [];
  let segIndex = 0;

  // Collect text units in reading order
  const rawUnits: { text: string; bbox?: { x0: number; y0: number; x1: number; y1: number }; confidence?: number }[] = [];

  if (carryOverText && carryOverText.trim()) {
    rawUnits.push({ text: carryOverText.trim() });
  }

  if (blocks && blocks.length > 0) {
    const validBlocks = blocks.filter(b => b.text && isMeaningfulDialogue(b.text, b.confidence));
    const sorted = sortBlocksReadingOrder(validBlocks);

    for (const b of sorted) {
      const normalized = normalizeOcrText(b.text);
      if (normalized) {
        rawUnits.push({
          text: normalized,
          bbox: b.bbox,
          confidence: b.confidence,
        });
      }
    }
  } else if (fallbackText) {
    const normalized = normalizeOcrText(fallbackText);
    if (normalized) {
      rawUnits.push({ text: normalized });
    }
  }

  if (rawUnits.length === 0) {
    return [];
  }

  // Group units in reading order: if a unit ends without terminal punctuation, merge with next unit
  const groupedPhrases: { text: string; bbox?: { x0: number; y0: number; x1: number; y1: number }; confidence?: number }[] = [];
  let currentAccumulator = '';
  let currentBbox: { x0: number; y0: number; x1: number; y1: number } | undefined;
  let currentConfidence: number | undefined;

  for (const unit of rawUnits) {
    if (!currentAccumulator) {
      currentAccumulator = unit.text;
      currentBbox = unit.bbox;
      currentConfidence = unit.confidence;
    } else {
      currentAccumulator = mergeSpeechUnits(currentAccumulator, unit.text);
      if (unit.bbox && currentBbox) {
        currentBbox = {
          x0: Math.min(currentBbox.x0, unit.bbox.x0),
          y0: Math.min(currentBbox.y0, unit.bbox.y0),
          x1: Math.max(currentBbox.x1, unit.bbox.x1),
          y1: Math.max(currentBbox.y1, unit.bbox.y1),
        };
      }
    }

    if (hasTerminalPunctuation(currentAccumulator)) {
      groupedPhrases.push({
        text: currentAccumulator,
        bbox: currentBbox,
        confidence: currentConfidence,
      });
      currentAccumulator = '';
      currentBbox = undefined;
      currentConfidence = undefined;
    }
  }

  // Include any trailing unit
  if (currentAccumulator) {
    groupedPhrases.push({
      text: currentAccumulator,
      bbox: currentBbox,
      confidence: currentConfidence,
    });
  }

  // Now split grouped phrases at sentence-ending punctuation (. ! ? …)
  for (const phrase of groupedPhrases) {
    const sentenceList = splitIntoSentences(phrase.text);
    for (const sentence of sentenceList) {
      // Avoid duplicate consecutive sentences
      const last = segments[segments.length - 1];
      if (last && last.text.toLowerCase() === sentence.toLowerCase()) {
        continue;
      }

      segments.push({
        id: `${imageId}-seg-${segIndex++}`,
        imageId,
        text: sentence,
        spokenText: toSentenceCase(sentence),
        bbox: phrase.bbox,
        confidence: phrase.confidence,
      });
    }
  }

  return segments;
}
