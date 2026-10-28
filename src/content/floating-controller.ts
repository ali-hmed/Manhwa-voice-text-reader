/**
 * Floating controller — Shadow DOM embedded UI for controlling playback.
 * Provides Play/Pause/Resume/Stop/Next/Prev/Repeat, voice & speed selectors,
 * auto-scroll toggle, scanning & playback progress, collapse/hide functionality,
 * dialogue text transcript viewer, and copy-all support.
 */
import { CONTROLLER_HOST_ID, CSS_PREFIX } from '../shared/constants';

export type ControllerStatus =
  | 'idle'
  | 'scanning'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'waiting'
  | 'stopped'
  | 'completed'
  | 'error';

export interface ControllerState {
  status: ControllerStatus;
  text: string;
  error: string;
  progress: number;
  imageCount: number;
  currentSegmentIndex?: number;
  totalSegments?: number;
  segments?: string[];
  speed?: number;
  voiceURI?: string;
  autoScroll?: boolean;
  dialogueOnly?: boolean;
  availableVoices?: { name: string; lang: string; voiceURI: string }[];
  scannedImages?: number;
  totalImages?: number;
  isScanning?: boolean;
}

export interface ControllerCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onRepeat: () => void;
  onSpeedChange: (speed: number) => void;
  onVoiceChange: (voiceURI: string) => void;
  onAutoScrollToggle: (enabled: boolean) => void;
  onDialogueOnlyToggle?: (enabled: boolean) => void;
  onSelectSegment: (index: number) => void;
  onRequestPermissions: () => void;
}

let hostElement: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let isCollapsed = false;
let isTextExpanded = false;
let userIsScrollingTranscript = false;
let userScrollTimer: ReturnType<typeof setTimeout> | null = null;
let savedTranscriptScrollTop = 0;

let activeCallbacks: ControllerCallbacks = {
  onPlay: () => {},
  onPause: () => {},
  onResume: () => {},
  onStop: () => {},
  onNext: () => {},
  onPrevious: () => {},
  onRepeat: () => {},
  onSpeedChange: () => {},
  onVoiceChange: () => {},
  onAutoScrollToggle: () => {},
  onSelectSegment: () => {},
  onRequestPermissions: () => {},
};

function getStyles(): string {
  return `
    :host {
      all: initial;
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .${CSS_PREFIX}container {
      background: #151525;
      color: #e0e0e0;
      border: 1px solid #282845;
      border-radius: 12px;
      padding: 12px 14px;
      width: 330px;
      max-height: 540px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.55);
      font-size: 13px;
      line-height: 1.4;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-sizing: border-box;
      transition: all 0.2s ease;
    }
    .${CSS_PREFIX}container.collapsed {
      width: auto;
      max-height: none;
      padding: 8px 12px;
    }
    .${CSS_PREFIX}header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .${CSS_PREFIX}title {
      font-weight: 600;
      font-size: 13px;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      user-select: none;
    }
    .${CSS_PREFIX}actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .${CSS_PREFIX}status {
      font-size: 11px;
      color: #8b8fa3;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .${CSS_PREFIX}status-playing { color: #4ade80; }
    .${CSS_PREFIX}status-paused { color: #fbbf24; }
    .${CSS_PREFIX}status-waiting { color: #38bdf8; }
    .${CSS_PREFIX}status-error { color: #f87171; }

    .${CSS_PREFIX}icon-btn {
      background: none;
      border: none;
      color: #8b8fa3;
      cursor: pointer;
      font-size: 13px;
      padding: 2px 5px;
      line-height: 1;
      border-radius: 4px;
      transition: color 0.15s, background 0.15s;
    }
    .${CSS_PREFIX}icon-btn:hover {
      color: #fff;
      background: rgba(255,255,255,0.1);
    }

    .${CSS_PREFIX}playback-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: #1c1c32;
      padding: 6px;
      border-radius: 8px;
    }
    .${CSS_PREFIX}ctrl-btn {
      background: #282845;
      color: #fff;
      border: 1px solid #3d3d65;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: background 0.15s;
    }
    .${CSS_PREFIX}ctrl-btn:hover:not(:disabled) {
      background: #383860;
    }
    .${CSS_PREFIX}ctrl-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .${CSS_PREFIX}btn-play {
      background: #6c63ff;
      border-color: #7b73ff;
      min-width: 68px;
      font-weight: 600;
    }
    .${CSS_PREFIX}btn-play:hover:not(:disabled) {
      background: #7d75ff;
    }

    .${CSS_PREFIX}options-grid {
      display: grid;
      grid-template-columns: 75px 1fr;
      gap: 8px;
      font-size: 11px;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
    .${CSS_PREFIX}select-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      overflow: hidden;
    }
    .${CSS_PREFIX}select-label {
      color: #8888a0;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
    }
    .${CSS_PREFIX}select {
      background: #1c1c32;
      color: #ddd;
      border: 1px solid #2e2e4e;
      border-radius: 4px;
      padding: 4px 6px;
      font-size: 11px;
      outline: none;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }
    .${CSS_PREFIX}toggle-label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      color: #c0c0d5;
      font-size: 11px;
      user-select: none;
      margin-top: 2px;
    }

    .${CSS_PREFIX}transcript-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #7e7e9a;
      margin-top: 2px;
      padding: 0 2px;
    }
    .${CSS_PREFIX}text-area {
      background: #11111d;
      border: 1px solid #222238;
      border-radius: 6px;
      padding: 6px 8px;
      height: 140px;
      overflow-y: auto;
      font-size: 12px;
      color: #c0c0d0;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: height 0.2s ease;
    }
    .${CSS_PREFIX}text-area.expanded {
      height: 250px;
    }
    .${CSS_PREFIX}segment {
      padding: 4px 6px;
      border-radius: 4px;
      cursor: pointer;
      line-height: 1.35;
    }
    .${CSS_PREFIX}segment:hover {
      background: rgba(255,255,255,0.06);
    }
    .${CSS_PREFIX}segment-active {
      background: rgba(108, 99, 255, 0.28);
      border-left: 3px solid #6c63ff;
      color: #ffffff;
      font-weight: 500;
    }
    .${CSS_PREFIX}error-box {
      color: #fca5a5;
      font-size: 11px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 6px 8px;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .${CSS_PREFIX}grant-btn {
      background: #4f46e5;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      align-self: flex-start;
    }
    .${CSS_PREFIX}grant-btn:hover {
      background: #6366f1;
    }

    .${CSS_PREFIX}meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #6e6e88;
    }
    .${CSS_PREFIX}progress {
      height: 3px;
      background: #222238;
      border-radius: 2px;
      overflow: hidden;
    }
    .${CSS_PREFIX}progress-bar {
      height: 100%;
      background: #6c63ff;
      transition: width 0.3s ease;
    }
  `;
}

function getStatusLabel(status: ControllerStatus): string {
  switch (status) {
    case 'idle': return 'Ready';
    case 'scanning': return 'Scanning';
    case 'ready': return 'Ready';
    case 'playing': return 'Playing';
    case 'paused': return 'Paused';
    case 'waiting': return 'Waiting for panels...';
    case 'stopped': return 'Stopped';
    case 'completed': return 'Completed';
    case 'error': return 'Error';
    default: return 'Ready';
  }
}

function render(state: ControllerState): void {
  if (!shadowRoot) return;

  const container = shadowRoot.querySelector(`.${CSS_PREFIX}container`);
  if (!container) return;

  const isPlaying = state.status === 'playing';
  const isPaused = state.status === 'paused';
  const isWaiting = state.status === 'waiting';
  const hasSegments = (state.totalSegments && state.totalSegments > 0) || (state.segments && state.segments.length > 0);
  const statusLabel = getStatusLabel(state.status);

  let statusClass = '';
  if (isPlaying) statusClass = ` ${CSS_PREFIX}status-playing`;
  else if (isPaused) statusClass = ` ${CSS_PREFIX}status-paused`;
  else if (isWaiting) statusClass = ` ${CSS_PREFIX}status-waiting`;
  else if (state.status === 'error') statusClass = ` ${CSS_PREFIX}status-error`;

  if (isCollapsed) {
    container.className = `${CSS_PREFIX}container collapsed`;
    container.innerHTML = `
      <div class="${CSS_PREFIX}header" style="gap: 12px;">
        <span class="${CSS_PREFIX}title" id="${CSS_PREFIX}uncollapse-title" title="Click to expand">
          <span>🎙️</span>
          <span class="${CSS_PREFIX}status${statusClass}">${statusLabel}</span>
        </span>
        <div class="${CSS_PREFIX}actions">
          ${isPlaying ? `
            <button class="${CSS_PREFIX}icon-btn" id="${CSS_PREFIX}mini-pause-btn" title="Pause">⏸</button>
          ` : `
            <button class="${CSS_PREFIX}icon-btn" id="${CSS_PREFIX}mini-play-btn" ${hasSegments ? '' : 'disabled'} title="Play">▶</button>
          `}
          <button class="${CSS_PREFIX}icon-btn" id="${CSS_PREFIX}expand-btn" title="Expand controller">⛶</button>
        </div>
      </div>
    `;

    const expandBtn = shadowRoot.querySelector(`#${CSS_PREFIX}expand-btn`);
    expandBtn?.addEventListener('click', () => { isCollapsed = false; render(state); });
    const uncollapseTitle = shadowRoot.querySelector(`#${CSS_PREFIX}uncollapse-title`);
    uncollapseTitle?.addEventListener('click', () => { isCollapsed = false; render(state); });

    const miniPlay = shadowRoot.querySelector(`#${CSS_PREFIX}mini-play-btn`);
    miniPlay?.addEventListener('click', () => {
      if (isPaused) activeCallbacks.onResume();
      else activeCallbacks.onPlay();
    });
    const miniPause = shadowRoot.querySelector(`#${CSS_PREFIX}mini-pause-btn`);
    miniPause?.addEventListener('click', () => activeCallbacks.onPause());
    return;
  }

  container.className = `${CSS_PREFIX}container`;

  // Build segments HTML
  let segmentsHtml = '';
  if (state.segments && state.segments.length > 0) {
    segmentsHtml = state.segments
      .map((seg, idx) => {
        const isActive = state.currentSegmentIndex === idx;
        const cls = isActive ? `${CSS_PREFIX}segment ${CSS_PREFIX}segment-active` : `${CSS_PREFIX}segment`;
        return `<div class="${cls}" data-index="${idx}" title="Click to speak from here">${escapeHtml(seg)}</div>`;
      })
      .join('');
  } else if (isWaiting) {
    segmentsHtml = `<div style="color:#38bdf8;padding:8px;font-style:italic;">Scanning upcoming pages... speech will resume automatically.</div>`;
  } else if (state.isScanning) {
    segmentsHtml = `<div style="color:#818cf8;padding:8px;">Scanning manhwa dialogue (panel ${(state.scannedImages || 0) + 1} of ${state.totalImages || '...'})</div>`;
  } else {
    segmentsHtml = `<div style="color:#666;padding:8px;">No dialogue detected yet.</div>`;
  }

  // Build voice options
  const voiceOpts = (state.availableVoices || [])
    .map(v => {
      const selected = v.voiceURI === state.voiceURI ? 'selected' : '';
      return `<option value="${escapeHtml(v.voiceURI)}" ${selected}>${escapeHtml(v.name)} (${v.lang})</option>`;
    })
    .join('');

  // Speed options (0.7x to 1.5x)
  const speeds = [0.7, 0.85, 1.0, 1.15, 1.3, 1.5];
  const currentSpeed = state.speed || 1.0;
  const speedOpts = speeds
    .map(s => {
      const selected = Math.abs(s - currentSpeed) < 0.05 ? 'selected' : '';
      return `<option value="${s}" ${selected}>${s}x</option>`;
    })
    .join('');

  const safeIdx = typeof state.currentSegmentIndex === 'number' && state.totalSegments && state.totalSegments > 0
    ? Math.min(state.currentSegmentIndex + 1, state.totalSegments)
    : 0;

  const currentIdxDisplay = state.totalSegments && state.totalSegments > 0
    ? `Segment ${safeIdx} of ${state.totalSegments}`
    : '';

  const scanDisplay = typeof state.scannedImages === 'number' && state.totalImages
    ? `${state.scannedImages} / ${state.totalImages} pages scanned`
    : '';

  const isCorsError = state.error && (state.error.includes('CORS') || state.error.includes('inaccessible'));

  const oldTextScroll = shadowRoot.querySelector<HTMLElement>(`#${CSS_PREFIX}text-scroll`);
  if (oldTextScroll) {
    savedTranscriptScrollTop = oldTextScroll.scrollTop;
  }

  container.innerHTML = `
    <div class="${CSS_PREFIX}header">
      <span class="${CSS_PREFIX}title">
        <span>🎙️</span>
        <span>Manhwa Voice</span>
      </span>
      <div class="${CSS_PREFIX}actions">
        <span class="${CSS_PREFIX}status${statusClass}">${statusLabel}</span>
        <button class="${CSS_PREFIX}icon-btn" id="${CSS_PREFIX}collapse-btn" title="Minimize controller">_</button>
        <button class="${CSS_PREFIX}icon-btn" id="${CSS_PREFIX}hide-btn" title="Hide controller (playback continues)">✕</button>
      </div>
    </div>

    ${state.isScanning ? `
      <div class="${CSS_PREFIX}progress" title="Scanning progress">
        <div class="${CSS_PREFIX}progress-bar" style="width: ${state.totalImages ? Math.round((state.scannedImages || 0) / state.totalImages * 100) : 20}%"></div>
      </div>
    ` : ''}

    ${state.error ? `
      <div class="${CSS_PREFIX}error-box">
        <span>${escapeHtml(state.error)}</span>
        ${isCorsError ? `
          <button class="${CSS_PREFIX}grant-btn" id="${CSS_PREFIX}allow-cdn-btn">Allow Image Access</button>
        ` : ''}
      </div>
    ` : ''}

    <!-- Playback controls bar -->
    <div class="${CSS_PREFIX}playback-bar">
      <button class="${CSS_PREFIX}ctrl-btn" id="${CSS_PREFIX}prev-btn" title="Previous segment" ${hasSegments ? '' : 'disabled'}>⏮</button>
      <button class="${CSS_PREFIX}ctrl-btn" id="${CSS_PREFIX}repeat-btn" title="Repeat current segment" ${hasSegments ? '' : 'disabled'}>🔁</button>

      ${isPlaying ? `
        <button class="${CSS_PREFIX}ctrl-btn ${CSS_PREFIX}btn-play" id="${CSS_PREFIX}pause-btn" aria-label="Pause">⏸ Pause</button>
      ` : isPaused ? `
        <button class="${CSS_PREFIX}ctrl-btn ${CSS_PREFIX}btn-play" id="${CSS_PREFIX}resume-btn" aria-label="Resume">▶ Resume</button>
      ` : `
        <button class="${CSS_PREFIX}ctrl-btn ${CSS_PREFIX}btn-play" id="${CSS_PREFIX}play-btn" ${hasSegments ? '' : 'disabled'} aria-label="Play">▶ Play</button>
      `}

      <button class="${CSS_PREFIX}ctrl-btn" id="${CSS_PREFIX}next-btn" title="Next segment" ${hasSegments ? '' : 'disabled'}>⏭</button>
      <button class="${CSS_PREFIX}ctrl-btn" id="${CSS_PREFIX}stop-btn" title="Stop playback" ${isPlaying || isPaused ? '' : 'disabled'}>⏹</button>
    </div>

    <!-- Settings bar: Voice, Speed, AutoScroll -->
    <div class="${CSS_PREFIX}options-grid">
      <div class="${CSS_PREFIX}select-group">
        <span class="${CSS_PREFIX}select-label">Speed</span>
        <select class="${CSS_PREFIX}select" id="${CSS_PREFIX}speed-select" aria-label="Playback speed">
          ${speedOpts}
        </select>
      </div>

      <div class="${CSS_PREFIX}select-group">
        <span class="${CSS_PREFIX}select-label">Voice</span>
        <select class="${CSS_PREFIX}select" id="${CSS_PREFIX}voice-select" aria-label="Speech voice">
          ${voiceOpts || '<option value="">Default Voice</option>'}
        </select>
      </div>
    </div>

    <label class="${CSS_PREFIX}toggle-label">
      <input type="checkbox" id="${CSS_PREFIX}scroll-toggle" ${state.autoScroll !== false ? 'checked' : ''} />
      <span>Auto-scroll to dialogue</span>
    </label>

    <label class="${CSS_PREFIX}toggle-label">
      <input type="checkbox" id="${CSS_PREFIX}dialogue-toggle" ${state.dialogueOnly !== false ? 'checked' : ''} />
      <span>Dialogue only (skip scene text & signs)</span>
    </label>

    <!-- Dialogue Transcript Header with Expand and Copy controls -->
    <div class="${CSS_PREFIX}transcript-header">
      <span>Dialogue Transcript</span>
      <div style="display: flex; gap: 6px;">
        <button class="${CSS_PREFIX}icon-btn" id="${CSS_PREFIX}copy-btn" title="Copy all dialogue to clipboard">📋 Copy</button>
        <button class="${CSS_PREFIX}icon-btn" id="${CSS_PREFIX}expand-text-btn" title="${isTextExpanded ? 'Shrink viewer' : 'Expand viewer'}">${isTextExpanded ? '▲' : '▼'}</button>
      </div>
    </div>

    <!-- Segments text area -->
    <div class="${CSS_PREFIX}text-area${isTextExpanded ? ' expanded' : ''}" id="${CSS_PREFIX}text-scroll">
      ${segmentsHtml}
    </div>

    <!-- Metadata footer -->
    <div class="${CSS_PREFIX}meta">
      <span>${currentIdxDisplay}</span>
      <span>${scanDisplay}</span>
    </div>
  `;

  // Bind event listeners
  const playBtn = shadowRoot.querySelector(`#${CSS_PREFIX}play-btn`);
  playBtn?.addEventListener('click', () => activeCallbacks.onPlay());

  const pauseBtn = shadowRoot.querySelector(`#${CSS_PREFIX}pause-btn`);
  pauseBtn?.addEventListener('click', () => activeCallbacks.onPause());

  const resumeBtn = shadowRoot.querySelector(`#${CSS_PREFIX}resume-btn`);
  resumeBtn?.addEventListener('click', () => activeCallbacks.onResume());

  const stopBtn = shadowRoot.querySelector(`#${CSS_PREFIX}stop-btn`);
  stopBtn?.addEventListener('click', () => activeCallbacks.onStop());

  const nextBtn = shadowRoot.querySelector(`#${CSS_PREFIX}next-btn`);
  nextBtn?.addEventListener('click', () => activeCallbacks.onNext());

  const prevBtn = shadowRoot.querySelector(`#${CSS_PREFIX}prev-btn`);
  prevBtn?.addEventListener('click', () => activeCallbacks.onPrevious());

  const repeatBtn = shadowRoot.querySelector(`#${CSS_PREFIX}repeat-btn`);
  repeatBtn?.addEventListener('click', () => activeCallbacks.onRepeat());

  const allowCdnBtn = shadowRoot.querySelector(`#${CSS_PREFIX}allow-cdn-btn`);
  allowCdnBtn?.addEventListener('click', () => activeCallbacks.onRequestPermissions());

  const copyBtn = shadowRoot.querySelector(`#${CSS_PREFIX}copy-btn`);
  copyBtn?.addEventListener('click', () => {
    if (state.segments && state.segments.length > 0) {
      navigator.clipboard?.writeText(state.segments.join('\n\n')).then(() => {
        if (copyBtn) copyBtn.textContent = '✓ Copied';
        setTimeout(() => { if (copyBtn) copyBtn.textContent = '📋 Copy'; }, 2000);
      });
    }
  });

  const expandTextBtn = shadowRoot.querySelector(`#${CSS_PREFIX}expand-text-btn`);
  expandTextBtn?.addEventListener('click', () => {
    isTextExpanded = !isTextExpanded;
    render(state);
  });

  const speedSelect = shadowRoot.querySelector(`#${CSS_PREFIX}speed-select`) as HTMLSelectElement | null;
  speedSelect?.addEventListener('change', (e) => {
    const val = parseFloat((e.target as HTMLSelectElement).value);
    activeCallbacks.onSpeedChange(val);
  });

  const voiceSelect = shadowRoot.querySelector(`#${CSS_PREFIX}voice-select`) as HTMLSelectElement | null;
  voiceSelect?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    activeCallbacks.onVoiceChange(val);
  });

  const scrollToggle = shadowRoot.querySelector(`#${CSS_PREFIX}scroll-toggle`) as HTMLInputElement | null;
  scrollToggle?.addEventListener('change', (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    activeCallbacks.onAutoScrollToggle(checked);
  });

  const dialogueToggle = shadowRoot.querySelector(`#${CSS_PREFIX}dialogue-toggle`) as HTMLInputElement | null;
  dialogueToggle?.addEventListener('change', (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    activeCallbacks.onDialogueOnlyToggle?.(checked);
  });

  const hideBtn = shadowRoot.querySelector(`#${CSS_PREFIX}hide-btn`);
  hideBtn?.addEventListener('click', () => {
    if (hostElement) hostElement.style.display = 'none';
  });

  const collapseBtn = shadowRoot.querySelector(`#${CSS_PREFIX}collapse-btn`);
  collapseBtn?.addEventListener('click', () => {
    isCollapsed = true;
    render(state);
  });

  // Clicking a segment jumps directly to it
  const segmentEls = shadowRoot.querySelectorAll(`.${CSS_PREFIX}segment`);
  segmentEls.forEach(el => {
    el.addEventListener('click', () => {
      const idxStr = el.getAttribute('data-index');
      if (idxStr !== null) {
        const idx = parseInt(idxStr, 10);
        if (!isNaN(idx)) {
          userIsScrollingTranscript = false;
          activeCallbacks.onSelectSegment(idx);
        }
      }
    });
  });

  const textScroll = shadowRoot.querySelector<HTMLElement>(`#${CSS_PREFIX}text-scroll`);
  if (textScroll) {
    textScroll.scrollTop = savedTranscriptScrollTop;

    const handleUserScroll = () => {
      userIsScrollingTranscript = true;
      if (userScrollTimer) clearTimeout(userScrollTimer);
      userScrollTimer = setTimeout(() => {
        userIsScrollingTranscript = false;
      }, 5000);
    };

    textScroll.addEventListener('wheel', handleUserScroll, { passive: true });
    textScroll.addEventListener('touchmove', handleUserScroll, { passive: true });
    textScroll.addEventListener('scroll', () => {
      savedTranscriptScrollTop = textScroll.scrollTop;
    }, { passive: true });
  }

  // Auto-scroll active segment into view ONLY if the user isn't actively browsing the transcript
  if (!userIsScrollingTranscript) {
    const activeEl = shadowRoot.querySelector(`.${CSS_PREFIX}segment-active`);
    activeEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function createController(callbacks?: Partial<ControllerCallbacks>): (state: ControllerState) => void {
  if (callbacks) {
    activeCallbacks = { ...activeCallbacks, ...callbacks };
  }

  if (document.getElementById(CONTROLLER_HOST_ID)) {
    const existing = document.getElementById(CONTROLLER_HOST_ID);
    if (existing?.shadowRoot) {
      shadowRoot = existing.shadowRoot;
      hostElement = existing;
      hostElement.style.display = 'block';
      return render;
    }
  }

  hostElement = document.createElement('div');
  hostElement.id = CONTROLLER_HOST_ID;
  shadowRoot = hostElement.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = getStyles();
  shadowRoot.appendChild(style);

  const container = document.createElement('div');
  container.className = `${CSS_PREFIX}container`;
  shadowRoot.appendChild(container);

  document.body.appendChild(hostElement);

  render({
    status: 'idle',
    text: '',
    error: '',
    progress: 0,
    imageCount: 0,
  });

  return render;
}

export function showController(): void {
  if (hostElement) {
    hostElement.style.display = 'block';
  }
}

export function destroyController(): void {
  if (hostElement) {
    hostElement.remove();
    hostElement = null;
    shadowRoot = null;
  }
}
