/**
 * Content script entry — session owner & orchestrator.
 * Connects Discovery, Queue, Speech, Scroller, Settings, and Floating Controller.
 * Prevents duplicate injection and maintains one authoritative session.
 */
import { INJECTION_ATTR } from '../shared/constants';
import { watchImages, getImageElement, clearDiscovery } from './discovery';
import { createController, showController, type ControllerState } from './floating-controller';
import { SpeechController } from './speech';
import { Scroller } from './scroller';
import { ReadingQueue } from './queue';
import { loadSettings, saveSettings } from '../shared/settings';

// ─── Injection guard ───────────────────────────────────────────────

if (document.documentElement.getAttribute(INJECTION_ATTR)) {
  console.log('[Manhwa Voice] Already active on this page — focusing controller.');
  showController();
} else {
  document.documentElement.setAttribute(INJECTION_ATTR, 'true');
  init();
}

async function init(): Promise<void> {
  console.log('[Manhwa Voice] Session initializing...');

  const settings = await loadSettings();
  const speechController = new SpeechController();
  const scroller = new Scroller(settings.autoScroll);
  const queue = new ReadingQueue();
  queue.setDialogueOnly(settings.dialogueOnly !== false);

  speechController.setRate(settings.speed);
  if (settings.voiceURI) {
    speechController.setVoiceURI(settings.voiceURI);
  }

  let updateController: ((state: ControllerState) => void) | null = null;
  let currentScanProgress = { scanned: 0, total: 0, isScanning: true };

  // Helper to push full state to UI
  const syncUi = () => {
    if (!updateController) return;
    const playback = speechController.getState();
    const segments = speechController.getSegments();
    const voices = speechController.getAvailableVoices().map(v => ({
      name: v.name,
      lang: v.lang,
      voiceURI: v.voiceURI,
    }));

    updateController({
      status: playback.status,
      text: playback.currentSegment?.text ?? '',
      error: playback.error ?? '',
      progress: playback.totalSegments > 0 ? (playback.currentIndex + 1) / playback.totalSegments : 0,
      imageCount: currentScanProgress.total,
      currentSegmentIndex: playback.currentIndex,
      totalSegments: playback.totalSegments,
      segments: segments.map(s => s.text),
      speed: speechController.getRate(),
      voiceURI: speechController.getVoiceURI(),
      autoScroll: scroller.isEnabled(),
      dialogueOnly: settings.dialogueOnly !== false,
      availableVoices: voices,
      scannedImages: currentScanProgress.scanned,
      totalImages: currentScanProgress.total,
      isScanning: currentScanProgress.isScanning,
    });
  };

  // Mount Floating Controller with interactive callbacks
  updateController = createController({
    onPlay: () => speechController.play(),
    onPause: () => speechController.pause(),
    onResume: () => speechController.resume(),
    onStop: () => {
      speechController.stop();
      scroller.stop();
    },
    onNext: () => speechController.next(),
    onPrevious: () => speechController.previous(),
    onRepeat: () => speechController.repeat(),
    onSelectSegment: (idx) => speechController.play(idx),
    onSpeedChange: (speed) => {
      speechController.setRate(speed);
      saveSettings({ speed });
      syncUi();
    },
    onVoiceChange: (voiceURI) => {
      speechController.setVoiceURI(voiceURI);
      saveSettings({ voiceURI });
      syncUi();
    },
    onAutoScrollToggle: (enabled) => {
      scroller.setEnabled(enabled);
      saveSettings({ autoScroll: enabled });
      syncUi();
    },
    onDialogueOnlyToggle: (enabled) => {
      settings.dialogueOnly = enabled;
      queue.setDialogueOnly(enabled);
      saveSettings({ dialogueOnly: enabled });
      syncUi();
    },
    onRequestPermissions: async () => {
      try {
        await chrome.runtime.sendMessage({ type: 'REQUEST_PERMISSIONS' });
      } catch (err) {
        console.warn('[Manhwa Voice] Permission request failed:', err);
      }
    },
  });

  // Track speech state transitions & trigger auto-scroll
  speechController.onStateChange((playback) => {
    syncUi();

    if (playback.status === 'playing' && playback.currentSegment) {
      queue.setActiveReadingImage(playback.currentSegment.imageId);
      const imgEl = getImageElement(playback.currentSegment.imageId);
      scroller.scrollToSegment(playback.currentSegment, imgEl);
    } else if (playback.status === 'stopped' || playback.status === 'idle') {
      scroller.stop();
    }
  });

  // Re-sync UI when system voices finish loading
  speechController.onVoicesChanged(() => {
    syncUi();
  });

  // Incremental Queue handlers
  queue.onSegmentsAvailable((newSegments, isFinished) => {
    speechController.appendSegments(newSegments, isFinished);
    syncUi();
  });

  queue.onProgress((progress) => {
    currentScanProgress = {
      scanned: progress.scannedImages,
      total: progress.totalImages,
      isScanning: progress.isScanning,
    };
    speechController.setScanningComplete(!progress.isScanning && progress.scannedImages >= progress.totalImages);
    syncUi();
  });

  queue.onError((errMsg) => {
    if (updateController) {
      updateController({
        ...speechController.getState(),
        status: speechController.getState().status,
        text: speechController.getState().currentSegment?.text ?? '',
        error: errMsg,
        progress: 0,
        imageCount: currentScanProgress.total,
        speed: speechController.getRate(),
        voiceURI: speechController.getVoiceURI(),
        autoScroll: scroller.isEnabled(),
        scannedImages: currentScanProgress.scanned,
        totalImages: currentScanProgress.total,
        isScanning: currentScanProgress.isScanning,
      });
    }
  });

  // Start watching images (MutationObserver + IntersectionObserver)
  const stopWatching = watchImages((img) => {
    queue.addImage(img);
  });

  // Listen for extension messages (e.g. unhide controller if popup re-clicked)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SHOW_CONTROLLER') {
      showController();
    }
  });

  // Initial UI sync
  syncUi();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    stopWatching();
    queue.destroy();
    speechController.destroy();
    scroller.destroy();
    clearDiscovery();
  });
}
