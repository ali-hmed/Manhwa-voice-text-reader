# Manhwa Voice 🎙️

A lightweight, zero-cloud browser extension for **Google Chrome** and **Microsoft Edge** (Manifest V3) that reads English dialogue aloud from comic, manga, and manhwa web pages with automatic synchronized scrolling.

Built with strict TypeScript, Vite, React, Tesseract.js WebAssembly, and the Web Speech API.

---

## Features

- **Local Offline OCR**: Powered by Tesseract.js WebAssembly running inside an isolated `chrome.offscreen` document. Zero third-party cloud requests, no paid APIs, no subscriptions, and 100% privacy.
- **Incremental Background Scanning**: Narration begins immediately as soon as the first comic image is recognized, while remaining panels are queued and scanned sequentially in the background.
- **Natural Sentence Utterances**: Normalizes comic text, cleans OCR artifacts, and splits dialogue into short, sentence-level utterances to prevent speech engine truncation.
- **Reading Order Sorting**: Automatically sorts comic panels vertically, and orders speech bubbles within each panel top-to-bottom and left-to-right at similar heights.
- **Synchronized Auto-Scroll**: Driven strictly by dialogue transitions. Automatically scrolls the viewport to position the active speech bubble into view. Supports manual user scrolling with a 4-second interaction cooldown before resuming.
- **Full Playback Controls**: Play, Pause, Resume, Stop, Next (skip + speak), Previous (replay or step back), Repeat, and direct click-to-speak on any sentence.
- **Voice & Speed Preferences**: Choose any system voice and adjust narration speed from `0.7x` to `1.5x`. Settings persist across sessions in `chrome.storage.local`.
- **Tall Webtoon Strip Slicing**: Slices ultra-tall webtoon images (10,000+ px) into overlapping 1800px tiles, re-maps coordinates, and deduplicates text in overlap zones.
- **Shadow DOM Floating Controller**: Isolated namespaced styles that will never conflict with or bleed into page styles. Easily minimizable or hideable without interrupting ongoing narration.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER EXTENSION                               │
├───────────────────┬───────────────────────────┬──────────────────────────────┤
│ Popup UI          │ Service Worker            │ Offscreen Document           │
│ (React + TS)      │ (Thin router)             │ (Tesseract.js WASM)          │
│ • Activation      │ • Script injection        │ • Worker & SIMD WASM core    │
│ • Tab validation  │ • Offscreen lifecycle     │ • Slices tall webtoons       │
│ • Focus/Unhide    │ • Concurrency router      │ • Sequential OCR (concur = 1)│
└─────────┬─────────┴─────────────┬─────────────┴──────────────┬───────────────┘
          │ (POPUP_ACTIVATE)      │ (chrome.runtime messaging) │ (OCR_RESULT)
          ▼                       ▼                            ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                       ACTIVE TAB CONTENT SCRIPT                              │
│                                                                              │
│  ┌───────────────────────┐      ┌─────────────────────────────────────────┐  │
│  │ Image Discovery       │ ───► │ Reading Queue                           │  │
│  │ • Render size check   │      │ • Concurrency = 1                       │  │
│  │ • MutationObserver    │      │ • Incremental segment streaming         │  │
│  │ • IntersectionObserver│      └────────────────────┬────────────────────┘  │
│  └───────────────────────┘                           ▼                       │
│                                 ┌─────────────────────────────────────────┐  │
│  ┌───────────────────────┐      │ Segmentation & Reading Order            │  │
│  │ Auto-Scroller         │ ◄─── │ • Top-to-bottom, Left-to-right sort     │  │
│  │ • Bounding box map    │      │ • Hyphen & noise cleanup                │  │
│  │ • Manual cooldown     │      └────────────────────┬────────────────────┘  │
│  └───────────────────────┘                           ▼                       │
│                                 ┌─────────────────────────────────────────┐  │
│  ┌───────────────────────┐      │ Web Speech Synthesizer                  │  │
│  │ Floating Controller   │ ◄─── │ • Session token stale rejection         │  │
│  │ (Shadow DOM Host)     │      │ • Play / Pause / Resume / Stop / Next   │  │
│  └───────────────────────┘      └─────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Browser**: Google Chrome 116+ or Microsoft Edge 116+ (requires `chrome.offscreen` API)

---

## Commands & Scripts

All commands are executed from the project root:

| Command | Description |
|---|---|
| `npm run build` | Compiles strict TypeScript and produces the production extension bundles in `dist/`. |
| `npm run typecheck` | Runs the TypeScript compiler (`tsc --noEmit`) to verify zero type errors. |
| `npm test` | Runs the complete unit test suite with Vitest in JSDOM environment. |
| `npm run test:watch` | Runs Vitest in interactive watch mode for active development. |
| `npm run serve:test` | Starts the built-in HTTP server on `http://localhost:3000/` serving the test comic fixture. |

---

## Loading Unpacked Extension

### Google Chrome
1. Run `npm run build` to compile the extension.
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions/
   ```
3. Enable **Developer mode** using the toggle switch in the upper-right corner.
4. Click **Load unpacked** in the top-left toolbar.
5. In the file picker, select the `dist/` directory:
   ```text
   c:\Users\User\Documents\Manhwa voice text\dist
   ```
6. The extension **Manhwa Voice** will appear in your extensions list.

### Microsoft Edge
1. Run `npm run build` to compile the extension.
2. Open Microsoft Edge and navigate to:
   ```text
   edge://extensions/
   ```
3. Enable **Developer mode** using the toggle switch in the left sidebar.
4. Click **Load unpacked**.
5. Select the `dist/` directory.

---

## Testing with the Test Fixture

1. In your terminal, start the local fixture server:
   ```bash
   npm run serve:test
   ```
2. Open `http://localhost:3000/` in Chrome or Edge.
3. Click the **Manhwa Voice** icon in your browser toolbar, and click **"Activate on this page"**.
4. The floating controller appears in the bottom-right corner.
5. Once scanning completes, click **▶ Play**. Speech starts, bubbles are highlighted, and the page smoothly scrolls as narration progresses.

---

## Privacy & Security

- **Zero Network Transmission**: All optical character recognition is performed on your device via WebAssembly binaries (`tesseract-core-simd.wasm`) and locally bundled language models (`eng.traineddata.gz`). No images or text ever leave your computer.
- **Content Security Policy**: The extension manifest enforces a strict CSP allowing only self-hosted scripts and `'wasm-unsafe-eval'` for local WebAssembly compilation. No external scripts or CDNs are allowed or contacted.
- **Voice Synthesis**: Voices are rendered locally using your operating system's installed text-to-speech voices via the browser's standard Web Speech API (`window.speechSynthesis`). Available voices and accents depend on the voices installed on your Windows/OS system.

---

## Troubleshooting

- **"Cannot activate on this page"**: Chrome extensions are blocked by browser security from running on internal pages (`chrome://`, `edge://`, `about:`, Chrome Web Store). Open any regular website or the local test page (`http://localhost:3000/`).
- **No speech audio heard**: Ensure your system audio is unmuted and at least one text-to-speech voice is installed in your Windows Settings (*Settings → Time & Language → Speech*).
- **Images marked inaccessible**: Some websites apply strict CORS headers preventing direct script access. If prompted, grant the optional host permission for that domain.
- **Floating controller disappeared**: Click the extension icon in your toolbar and click **"Focus Controller"** to restore it to the foreground.

---

## Known Limitations

- **Language Support**: This version is bundled specifically for English dialogue.
- **Stylized Sound Effects**: Heavily stylized, sound-effect graphics (SFX / onomatopoeia) integrated into background art may score lower confidence or be omitted by the sentence segmenter.
- **Reading Order Heuristic**: Dialogue is sorted vertically top-to-bottom, and horizontally left-to-right for panels at similar heights. While this reflects standard Western and manhwa layout conventions, complex overlapping bubble layouts may occasionally read out of intended sequence.
- **Speech Synthesis Voices**: Voice quality and accent naturalness depend on the text-to-speech voices available on your operating system and browser.
