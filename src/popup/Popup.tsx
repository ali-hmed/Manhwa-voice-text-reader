import React, { useState, useEffect, useCallback } from 'react';
import type { PopupStatusResponse } from '../types/messages';
import { loadSettings, saveSettings } from '../shared/settings';

type PopupState = 'idle' | 'activating' | 'active' | 'restricted' | 'error';

export function Popup(): React.ReactElement {
  const [state, setState] = useState<PopupState>('idle');
  const [error, setError] = useState('');
  const [hasHostPermission, setHasHostPermission] = useState(true);
  const [dialogueOnly, setDialogueOnly] = useState(true);

  // Check tab status, settings, and host permissions on open
  useEffect(() => {
    loadSettings().then((s) => setDialogueOnly(s.dialogueOnly !== false));

    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab?.url) return;
      const url = tab.url;
      if (
        url.startsWith('chrome://') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('edge://') ||
        url.startsWith('about:') ||
        url.startsWith('devtools://')
      ) {
        setState('restricted');
      }
    });

    chrome.permissions.contains({ origins: ['<all_urls>'] }).then(setHasHostPermission);
  }, []);

  const handleGrantPermissions = useCallback(async () => {
    try {
      const granted = await chrome.permissions.request({ origins: ['<all_urls>'] });
      setHasHostPermission(granted);
    } catch (err) {
      console.warn('Failed to request host permission:', err);
    }
  }, []);

  const handleActivate = useCallback(async () => {
    setState('activating');
    setError('');

    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'POPUP_ACTIVATE',
      })) as PopupStatusResponse;

      if (response?.isRestricted) {
        setState('restricted');
      } else if (response?.isActive) {
        setState('active');
      } else {
        setState('error');
        setError('Could not activate on this page.');
      }
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  return (
    <div
      style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '320px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>🎙️</span>
          <span>Manhwa Voice</span>
        </span>
        <span
          style={{
            fontSize: '10px',
            color: '#8b8fa3',
            background: '#252538',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
        >
          v1.0.0
        </span>
      </div>

      <div
        style={{
          fontSize: '12px',
          color: '#8b8fa3',
          lineHeight: 1.4,
        }}
      >
        Read manhwa dialogue aloud with local OCR and natural text-to-speech.
      </div>

      {!hasHostPermission && (
        <div
          style={{
            background: '#201e38',
            border: '1px solid #3d3570',
            padding: '8px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <span style={{ color: '#c4bbf5', lineHeight: 1.3 }}>
            🌐 Comic sites store panels on external CDNs. Allow image access so OCR can read them:
          </span>
          <button
            onClick={handleGrantPermissions}
            style={{
              background: '#5b4dc7',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            Allow CDN Image Access
          </button>
        </div>
      )}

      {state === 'restricted' && (
        <div
          style={{
            fontSize: '12px',
            color: '#ff6b6b',
            background: '#2a1a1a',
            padding: '8px 10px',
            borderRadius: '6px',
            lineHeight: 1.4,
          }}
        >
          Extensions cannot run on internal browser pages (chrome://, edge://). Open a comic chapter on any website to use Manhwa Voice.
        </div>
      )}

      {state === 'error' && error && (
        <div
          style={{
            fontSize: '12px',
            color: '#ff6b6b',
            background: '#2a1a1a',
            padding: '8px 10px',
            borderRadius: '6px',
          }}
        >
          {error}
        </div>
      )}

      {state === 'active' && (
        <div
          style={{
            fontSize: '12px',
            color: '#4ade80',
            background: '#1a2a1a',
            padding: '8px 10px',
            borderRadius: '6px',
            lineHeight: 1.4,
          }}
        >
          ✓ Active — the floating controller is on your page. Closing this popup will not stop playback.
        </div>
      )}

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#cbd5e1',
          cursor: 'pointer',
          padding: '2px 0',
        }}
      >
        <input
          type="checkbox"
          checked={dialogueOnly}
          onChange={(e) => {
            const val = e.target.checked;
            setDialogueOnly(val);
            saveSettings({ dialogueOnly: val });
          }}
          style={{ accentColor: '#6c63ff', cursor: 'pointer' }}
        />
        <span>Dialogue only (skip scene signs & labels)</span>
      </label>

      <button
        onClick={handleActivate}
        disabled={state === 'activating' || state === 'restricted'}
        style={{
          background: state === 'active' ? '#2e2e4a' : state === 'restricted' ? '#2a2a38' : '#6c63ff',
          color: state === 'restricted' ? '#666' : '#fff',
          border: '1px solid ' + (state === 'active' ? '#444466' : state === 'restricted' ? '#333' : '#7b73ff'),
          borderRadius: '8px',
          padding: '10px 16px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: state === 'activating' || state === 'restricted' ? 'default' : 'pointer',
          opacity: state === 'activating' ? 0.7 : 1,
          transition: 'all 0.15s ease',
        }}
      >
        {state === 'activating'
          ? 'Activating...'
          : state === 'active'
          ? 'Focus Controller'
          : 'Activate on this page'}
      </button>

      <div
        style={{
          fontSize: '10px',
          color: '#555',
          textAlign: 'center',
          marginTop: '4px',
        }}
      >
        100% Local OCR (Tesseract WASM) • No remote tracking
      </div>
    </div>
  );
}
