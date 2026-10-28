import { describe, it, expect } from 'vitest';
import { isValidMessage, isMessageType, type AnyMessage } from '../src/types/messages';

describe('Message Protocol', () => {
  it('validates messages with a string type', () => {
    expect(isValidMessage({ type: 'POPUP_ACTIVATE' })).toBe(true);
    expect(isValidMessage({ type: 'OCR_REQUEST', imageId: 'img-1', imageUrl: 'http://test.com/a.png', tileIndex: 0, tileTotal: 1 })).toBe(true);
    expect(isValidMessage(null)).toBe(false);
    expect(isValidMessage(undefined)).toBe(false);
    expect(isValidMessage('not an object')).toBe(false);
    expect(isValidMessage({})).toBe(false);
    expect(isValidMessage({ type: 123 })).toBe(false);
  });

  it('correctly discriminates message types with isMessageType', () => {
    const msg: AnyMessage = {
      type: 'OCR_RESULT',
      imageId: 'img-1',
      tileIndex: 0,
      blocks: [{ text: 'Hello', confidence: 90, bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } }],
      fullText: 'Hello',
      meanConfidence: 90,
    };

    if (isMessageType(msg, 'OCR_RESULT')) {
      expect(msg.fullText).toBe('Hello');
      expect(msg.blocks.length).toBe(1);
    } else {
      throw new Error('Type guard failed');
    }
  });
});
