import { describe, it, expect } from 'vitest';
import { validateSettings, DEFAULT_SETTINGS } from '../src/shared/settings';

describe('Settings Validation', () => {
  it('returns defaults for null or non-object values', () => {
    expect(validateSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(validateSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(validateSettings('string')).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps speed within [0.7, 1.5] range', () => {
    expect(validateSettings({ speed: 0.1 }).speed).toBe(0.7);
    expect(validateSettings({ speed: 3.5 }).speed).toBe(1.5);
    expect(validateSettings({ speed: 1.25 }).speed).toBe(1.25);
  });

  it('preserves valid voiceURI and autoScroll settings', () => {
    const custom = {
      voiceURI: 'Google US English',
      speed: 1.1,
      autoScroll: false,
      dialogueOnly: true,
    };
    expect(validateSettings(custom)).toEqual(custom);
  });
});
