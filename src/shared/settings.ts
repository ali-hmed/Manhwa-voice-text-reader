/**
 * Settings module — persists user preferences in chrome.storage.local.
 * Validates values on load and applies safe defaults.
 */

export interface ManhwaVoiceSettings {
  voiceURI: string;
  speed: number;
  autoScroll: boolean;
  dialogueOnly: boolean;
}

export const DEFAULT_SETTINGS: ManhwaVoiceSettings = {
  voiceURI: '',
  speed: 1.0,
  autoScroll: true,
  dialogueOnly: true,
};

const STORAGE_KEY = 'mv_settings';

/**
 * Validate and clamp raw settings into valid values.
 */
export function validateSettings(raw: unknown): ManhwaVoiceSettings {
  if (typeof raw !== 'object' || raw === null) {
    return { ...DEFAULT_SETTINGS };
  }

  const obj = raw as Record<string, unknown>;

  const voiceURI = typeof obj.voiceURI === 'string' ? obj.voiceURI : DEFAULT_SETTINGS.voiceURI;

  let speed = typeof obj.speed === 'number' && !Number.isNaN(obj.speed) ? obj.speed : DEFAULT_SETTINGS.speed;
  // Speed allowed range: 0.7x to 1.5x
  speed = Math.max(0.7, Math.min(1.5, Math.round(speed * 100) / 100));

  const autoScroll = typeof obj.autoScroll === 'boolean' ? obj.autoScroll : DEFAULT_SETTINGS.autoScroll;
  const dialogueOnly = typeof obj.dialogueOnly === 'boolean' ? obj.dialogueOnly : DEFAULT_SETTINGS.dialogueOnly;

  return {
    voiceURI,
    speed,
    autoScroll,
    dialogueOnly,
  };
}

/**
 * Load settings from chrome.storage.local.
 */
export async function loadSettings(): Promise<ManhwaVoiceSettings> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return { ...DEFAULT_SETTINGS };
    }
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return validateSettings(result[STORAGE_KEY]);
  } catch (err) {
    console.warn('[Settings] Failed to load settings from storage, using defaults:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save partial or full settings to chrome.storage.local.
 */
export async function saveSettings(
  partial: Partial<ManhwaVoiceSettings>
): Promise<ManhwaVoiceSettings> {
  try {
    const current = await loadSettings();
    const updated = validateSettings({ ...current, ...partial });

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEY]: updated });
    }
    return updated;
  } catch (err) {
    console.warn('[Settings] Failed to save settings to storage:', err);
    return validateSettings(partial);
  }
}

/**
 * Listen for settings changes across extension contexts.
 */
export function onSettingsChanged(
  callback: (newSettings: ManhwaVoiceSettings) => void
): () => void {
  if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) {
    return () => {};
  }

  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName === 'local' && changes[STORAGE_KEY]?.newValue) {
      callback(validateSettings(changes[STORAGE_KEY].newValue));
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
