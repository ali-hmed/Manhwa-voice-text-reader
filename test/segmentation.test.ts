import { describe, it, expect } from 'vitest';
import {
  normalizeOcrText,
  sortBlocksReadingOrder,
  splitIntoSentences,
  segmentOcrResult,
} from '../src/content/segmentation';
import type { OcrBlock } from '../src/types/messages';

describe('Segmentation & Normalization', () => {
  it('normalizes curly quotes, apostrophes, and broken hyphenation', () => {
    const raw = '“Hello World!” It’s a great respon- \nsibility.';
    const normalized = normalizeOcrText(raw);
    expect(normalized).toBe('"Hello World!" It\'s a great responsibility.');
  });

  it('filters out non-alphanumeric noise lines', () => {
    const raw = 'Valid dialogue.\n---\n...\nAnother line!';
    const normalized = normalizeOcrText(raw);
    expect(normalized).toBe('Valid dialogue.\nAnother line!');
  });

  it('sorts blocks top-to-bottom and left-to-right at similar heights', () => {
    const blocks: OcrBlock[] = [
      { text: 'Bottom', confidence: 90, bbox: { x0: 200, y0: 800, x1: 500, y1: 850 } },
      { text: 'Top Right', confidence: 90, bbox: { x0: 450, y0: 105, x1: 700, y1: 150 } },
      { text: 'Top Left', confidence: 90, bbox: { x0: 100, y0: 100, x1: 350, y1: 150 } },
    ];

    const sorted = sortBlocksReadingOrder(blocks, 40);
    expect(sorted.map(b => b.text)).toEqual(['Top Left', 'Top Right', 'Bottom']);
  });

  it('splits multiline text into sentence utterances', () => {
    const text = 'Hello world! How are you doing today? I am fine.\nThis is on a new line.';
    const sentences = splitIntoSentences(text);
    expect(sentences).toEqual([
      'Hello world!',
      'How are you doing today?',
      'I am fine.',
      'This is on a new line.',
    ]);
  });

  it('deduplicates consecutive identical segments in segmentOcrResult', () => {
    const blocks: OcrBlock[] = [
      { text: 'Wait!', confidence: 90, bbox: { x0: 100, y0: 100, x1: 200, y1: 150 } },
      { text: 'Wait!', confidence: 90, bbox: { x0: 100, y0: 105, x1: 200, y1: 155 } },
      { text: 'Look over there.', confidence: 90, bbox: { x0: 100, y0: 300, x1: 300, y1: 350 } },
    ];

    const segments = segmentOcrResult('img-1', blocks);
    expect(segments.length).toBe(2);
    expect(segments[0].text).toBe('Wait!');
    expect(segments[1].text).toBe('Look over there.');
  });

  it('filters out promo watermarks, repeated SFX, and isolated 1-2 char noise', () => {
    const blocks: OcrBlock[] = [
      { text: 'READ AT HIVETOON.COM FOR FASTER UPDATES!', confidence: 95, bbox: { x0: 0, y0: 10, x1: 500, y1: 50 } },
      { text: 'FR', confidence: 50, bbox: { x0: 10, y0: 80, x1: 30, y1: 100 } },
      { text: 'p<', confidence: 30, bbox: { x0: 40, y0: 90, x1: 50, y1: 110 } },
      { text: 'eee ooo', confidence: 60, bbox: { x0: 100, y0: 120, x1: 300, y1: 150 } },
      { text: 'HE PROBABLY\nSTARTED THIS WAY.', confidence: 92, bbox: { x0: 150, y0: 300, x1: 450, y1: 400 } },
      { text: '\\ A', confidence: 20, bbox: { x0: 10, y0: 450, x1: 30, y1: 470 } },
      { text: 'HE GOT AWAY WITH IT, HE GOT BOLDER.', confidence: 90, bbox: { x0: 150, y0: 500, x1: 600, y1: 600 } },
    ];

    const segments = segmentOcrResult('img-manhwa', blocks);
    expect(segments.length).toBe(2);
    expect(segments[0].text).toBe('HE PROBABLY STARTED THIS WAY.');
    expect(segments[0].spokenText).toBe('He probably started this way.');
    expect(segments[1].text).toBe('HE GOT AWAY WITH IT, HE GOT BOLDER.');
    expect(segments[1].spokenText).toBe('He got away with it, he got bolder.');
  });

  it('merges multi-line bubble and unpunctuated units into one speech unit with sentence casing', () => {
    const blocks: OcrBlock[] = [
      { text: 'HE GOT AWAY WITH IT,', confidence: 90, bbox: { x0: 100, y0: 100, x1: 400, y1: 140 } },
      { text: 'HE GOT BOLDER.', confidence: 90, bbox: { x0: 100, y0: 150, x1: 350, y1: 190 } },
    ];

    const segments = segmentOcrResult('img-bubble', blocks);
    expect(segments.length).toBe(1);
    expect(segments[0].text).toBe('HE GOT AWAY WITH IT, HE GOT BOLDER.');
    expect(segments[0].spokenText).toBe('He got away with it, he got bolder.');
  });

  it('repairs hyphenated word breaks across lines', () => {
    const blocks: OcrBlock[] = [
      { text: 'IT IS HIS RESPONSI-', confidence: 90, bbox: { x0: 100, y0: 100, x1: 400, y1: 140 } },
      { text: 'BILITY TO FIX IT.', confidence: 90, bbox: { x0: 100, y0: 150, x1: 350, y1: 190 } },
    ];

    const segments = segmentOcrResult('img-hyphen', blocks);
    expect(segments.length).toBe(1);
    expect(segments[0].text).toBe('IT IS HIS RESPONSIBILITY TO FIX IT.');
    expect(segments[0].spokenText).toBe('It is his responsibility to fix it.');
  });
});
