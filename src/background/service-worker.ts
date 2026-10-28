/**
 * Service worker — thin message router + offscreen lifecycle.
 * Holds NO playback state (it can be suspended).
 */
import {
  isValidMessage,
  type PopupStatusResponse,
  type OcrErrorMessage,
  type PermissionsStatusResponse,
} from '../types/messages';

// ─── Offscreen lifecycle ───────────────────────────────────────────

let creatingOffscreen: Promise<void> | null = null;

async function ensureOffscreenDocument(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
  });
  if (contexts.length > 0) return;

  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  creatingOffscreen = chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: ['WORKERS' as chrome.offscreen.Reason],
    justification: 'Run Tesseract.js OCR WebAssembly worker for local text recognition.',
  });

  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = null;
  }
}

// ─── Message routing ───────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isValidMessage(message)) return;

  switch (message.type) {
    case 'POPUP_ACTIVATE': {
      // Inject content script into the active tab
      (async () => {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab?.id) {
            sendResponse({ type: 'POPUP_STATUS', isActive: false, isRestricted: true } satisfies PopupStatusResponse);
            return;
          }

          // Check for restricted pages
          const url = tab.url ?? '';
          if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
              url.startsWith('edge://') || url.startsWith('about:') ||
              url === '' || url.startsWith('devtools://')) {
            sendResponse({ type: 'POPUP_STATUS', isActive: false, isRestricted: true } satisfies PopupStatusResponse);
            return;
          }

          // If already injected, unhide/refocus the controller; otherwise inject
          let notified = false;
          try {
            await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_CONTROLLER' });
            notified = true;
          } catch {
            // Not injected yet
          }

          if (!notified) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content/index.js'],
            });
          }

          sendResponse({ type: 'POPUP_STATUS', isActive: true, isRestricted: false, tabId: tab.id } satisfies PopupStatusResponse);
        } catch (err) {
          console.error('[SW] Activation error:', err);
          sendResponse({ type: 'POPUP_STATUS', isActive: false, isRestricted: true } satisfies PopupStatusResponse);
        }
      })();
      return true;
    }

    case 'CHECK_PERMISSIONS': {
      chrome.permissions.contains({ origins: ['<all_urls>'] }).then((hasHostPermission) => {
        sendResponse({ type: 'PERMISSIONS_STATUS', hasHostPermission } satisfies PermissionsStatusResponse);
      });
      return true;
    }

    case 'REQUEST_PERMISSIONS': {
      // Must call synchronously without await before it to preserve user gesture
      chrome.permissions.request({ origins: ['<all_urls>'] })
        .then((granted) => {
          sendResponse({ type: 'PERMISSIONS_STATUS', hasHostPermission: granted } satisfies PermissionsStatusResponse);
        })
        .catch((err) => {
          console.warn('[SW] Permissions request error:', err);
          sendResponse({ type: 'PERMISSIONS_STATUS', hasHostPermission: false } satisfies PermissionsStatusResponse);
        });
      return true;
    }

    case 'POPUP_GET_STATUS': {
      // For now, just return a basic status
      sendResponse({ type: 'POPUP_STATUS', isActive: false, isRestricted: false } satisfies PopupStatusResponse);
      return true;
    }

    case 'OCR_REQUEST': {
      // Route OCR request to offscreen document
      (async () => {
        try {
          await ensureOffscreenDocument();

          // Forward to offscreen as OCR_JOB
          const response = await chrome.runtime.sendMessage({
            type: 'OCR_JOB',
            target: 'offscreen',
            imageUrl: message.imageUrl,
            imageBase64: message.imageBase64,
            tileIndex: message.tileIndex,
            tileTotal: message.tileTotal,
            imageId: message.imageId,
            dialogueOnly: message.dialogueOnly,
          });

          sendResponse(response);
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          console.error('[SW] OCR routing error:', error);
          sendResponse({
            type: 'OCR_ERROR',
            imageId: message.imageId,
            tileIndex: message.tileIndex,
            error,
          } satisfies OcrErrorMessage);
        }
      })();
      return true;
    }

    // Forward OCR results/progress from offscreen to the content script
    case 'OCR_RESULT':
    case 'OCR_PROGRESS':
    case 'OCR_ERROR': {
      // These come from the offscreen doc — forward to all content scripts
      (async () => {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (tab.id) {
            try {
              await chrome.tabs.sendMessage(tab.id, message);
            } catch {
              // Content script not injected in this tab — ignore
            }
          }
        }
      })();
      return false;
    }
  }
});

console.log('[Manhwa Voice] Service worker loaded.');
